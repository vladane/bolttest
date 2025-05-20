// src/components/balance-crafting/items/ItemList.tsx
import React, { useState, useMemo } from 'react';
import { useBalance, ItemData } from '../../../contexts/BalanceContext';
import { useAppState } from '../../../contexts/AppStateContext';
import { getImageUrl as getImageUrlFromUtils } from '../../../utils/imageUtils';

interface ItemListProps {
  onCreateItem?: () => void;
  onEditItem?: (item: ItemData) => void;
  onDeleteItem?: (item: ItemData) => void;
  onDuplicateItem?: (item: ItemData) => void;
}

const ItemList: React.FC<ItemListProps> = ({ 
  onCreateItem, 
  onEditItem, 
  onDeleteItem,
  onDuplicateItem
}) => {
  const balance = useBalance();
  const { state, updateState } = useAppState();
  const { comparisonItems, calculateItemCost } = balance;
  
  // Состояние для фильтрации и сортировки
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterMechanic, setFilterMechanic] = useState('all');
  const [filterType, setFilterType] = useState('all'); // Новый: фильтр по типу (обычный/урожай)
  const [filterSubType, setFilterSubType] = useState('all'); // Новый: фильтр по подтипу
  const [filterSeason, setFilterSeason] = useState('all'); // Новый: фильтр по сезону (для урожая)
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [groupBy, setGroupBy] = useState('none'); // Новый: группировка предметов
  
  // Получаем все уникальные категории, механики, подтипы и т.д.
  const { categories, mechanics, subTypes, seasons } = useMemo(() => {
    const categories = new Set<string>();
    const mechanics = new Set<string>();
    const subTypes = new Set<string>();
    const seasons = new Set<string>();
    
    comparisonItems.forEach(item => {
      item.selectedCategories.forEach(cat => categories.add(cat));
      mechanics.add(item.mechanic);
      
      // Добавляем подтип, если он указан
      if (item.subType) {
        subTypes.add(item.subType);
      }
      
      // Добавляем сезоны для урожая
      if (item.isHarvest && item.growingSeason) {
        item.growingSeason.forEach(season => seasons.add(season));
      }
    });
    
    return {
      categories: Array.from(categories).sort(),
      mechanics: Array.from(mechanics).sort(),
      subTypes: Array.from(subTypes).sort(),
      seasons: Array.from(seasons).sort()
    };
  }, [comparisonItems]);
  
  // Фильтрация и сортировка предметов
  const filteredItems = useMemo(() => {
    return comparisonItems
      .filter(item => {
        // Фильтрация по поиску
        if (searchTerm && !item.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          return false;
        }
        
        // Фильтрация по категории
        if (filterCategory !== 'all' && !item.selectedCategories.includes(filterCategory)) {
          return false;
        }
        
        // Фильтрация по механике
        if (filterMechanic !== 'all' && item.mechanic !== filterMechanic) {
          return false;
        }
        
        // Фильтрация по типу (урожай/обычный)
        if (filterType !== 'all') {
          if (filterType === 'harvest' && !item.isHarvest) return false;
          if (filterType === 'regular' && item.isHarvest) return false;
        }
        
        // Фильтрация по подтипу
        if (filterSubType !== 'all' && item.subType !== filterSubType) {
          return false;
        }
        
        // Фильтрация по сезону (для урожая)
        if (filterSeason !== 'all' && (!item.isHarvest || !item.growingSeason || !item.growingSeason.includes(filterSeason))) {
          return false;
        }
        
        return true;
      })
      .sort((a, b) => {
        // Сортировка по выбранному полю
        switch (sortField) {
          case 'name':
            return sortDirection === 'asc' 
              ? a.name.localeCompare(b.name) 
              : b.name.localeCompare(a.name);
          case 'tier':
            return sortDirection === 'asc' 
              ? a.tier - b.tier 
              : b.tier - a.tier;
          case 'cost':
            const costA = calculateItemCost(a);
            const costB = calculateItemCost(b);
            return sortDirection === 'asc' 
              ? costA - costB 
              : costB - costA;
          case 'profitability': // Новое: сортировка по доходности (для урожая)
            const profitA = calculateProfitability(a);
            const profitB = calculateProfitability(b);
            return sortDirection === 'asc' 
              ? profitA - profitB 
              : profitB - profitA;
          default:
            return 0;
        }
      });
  }, [comparisonItems, searchTerm, filterCategory, filterMechanic, filterType, filterSubType, filterSeason, sortField, sortDirection, calculateItemCost]);
  
  // Расчет доходности для предмета (особенно полезно для урожая)
  const calculateProfitability = (item: ItemData): number => {
    if (!item.isHarvest) return 0;
    
    const cost = calculateItemCost(item);
    const seedCost = item.seedCost || 0;
    const growingTime = item.growingTime || 1;
    
    // Прибыль = (Стоимость - Стоимость семян) / Время роста
    // Это позволяет сравнивать урожай по дневной прибыли
    return (cost - seedCost) / growingTime;
  };
  
  // Группировка предметов
  const groupedItems = useMemo(() => {
    if (groupBy === 'none') {
      return { 'Все предметы': filteredItems };
    }
    
    const groups: Record<string, ItemData[]> = {};
    
    filteredItems.forEach(item => {
      let groupKey = '';
      
      switch (groupBy) {
        case 'type':
          groupKey = item.isHarvest ? 'Урожай' : 'Обычные предметы';
          break;
        case 'tier':
          groupKey = `Tier ${item.tier}`;
          break;
        case 'category':
          if (item.selectedCategories.length > 0) {
            item.selectedCategories.forEach(cat => {
              if (!groups[cat]) groups[cat] = [];
              groups[cat].push(item);
            });
            return; // Skip adding to groups below
          } else {
            groupKey = 'Без категории';
          }
          break;
        case 'mechanic':
          groupKey = item.mechanic;
          break;
        case 'subType':
          groupKey = item.subType ? item.subType : 'Без подтипа';
          break;
        case 'season':
          if (item.isHarvest && item.growingSeason && item.growingSeason.length > 0) {
            item.growingSeason.forEach(season => {
              if (!groups[season]) groups[season] = [];
              groups[season].push(item);
            });
            return; // Skip adding to groups below
          } else {
            groupKey = 'Не сезонные';
          }
          break;
        default:
          groupKey = 'Другие';
      }
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      
      groups[groupKey].push(item);
    });
    
    return groups;
  }, [filteredItems, groupBy]);
  
  // Обработчик перехода к редактору предметов
  const handleCreateItem = () => {
    if (onCreateItem) {
      onCreateItem();
    } else {
      console.log("Create new item");
      // Фоллбэк - использовать механизм вкладок напрямую, если он существует
      if (window.switchTabDirectly) {
        window.switchTabDirectly('items', 'editor');
      }
    }
  };
  
  // Обработчик редактирования предмета
  const handleEditItem = (item: ItemData) => {
    if (onEditItem) {
      onEditItem(item);
    } else {
      console.log("Edit item:", item.name);
      // Фоллбэк - использовать механизм вкладок напрямую, если он существует
      if (window.switchTabDirectly) {
        window.switchTabDirectly('items', 'editor', item);
      }
    }
  };
  
  // Обработчик удаления предмета
  const handleDeleteItem = (item: ItemData) => {
    if (window.confirm(`Вы уверены, что хотите удалить "${item.name}"?`)) {
      if (onDeleteItem) {
        onDeleteItem(item);
      } else {
        // Реализуем удаление напрямую
        const updatedItems = comparisonItems.filter(i => i.name !== item.name);
        updateState('balance', {
          ...state.balance,
          comparisonItems: updatedItems
        });
      }
    }
  };
  
  // Обработчик дублирования предмета
  const handleDuplicateItem = (item: ItemData) => {
    if (onDuplicateItem) {
      onDuplicateItem(item);
    } else {
      // Создаем копию предмета с пустым названием
      const duplicatedItem: ItemData = {
        ...item,
        name: '', // Очищаем название для соблюдения требования
      };
      
      // Переключаемся на редактор с копией предмета
      if (window.switchTabDirectly) {
        window.switchTabDirectly('items', 'editor', duplicatedItem);
      } else {
        // Если глобальный метод недоступен, просто сохраняем копию
        const updatedItems = [...comparisonItems, duplicatedItem];
        updateState('balance', {
          ...state.balance,
          comparisonItems: updatedItems
        });
        console.log('Item duplicated:', duplicatedItem);
      }
    }
  };
  
  // Функция для получения URL изображения
  const getImageUrl = (imageId: string | null): string | null => {
    if (!imageId) return null;
    return getImageUrlFromUtils(imageId, state);
  };
  
  // Функция для отображения списка в виде строки с разделителями
  const formatListForDisplay = (arr: string[] | undefined): string => {
    if (!arr || arr.length === 0) return 'Не указано';
    return arr.join(', ');
  };
  
  // Функция для отображения метки доходности
  const renderProfitabilityBadge = (item: ItemData) => {
    if (!item.isHarvest) return null;
    
    const profit = calculateProfitability(item);
    
    let colorClass = 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    if (profit > 10) {
      colorClass = 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    } else if (profit < 0) {
      colorClass = 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    } else if (profit > 0) {
      colorClass = 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    }
    
    return (
      <div className={`mt-1 px-2 py-1 rounded-md text-xs inline-flex items-center ${colorClass}`}>
        <span className="font-medium mr-1">Доходность:</span> {profit.toFixed(1)} в день
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Список предметов</h2>
        <button
          onClick={handleCreateItem}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
        >
          Создать новый предмет
        </button>
      </div>
      
      {/* Расширенные фильтры и сортировка */}
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1">Поиск</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск предметов..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Категория</label>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="all">Все категории</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Механика</label>
            <select
              value={filterMechanic}
              onChange={(e) => setFilterMechanic(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="all">Все механики</option>
              {mechanics.map(mech => (
                <option key={mech} value={mech}>{mech}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Тип предмета</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="all">Все типы</option>
              <option value="regular">Обычные предметы</option>
              <option value="harvest">Урожай</option>
            </select>
          </div>
          
          {subTypes.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Подтип</label>
              <select
                value={filterSubType}
                onChange={(e) => setFilterSubType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="all">Все подтипы</option>
                {subTypes.map(subType => (
                  <option key={subType} value={subType}>{subType}</option>
                ))}
              </select>
            </div>
          )}
          
          {seasons.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">Сезон</label>
              <select
                value={filterSeason}
                onChange={(e) => setFilterSeason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="all">Все сезоны</option>
                {seasons.map(season => (
                  <option key={season} value={season}>{season}</option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium mb-1">Группировать по</label>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            >
              <option value="none">Без группировки</option>
              <option value="type">Типу (обычный/урожай)</option>
              <option value="tier">Тиру</option>
              <option value="category">Категории</option>
              <option value="mechanic">Механике</option>
              <option value="subType">Подтипу</option>
              <option value="season">Сезону</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Сортировка</label>
            <div className="flex">
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                <option value="name">Имя</option>
                <option value="tier">Тир</option>
                <option value="cost">Стоимость</option>
                <option value="profitability">Доходность</option>
              </select>
              <button
                onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="ml-2 px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md"
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Найдено предметов: {filteredItems.length} из {comparisonItems.length}
        </div>
      </div>
      
      {/* Список предметов с группировкой */}
      {Object.entries(groupedItems).map(([groupName, items]) => (
        <div key={groupName} className="mb-6">
          {groupBy !== 'none' && (
            <h3 className="text-lg font-medium mb-3 border-b pb-2 dark:border-gray-700">{groupName} ({items.length})</h3>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              const imageUrl = item.imageId !== undefined ? getImageUrl(item.imageId) : null;
              const itemCost = calculateItemCost(item);
              
              return (
                <div key={item.name} className="bg-white dark:bg-gray-700 rounded-lg shadow-sm overflow-hidden">
                  <div className="p-4 flex items-start gap-4">
                    {/* Изображение предмета */}
                    <div className="w-16 h-16 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                      {imageUrl ? (
                        <img src={imageUrl} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                          No Image
                        </div>
                      )}
                    </div>
                    
                    {/* Информация о предмете */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-lg truncate">{item.name}</h3>
                        {item.isHarvest && (
                          <span className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                            Урожай
                          </span>
                        )}
                      </div>
                      
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Tier {item.tier}
                        {item.subType && <span> • {item.subType}</span>}
                        <span> • {item.mechanic}</span>
                      </div>
                      
                      {/* Информация об урожае */}
                      {item.isHarvest && (
                        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                          <div>Сезоны: {formatListForDisplay(item.growingSeason)}</div>
                          <div>Время роста: {item.growingTime || 0} дней</div>
                          <div>Количество за сезон: {item.harvestPerSeason || 1}</div>
                          {renderProfitabilityBadge(item)}
                        </div>
                      )}
                      
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.selectedCategories.map(cat => (
                          <span key={cat} className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-full">
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Стоимость */}
                    <div className="text-right">
                      <div className="font-bold text-lg">{itemCost}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">стоимость</div>
                    </div>
                  </div>
                  
                  {/* Действия */}
                  <div className="bg-gray-50 dark:bg-gray-800 p-2 flex justify-between">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditItem(item)}
                        className="px-3 py-1 text-sm bg-blue-500 text-white rounded-md hover:bg-blue-600"
                      >
                        Редактировать
                      </button>
                      
                      <button
                        onClick={() => handleDuplicateItem(item)}
                        className="px-3 py-1 text-sm bg-green-500 text-white rounded-md hover:bg-green-600"
                        title="Дублировать с пустым названием"
                      >
                        Дублировать
                      </button>
                    </div>
                    
                    <button
                      onClick={() => handleDeleteItem(item)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded-md hover:bg-red-600"
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          
          {items.length === 0 && (
            <div className="p-8 text-center bg-white dark:bg-gray-700 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">В группе "{groupName}" нет предметов</p>
            </div>
          )}
        </div>
      ))}
      
      {filteredItems.length === 0 && (
        <div className="p-8 text-center bg-white dark:bg-gray-700 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Предметы не найдены</p>
        </div>
      )}
    </div>
  );
};

export default ItemList;