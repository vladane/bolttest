import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useShop } from '../../contexts/ShopContext';
import { useBalance, ItemData } from '../../contexts/BalanceContext';
import { useAppState } from '../../contexts/AppStateContext';
import { useToast } from '../common/Toast';
import { getImageUrl as getImageUrlFromUtils } from '../../utils/imageUtils';

// Глобальное хранилище для отслеживания инициализированных магазинов между монтированиями
// Это должно быть ВНЕ компонента, чтобы сохранить состояние даже при двойном монтировании
const initializedShopIds = new Set<string>();

interface ShopItemEditorProps {
  shopId: string;
  onClose: () => void;
}

// Оборачиваем компонент в React.memo для предотвращения ненужных перерисовок
const ShopItemEditor: React.FC<ShopItemEditorProps> = React.memo(({ shopId, onClose }) => {
  const { shops, addItemToShop, getDefaultCurrency, removeItemFromShop } = useShop();
  const { comparisonItems, calculateItemCost } = useBalance();
  // Получаем состояние баланса для использования в расчетах цен
  const balanceContext = useBalance();
  const { addToast } = useToast();
  const { state } = useAppState();
  
  // Проверяем, был ли этот shopId уже инициализирован ранее
  const shopInitializedRef = useRef(initializedShopIds.has(shopId));
  
  // Кэш изображений в useRef для предотвращения ререндеров
  const imageCache = useRef(new Map<string, string | null>());
  
  // Отслеживание состояния загрузки без перерисовок UI
  const loadingRef = useRef(!shopInitializedRef.current);
  
  // Для отслеживания таймаута при размонтировании
  const unmountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  // Единственное состояние для контроля рендеринга UI
  const [isReady, setIsReady] = useState(shopInitializedRef.current);
  
  // Состояния
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedItemsIds, setSelectedItemsIds] = useState<string[]>([]);
  
  // Пагинация для списка предметов и товаров в магазине
  const ITEMS_PER_PAGE = 6;
  const SHOP_ITEMS_PER_PAGE = 8;
  const [currentPage, setCurrentPage] = useState(1);
  const [shopItemsPage, setShopItemsPage] = useState(1);
  
  // Сортировка для товаров в магазине
  const [sortField, setSortField] = useState<string>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Справочные данные
  const shop = useMemo(() => 
    shops?.find(s => s.shopId === shopId), 
    [shops, shopId]
  );
  
  const defaultCurrency = useMemo(() => 
    getDefaultCurrency(), 
    [getDefaultCurrency]
  );
  
  // Состояние для нового товара
  const [newItem, setNewItem] = useState({
    shopItemId: '',
    minAppearanceCount: 1,
    maxAppearanceCount: 1,
    appearanceChance: 1.0,
    overrideCost: false,
    overrideCurrencyId: defaultCurrency?.id || '',
    buyCost: {
      costType: 0,
      from: 100,
      to: 100
    },
    sellCost: {
      costType: 0,
      from: 70,
      to: 70
    },
    id: '',
    count: 1
  });
  
  // Функция для получения URL изображения с кешированием
  const getImageUrl = useCallback((imageId: string | null | undefined): string | null => {
    if (!imageId) return null;
    
    if (imageCache.current.has(imageId)) {
      return imageCache.current.get(imageId) || null;
    }
    
    try {
      const url = getImageUrlFromUtils(imageId, state);
      imageCache.current.set(imageId, url);
      return url;
    } catch (error) {
      console.error("Error getting image URL:", error);
      imageCache.current.set(imageId, null);
      return null;
    }
  }, [state]);
  
  // Получаем все категории предметов для фильтрации с меньшим количеством зависимостей
  const allCategories = useMemo(() => {
    const categories = new Set<string>();
    
    // Добавляем категории из предметов баланса
    comparisonItems.forEach(item => {
      item.selectedCategories?.forEach(cat => categories.add(cat));
    });
    
    // Добавляем категории из ресурсов
    if (state.resources?.items) {
      state.resources.items.forEach((item: any) => {
        if (item.category) categories.add(item.category);
      });
    }
    
    return ['', ...Array.from(categories)].sort();
  }, [comparisonItems, state.resources?.items]);
  
  // Собираем все доступные предметы для расчета цен с более стабильными зависимостями
  const allItems = useMemo(() => {
    const items = [];
    
    // Добавляем предметы из баланса
    if (comparisonItems) {
      items.push(...comparisonItems.map(item => ({
        ...item,
        source: 'balance',
        category: item.selectedCategories?.join(', ') || 'Без категории'
      })));
    }
    
    // Добавляем предметы из ресурсов с добавлением всех необходимых полей для ItemData
    if (state.resources?.items) {
      items.push(...state.resources.items.map((item: any) => ({
        name: item.name || item.id,
        imageId: item.imageId,
        source: 'resource',
        tier: 1,
        mechanic: 'Найти в мире',
        selectedCategories: item.category ? [item.category] : [],
        selectedModifiers: [],
        selectedLocations: [],
        frequencyType: 'Часто встречаемый',
        craftComplexity: 'Не крафтиться',
        category: item.category || 'Ресурс'
      })));
    }
    
    return items;
  }, [comparisonItems, state.resources?.items]);
  
  // Функция для проверки, является ли объект элементом ItemData
  const isItemData = useCallback((item: any): item is ItemData => {
    return (
      item.name !== undefined &&
      item.tier !== undefined &&
      item.mechanic !== undefined &&
      Array.isArray(item.selectedCategories) &&
      Array.isArray(item.selectedModifiers) &&
      Array.isArray(item.selectedLocations) &&
      item.frequencyType !== undefined &&
      item.craftComplexity !== undefined
    );
  }, []);
  
  // Фильтрация предметов с меньшим количеством ререндеров
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // Поиск по имени
      const matchesSearch = searchTerm 
        ? (item.name?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        : true;
      
      // Фильтр по категории
      const matchesCategory = filterCategory
        ? (item.selectedCategories || []).includes(filterCategory)
        : true;
      
      return matchesSearch && matchesCategory;
    });
  }, [allItems, searchTerm, filterCategory]);
  
  // Пагинация отфильтрованных предметов
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);
  
  // Количество страниц для пагинации
  const totalPages = useMemo(() => {
    return Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  }, [filteredItems.length]);
  
  // Отсортированные товары в магазине - стабилизируем зависимость от shop
  const sortedShopItems = useMemo(() => {
    if (!shop) return [];
    
    return [...shop.shopItems].sort((a, b) => {
      let compareResult = 0;
      
      switch (sortField) {
        case 'name':
          compareResult = a.id.localeCompare(b.id);
          break;
        case 'count':
          compareResult = a.count - b.count;
          break;
        case 'buyPrice':
          compareResult = a.buyCost.from - b.buyCost.from;
          break;
        case 'sellPrice':
          compareResult = a.sellCost.from - b.sellCost.from;
          break;
        case 'chance':
          compareResult = a.appearanceChance - b.appearanceChance;
          break;
        default:
          compareResult = 0;
      }
      
      return sortDirection === 'asc' ? compareResult : -compareResult;
    });
  }, [shop, sortField, sortDirection]);
  
  // Пагинация товаров в магазине
  const paginatedShopItems = useMemo(() => {
    const startIndex = (shopItemsPage - 1) * SHOP_ITEMS_PER_PAGE;
    return sortedShopItems.slice(startIndex, startIndex + SHOP_ITEMS_PER_PAGE);
  }, [sortedShopItems, shopItemsPage]);
  
  // Количество страниц для товаров в магазине
  const totalShopPages = useMemo(() => {
    return Math.ceil(sortedShopItems.length / SHOP_ITEMS_PER_PAGE) || 1;
  }, [sortedShopItems.length]);
  
  // Функция для перехода к конкретной странице - стабилизируем
  const goToPage = useCallback((page: number) => {
    setCurrentPage(prev => {
      // Сохраняем текущую страницу если она не изменилась
      if (prev === page) return prev;
      return Math.min(Math.max(1, page), totalPages);
    });
  }, [totalPages]);
  
  // Функция для перехода к странице товаров - стабилизируем
  const goToShopPage = useCallback((page: number) => {
    setShopItemsPage(prev => {
      // Сохраняем текущую страницу если она не изменилась
      if (prev === page) return prev;
      return Math.min(Math.max(1, page), totalShopPages);
    });
  }, [totalShopPages]);
  
  // Проверка, есть ли предмет уже в магазине - используем useRef для shopItemsRef
  const shopItemsRef = useRef<Set<string>>(new Set());
  
  // Обновляем shopItemsRef при изменении магазина
  useEffect(() => {
    if (shop) {
      shopItemsRef.current = new Set(shop.shopItems.map(item => item.id));
    } else {
      shopItemsRef.current.clear();
    }
  }, [shop]);
  
  const isItemInShop = useCallback((itemId: string) => {
    return shopItemsRef.current.has(itemId);
  }, []);
  
  // Выбор предмета для добавления с правильным использованием цен из баланса
  const handleSelectItem = useCallback((itemId: string) => {
    const item = allItems.find(item => item.name === itemId);
    if (!item) return;
    
    // Расчет цен предмета используя актуальную информацию из баланса
    let basePrice = 10; // Базовая цена по умолчанию
    let buyPrice = 15;  // Цена покупки по умолчанию (что платит игрок)
    let sellPrice = 7;  // Цена продажи по умолчанию (что получает игрок)
    
    if (item.source === 'balance' && isItemData(item)) {
      // Получаем базовую цену с помощью calculateItemCost
      basePrice = calculateItemCost(item);
      
      // Получаем скидку и наценку из конфигурации баланса
      const sellDiscount = balanceContext.currentConfig?.sellDiscount || 0.35;
      const buyMarkup = balanceContext.currentConfig?.buyMarkup || 0.25;
      
      // Рассчитываем цены покупки и продажи
      sellPrice = Math.round(basePrice * (1 - sellDiscount)); // Цена, по которой игрок может продать предмет
      buyPrice = Math.round(basePrice * (1 + buyMarkup));     // Цена, по которой игрок может купить предмет
      
      console.log(`Item: ${itemId}, Base Price: ${basePrice}, Buy: ${buyPrice}, Sell: ${sellPrice}`);
    }
    
    // Заполнение формы
    setNewItem(prev => ({
      ...prev,
      shopItemId: itemId,
      id: itemId,
      buyCost: {
        costType: 0,
        from: buyPrice, // Цена покупки (сколько платит игрок)
        to: buyPrice
      },
      sellCost: {
        costType: 0,
        from: sellPrice, // Цена продажи (сколько получает игрок)
        to: sellPrice
      },
    }));
  }, [allItems, calculateItemCost, isItemData, balanceContext]);
  
  // Добавление товара в магазин
  const handleAddItem = useCallback(() => {
    if (!newItem.id) {
      addToast('Выберите предмет', 'error');
      return;
    }
    
    if (isItemInShop(newItem.id)) {
      addToast('Этот предмет уже добавлен в магазин', 'warning');
      return;
    }
    
    addItemToShop(shopId, {
      ...newItem,
      shopItemId: newItem.id
    });
    
    addToast('Товар успешно добавлен в магазин', 'success');
    
    // Сбрасываем выбор
    setNewItem(prev => ({
      ...prev,
      id: '',
      shopItemId: ''
    }));
  }, [newItem, isItemInShop, addItemToShop, shopId, addToast]);
  
  // Удаление товара из магазина
  const handleDeleteItem = useCallback((itemId: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
      removeItemFromShop(shopId, itemId);
      addToast('Товар удален из магазина', 'success');
    }
  }, [removeItemFromShop, shopId, addToast]);
  
  // Управление сортировкой с мемоизацией
  const handleSort = useCallback((field: string) => {
    setSortField(prevField => {
      // Если клик по текущему полю, меняем направление
      if (prevField === field) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        return prevField;
      } else {
        // Если клик по новому полю, устанавливаем его и сбрасываем направление
        setSortDirection('asc');
        return field;
      }
    });
  }, []);
  
  // Эффект для очистки таймаута размонтирования
  useEffect(() => {
    return () => {
      if (unmountTimerRef.current) {
        clearTimeout(unmountTimerRef.current);
        unmountTimerRef.current = null;
      }
    };
  }, []);
  
  // Надежная инициализация компонента с защитой от StrictMode повторений
  useEffect(() => {
    // Очистка initializedShopIds при монтировании, чтобы предотвратить проблему вечной загрузки
    if (!shopInitializedRef.current) {
      // Очищаем все идентификаторы, чтобы гарантировать свежее состояние при каждом открытии
      initializedShopIds.clear();
      initializedShopIds.add(shopId);
      shopInitializedRef.current = true;
    }
    
    // Логируем только один раз при первом реальном монтировании
    if (import.meta.env.DEV) {
      console.log("ShopItemEditor mounted for shop:", shopId);
      console.log("Shop exists:", shops?.some(s => s.shopId === shopId));
    }
    
    // Небольшая задержка для плавной загрузки
    const timer = setTimeout(() => {
      loadingRef.current = false;
      setIsReady(true);
    }, 250);
    
    return () => {
      clearTimeout(timer);
    };
  }, [shopId, shops]);
  
  // Упрощенный эффект для отслеживания настоящего размонтирования
  useEffect(() => {
    // Функция очистки при размонтировании
    return () => {
      // Удаляем shopId из набора initializedShopIds при размонтировании
      initializedShopIds.delete(shopId);
      
      // Используем setTimeout для задержки, чтобы отличить размонтирование от StrictMode
      unmountTimerRef.current = setTimeout(() => {
        const shopEditorElement = document.getElementById(`shop-editor-${shopId}`);
        if (!shopEditorElement || !document.body.contains(shopEditorElement)) {
          initializedShopIds.delete(shopId);
        }
      }, 200);
    };
  }, [shopId]);
  
  // Если загрузка не завершена, показываем спиннер
  if (!isReady) {
    return (
      <div id={`shop-editor-${shopId}`} className="p-6 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-300 text-lg">Загрузка данных магазина...</p>
        <button 
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Отменить
        </button>
      </div>
    );
  }
  
  // Если магазин не найден
  if (!shop) {
    return (
      <div id={`shop-editor-${shopId}`} className="p-6 text-center">
        <div className="mb-4 text-red-500 text-xl font-medium">
          Магазин с ID {shopId} не найден
        </div>
        <p className="mb-4">
          Доступные магазины:
        </p>
        <ul className="mb-4 list-disc list-inside text-left bg-gray-100 dark:bg-gray-700 p-4 rounded-md">
          {shops?.map(s => (
            <li key={s.shopId} className="mb-1">
              <span className="font-medium">{s.name}</span> (ID: {s.shopId})
            </li>
          ))}
        </ul>
        <button 
          onClick={onClose}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Закрыть
        </button>
      </div>
    );
  }
  
  // Рендеринг основного интерфейса - без лишних перерисовок
  return (
    <div id={`shop-editor-${shopId}`} className="p-4 text-gray-800 dark:text-gray-200 max-w-[1200px] w-full mx-auto">
      <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-md mb-4 text-center">
        <h3 className="text-green-800 dark:text-green-300 font-medium text-lg mb-1">
          Магазин успешно загружен!
        </h3>
        <p className="text-green-700 dark:text-green-400">
          Магазин: {shop.name} (ID: {shop.shopId})
        </p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Панель добавления товаров - слева */}
        <div className="bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="bg-gray-700 px-4 py-3">
            <h3 className="text-lg font-medium text-white">
              Добавление товара
            </h3>
          </div>
          
          <div className="p-4">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-300">
                Поиск предметов
              </label>
              <input
                type="text"
                placeholder="Введите название..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1); // Сбрасываем на первую страницу при поиске
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white placeholder-gray-400"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1 text-gray-300">
                Категория
              </label>
              <select
                value={filterCategory}
                onChange={(e) => {
                  setFilterCategory(e.target.value);
                  setCurrentPage(1); // Сбрасываем на первую страницу при смене категории
                }}
                className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
              >
                <option value="">Все категории</option>
                {allCategories.slice(1).map(category => (
                  <option key={category} value={category}>{category}</option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1">
                <label className="text-sm font-medium text-gray-300">
                  Доступные предметы ({filteredItems.length})
                </label>
                <span className="text-xs text-gray-400">
                  Страница {currentPage} из {totalPages || 1}
                </span>
              </div>
              
              {/* Список предметов без скролла - только 6 предметов на странице */}
              <div className="border border-gray-600 rounded-md bg-gray-700">
                {filteredItems.length === 0 ? (
                  <p className="text-center py-4 text-gray-400">Ничего не найдено</p>
                ) : (
                  <>
                    {/* Список фиксированных 6 предметов без скролла */}
                    <div className="divide-y divide-gray-600">
                      {paginatedItems.map(item => {
                        const alreadyInShop = isItemInShop(item.name);
                        const imageUrl = item.imageId ? getImageUrl(item.imageId) : null;
                        
                        return (
                          <div 
                            key={item.name}
                            className={`p-2 cursor-pointer ${
                              newItem.id === item.name
                                ? 'bg-blue-900/30'
                                : alreadyInShop
                                  ? 'bg-gray-600 opacity-50'
                                  : 'hover:bg-gray-600/50'
                            }`}
                            onClick={() => !alreadyInShop && handleSelectItem(item.name)}
                          >
                            <div className="flex items-center">
                              {imageUrl ? (
                                <div className="flex-shrink-0 h-8 w-8 mr-2 bg-gray-700 rounded overflow-hidden">
                                  <img src={imageUrl} alt={item.name} className="h-full w-full object-cover" />
                                </div>
                              ) : (
                                <div className="flex-shrink-0 h-8 w-8 mr-2 bg-gray-600 rounded flex items-center justify-center text-xs text-gray-400">
                                  Нет
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="font-medium text-white truncate">{item.name}</div>
                                <div className="text-xs text-gray-400 truncate">
                                  {item.category || item.selectedCategories?.join(', ') || 'Без категории'}
                                </div>
                              </div>
                              {alreadyInShop && (
                                <span className="text-xs px-2 py-1 bg-gray-500 text-gray-300 rounded ml-2 whitespace-nowrap">
                                  В магазине
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      
                      {/* Если меньше 6 предметов на странице, добавляем пустые слоты */}
                      {paginatedItems.length < ITEMS_PER_PAGE && Array.from({ length: ITEMS_PER_PAGE - paginatedItems.length }).map((_, index) => (
                        <div 
                          key={`empty-${index}`}
                          className="p-2 bg-gray-700 opacity-50"
                          style={{ height: '52px' }} // Фиксированная высота как у элемента списка
                        >
                          <div className="flex items-center h-full">
                            <div className="text-gray-600 dark:text-gray-500 text-center w-full">
                              {/* Пустой слот */}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Панель пагинации */}
                    <div className="bg-gray-800 p-2 border-t border-gray-600 flex justify-between items-center">
                      <button 
                        onClick={() => goToPage(currentPage - 1)}
                        disabled={currentPage <= 1}
                        className={`px-2 py-1 rounded ${
                          currentPage <= 1 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        &larr; Назад
                      </button>
                      
                      <div className="text-sm text-gray-400 flex items-center">
                        {/* Кнопки страниц */}
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          // Логика для отображения правильных номеров страниц
                          let pageNum;
                          if (totalPages <= 5) {
                            // Если всего 5 или меньше страниц, показываем все
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            // В начале списка
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            // В конце списка
                            pageNum = totalPages - 4 + i;
                          } else {
                            // В середине списка
                            pageNum = currentPage - 2 + i;
                          }
                          
                          // Проверка на валидность страницы
                          if (pageNum < 1 || pageNum > totalPages) return null;
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => goToPage(pageNum)}
                              className={`mx-1 w-7 h-7 rounded ${
                                currentPage === pageNum
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => goToPage(currentPage + 1)}
                        disabled={currentPage >= totalPages}
                        className={`px-2 py-1 rounded ${
                          currentPage >= totalPages 
                            ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-700 text-white hover:bg-gray-600'
                        }`}
                      >
                        Вперед &rarr;
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {newItem.id && (
              <>
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Количество
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.count}
                    onChange={(e) => setNewItem(prev => ({...prev, count: parseInt(e.target.value) || 1}))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-gray-300">
                    Шанс появления
                  </label>
                  <div className="flex items-center">
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={newItem.appearanceChance * 100}
                      onChange={(e) => setNewItem(prev => ({
                        ...prev, 
                        appearanceChance: parseInt(e.target.value) / 100
                      }))}
                      className="flex-1 mr-3"
                    />
                    <div className="w-16 text-center text-white font-bold">
                      {Math.round(newItem.appearanceChance * 100)}%
                    </div>
                  </div>
                </div>
                
                {/* Поля для управления стоимостью покупки и продажи */}
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-green-400">
                    Цена покупки (сколько платит игрок)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.buyCost.from}
                    onChange={(e) => setNewItem(prev => ({
                      ...prev, 
                      buyCost: {
                        ...prev.buyCost,
                        from: parseInt(e.target.value) || 0,
                        to: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                  />
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium mb-1 text-red-400">
                    Цена продажи (сколько получает игрок)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newItem.sellCost.from}
                    onChange={(e) => setNewItem(prev => ({
                      ...prev, 
                      sellCost: {
                        ...prev.sellCost,
                        from: parseInt(e.target.value) || 0,
                        to: parseInt(e.target.value) || 0
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
                  />
                </div>
                
                {/* Информация о ценах предмета в системе баланса */}
                {(() => {
                  const item = allItems.find(item => item.name === newItem.id);
                  if (item && item.source === 'balance' && isItemData(item)) {
                    const basePrice = calculateItemCost(item);
                    // Получаем скидку и наценку из конфигурации баланса
                    const sellDiscount = balanceContext.currentConfig?.sellDiscount || 0.35;
                    const buyMarkup = balanceContext.currentConfig?.buyMarkup || 0.25;
                    
                    // Рассчитываем цены покупки и продажи
                    const sellPrice = Math.round(basePrice * (1 - sellDiscount));
                    const buyPrice = Math.round(basePrice * (1 + buyMarkup));
                    
                    return (
                      <div className="mt-4 p-3 bg-gray-700 rounded-md text-sm">
                        <h4 className="text-gray-300 font-medium mb-2">Цены в системе баланса:</h4>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">Базовая стоимость:</span>
                          <span className="text-white font-medium">{basePrice}</span>
                        </div>
                        <div className="flex justify-between mb-1">
                          <span className="text-gray-400">Цена покупки:</span>
                          <span className="text-green-400 font-medium">{buyPrice}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Цена продажи:</span>
                          <span className="text-red-400 font-medium">{sellPrice}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
              </>
            )}
            
            <div className="mt-4">
              <button
                onClick={handleAddItem}
                disabled={!newItem.id}
                className={`w-full px-4 py-2 rounded ${
                  newItem.id 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}
              >
                Добавить в магазин
              </button>
            </div>
          </div>
        </div>
        
        {/* Список товаров в магазине - справа */}
        <div className="bg-gray-800 rounded-lg shadow-md flex flex-col">
          <div className="bg-gray-700 px-4 py-3 flex justify-between items-center">
            <h3 className="text-lg font-medium text-white">
              Товары в магазине ({shop.shopItems.length})
            </h3>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setSelectedItemsIds(shop.shopItems.map(item => item.id))}
                className="px-2 py-1 text-xs bg-blue-900/40 text-blue-300 rounded hover:bg-blue-900/60"
              >
                Выбрать все
              </button>
              <button
                onClick={() => setSelectedItemsIds([])}
                className="px-2 py-1 text-xs bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                disabled={selectedItemsIds.length === 0}
              >
                Отменить выбор
              </button>
            </div>
          </div>
          
          {shop.shopItems.length === 0 ? (
            <div className="p-8 text-center text-gray-400 border border-dashed border-gray-600 rounded-lg m-4 flex-grow">
              <p className="mb-2">В магазине пока нет товаров</p>
              <p className="text-sm">Выберите товар из списка слева и добавьте его в магазин</p>
            </div>
          ) : (
            <div className="p-1">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-700">
                  <tr>
                    <th className="w-6 p-2 text-left">
                      <span className="sr-only">Выбор</span>
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-650"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        Товар
                        {sortField === 'name' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-650" 
                      style={{width: '60px'}}
                      onClick={() => handleSort('count')}
                    >
                      <div className="flex items-center">
                        Кол
                        {sortField === 'count' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-green-400 uppercase tracking-wider cursor-pointer hover:bg-gray-650" 
                      style={{width: '75px'}}
                      onClick={() => handleSort('buyPrice')}
                    >
                      <div className="flex items-center">
                        Покупка
                        {sortField === 'buyPrice' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-red-400 uppercase tracking-wider cursor-pointer hover:bg-gray-650" 
                      style={{width: '75px'}}
                      onClick={() => handleSort('sellPrice')}
                    >
                      <div className="flex items-center">
                        Продажа
                        {sortField === 'sellPrice' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th 
                      className="p-2 text-left text-xs font-medium text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-650" 
                      style={{width: '75px'}}
                      onClick={() => handleSort('chance')}
                    >
                      <div className="flex items-center">
                        Шанс
                        {sortField === 'chance' && (
                          <span className="ml-1">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </div>
                    </th>
                    <th className="p-2 text-right text-xs font-medium text-gray-300 uppercase tracking-wider" style={{width: '70px'}}>
                      Опции
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-gray-800 divide-y divide-gray-700">
                  {/* Показываем товары с текущей страницы */}
                  {paginatedShopItems.map((item, index) => {
                    // Находим предмет для отображения изображения
                    const itemData = allItems.find(i => i.name === item.id);
                    const imageUrl = itemData?.imageId ? getImageUrl(itemData.imageId) : null;
                    
                    return (
                      <tr 
                        key={`${item.id}-${index}`}
                        className={`${selectedItemsIds.includes(item.id) ? 'bg-blue-900/20' : 'hover:bg-gray-750'}`}
                      >
                        <td className="px-2 py-1 whitespace-nowrap align-middle">
                          <input
                            type="checkbox"
                            checked={selectedItemsIds.includes(item.id)}
                            onChange={() => {
                              setSelectedItemsIds(prev => 
                                prev.includes(item.id)
                                  ? prev.filter(id => id !== item.id)
                                  : [...prev, item.id]
                              );
                            }}
                            className="h-4 w-4 text-blue-600 bg-gray-700 rounded border-gray-600"
                          />
                        </td>
                        <td className="py-1 px-2">
                          <div className="flex items-center">
                            {imageUrl ? (
                              <div className="flex-shrink-0 h-6 w-6 mr-2 bg-gray-700 rounded overflow-hidden">
                                <img src={imageUrl} alt={item.id} className="h-full w-full object-cover" />
                              </div>
                            ) : (
                              <div className="flex-shrink-0 h-6 w-6 mr-2 bg-gray-700 rounded flex items-center justify-center text-xs text-gray-400">
                                -
                              </div>
                            )}
                            <div className="text-sm font-medium text-gray-200 truncate max-w-[150px]">
                              {item.id}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-gray-300">
                          {item.count} шт.
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-green-400 font-medium">
                          {item.buyCost.from}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-sm text-red-400 font-medium">
                          {item.sellCost.from}
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap">
                          <div className="text-sm text-gray-300">
                            {(item.appearanceChance * 100).toFixed(0)}%
                          </div>
                        </td>
                        <td className="px-2 py-1 whitespace-nowrap text-right">
                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            Удалить
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  
                  {/* Если на странице меньше 8 товаров, добавляем пустые строки для стабильной высоты */}
                  {paginatedShopItems.length < SHOP_ITEMS_PER_PAGE && Array.from({ length: SHOP_ITEMS_PER_PAGE - paginatedShopItems.length }).map((_, index) => (
                    <tr key={`empty-row-${index}`} className="bg-gray-800 h-[42px]">
                      <td colSpan={7}></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Пагинация для товаров в магазине */}
              <div className="flex justify-between items-center mt-2 p-2 text-sm">
                <div className="text-gray-400">
                  Показаны {sortedShopItems.length > 0 ? (shopItemsPage - 1) * SHOP_ITEMS_PER_PAGE + 1 : 0}-{Math.min(shopItemsPage * SHOP_ITEMS_PER_PAGE, sortedShopItems.length)} из {sortedShopItems.length}
                </div>
                
                {totalShopPages > 1 && (
                  <div className="flex space-x-1">
                    <button 
                      onClick={() => goToShopPage(shopItemsPage - 1)}
                      disabled={shopItemsPage <= 1}
                      className={`px-2 py-1 rounded text-xs ${
                        shopItemsPage <= 1 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      &larr;
                    </button>
                    
                    {Array.from({ length: Math.min(5, totalShopPages) }, (_, i) => {
                      let pageNum;
                      if (totalShopPages <= 5) {
                        pageNum = i + 1;
                      } else if (shopItemsPage <= 3) {
                        pageNum = i + 1;
                      } else if (shopItemsPage >= totalShopPages - 2) {
                        pageNum = totalShopPages - 4 + i;
                      } else {
                        pageNum = shopItemsPage - 2 + i;
                      }
                      
                      if (pageNum < 1 || pageNum > totalShopPages) return null;
                      
                      return (
                        <button
                          key={pageNum}
                          onClick={() => goToShopPage(pageNum)}
                          className={`w-6 h-6 rounded text-xs ${
                            shopItemsPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                    
                    <button
                      onClick={() => goToShopPage(shopItemsPage + 1)}
                      disabled={shopItemsPage >= totalShopPages}
                      className={`px-2 py-1 rounded text-xs ${
                        shopItemsPage >= totalShopPages 
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed' 
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      &rarr;
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex justify-end mt-4">
        <button 
          onClick={onClose}
          className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-lg"
        >
          Закрыть
        </button>
      </div>
    </div>
  );
});

export default ShopItemEditor;