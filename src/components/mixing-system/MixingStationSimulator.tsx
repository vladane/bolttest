import React, { useState, useRef, useEffect } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { useBalance, ItemData } from '../../contexts/BalanceContext';
import { getImageUrl as getImageUrlUtil } from '../../utils/imageUtils';

// Используем те же разрешенные категории для согласованности
const ALLOWED_CATEGORIES = ['Еда', 'Напитки', 'Насекомые', 'Плоды', 'Ингредиент', 'Урожай', 'Рыба', 'Грибы'];

// Режимы отображения списка ингредиентов
type DisplayMode = 'list' | 'grid';

const MixingStationSimulator: React.FC = () => {
  const { state } = useAppState();
  const balance = useBalance();
  const [stationSlots, setStationSlots] = useState<(ItemData | null)[]>([null, null, null]);
  const [resultItem, setResultItem] = useState<any | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [showRecent, setShowRecent] = useState(false);
  const [recentIngredients, setRecentIngredients] = useState<ItemData[]>([]);
  const [sortOption, setSortOption] = useState<'name' | 'category'>('name');
  const [showSlotsDropdown, setShowSlotsDropdown] = useState<number | null>(null);
  
  // Refs для перетаскивания
  const dragItem = useRef<any>(null);
  const dragOverSlot = useRef<number | null>(null);
  
  // Функция для получения URL изображения
  const getImageUrl = (imageId: string): string => {
    return getImageUrlUtil(imageId, state) || '';
  };

  // Проверка наличия пустых слотов
  const hasEmptySlot = stationSlots.some(slot => slot === null);
  
  // Добавление в первый пустой слот
  const handleAddToFirstEmptySlot = (item: ItemData) => {
    const emptySlotIndex = stationSlots.findIndex(slot => slot === null);
    if (emptySlotIndex !== -1) {
      handleAddItemToSlot(item, emptySlotIndex);
      
      // Добавление в недавние ингредиенты
      if (!recentIngredients.some(recent => recent.name === item.name)) {
        const newRecent = [item, ...recentIngredients.slice(0, 7)];
        setRecentIngredients(newRecent);
      }
    }
  };
  
  // Фильтрация предметов по разрешенным категориям
  const availableItems = balance.comparisonItems.filter(item => {
    return item.selectedCategories && 
           item.selectedCategories.some(category => 
             ALLOWED_CATEGORIES.includes(category)
           );
  });
  
  // Фильтрация доступных предметов
  const filteredItems = availableItems.filter(item => {
    // Фильтр по выбранным категориям
    const categoryMatch = selectedCategories.length === 0 || 
      (item.selectedCategories && 
       item.selectedCategories.some(category => selectedCategories.includes(category)));
    
    // Фильтр по поисковому запросу
    const searchMatch = !searchQuery || 
      (item.name && item.name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (item.subType && item.subType.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return categoryMatch && searchMatch;
  });
  
  // Сортировка отфильтрованных предметов
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortOption === 'name') {
      return a.name.localeCompare(b.name);
    } else {
      // Сортировка по основной категории
      const catA = a.selectedCategories && a.selectedCategories[0] || '';
      const catB = b.selectedCategories && b.selectedCategories[0] || '';
      const catCompare = catA.localeCompare(catB);
      
      // Если категории совпадают, сортируем по имени
      return catCompare !== 0 ? catCompare : a.name.localeCompare(b.name);
    }
  });
  
  // Обработчик изменения категорий
  const handleCategoryChange = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(cat => cat !== category);
      } else {
        return [...prev, category];
      }
    });
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    setSelectedCategories([]);
    setSearchQuery('');
    setSortOption('name');
    setShowRecent(false);
  };
  
  // Обработчик добавления предмета в слот
  const handleAddItemToSlot = (item: ItemData, slotIndex: number) => {
    const newSlots = [...stationSlots];
    newSlots[slotIndex] = item;
    setStationSlots(newSlots);
    setResultItem(null); // Сбрасываем результат при изменении ингредиентов
  };
  
  // Обработчик удаления предмета из слота
  const handleRemoveFromSlot = (slotIndex: number) => {
    const newSlots = [...stationSlots];
    newSlots[slotIndex] = null;
    setStationSlots(newSlots);
    setResultItem(null); // Сбрасываем результат при изменении ингредиентов
  };
  
  // Обработчик начала перетаскивания
  const handleDragStart = (e: React.DragEvent, item: ItemData) => {
    dragItem.current = item;
    e.dataTransfer.effectAllowed = 'move';
    // Для лучшей UI обратной связи
    setTimeout(() => {
      e.currentTarget.classList.add('opacity-50');
    }, 0);
  };
  
  // Обработчик завершения перетаскивания
  const handleDragEnd = (e: React.DragEvent) => {
    dragItem.current = null;
    dragOverSlot.current = null;
    e.currentTarget.classList.remove('opacity-50');
  };
  
  // Обработчик перетаскивания над слотом
  const handleDragOver = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    dragOverSlot.current = slotIndex;
  };
  
  // Обработчик отпускания элемента над слотом
  const handleDrop = (e: React.DragEvent, slotIndex: number) => {
    e.preventDefault();
    if (dragItem.current) {
      handleAddItemToSlot(dragItem.current, slotIndex);
      
      // Добавление в недавние ингредиенты
      if (!recentIngredients.some(recent => recent.name === dragItem.current.name)) {
        const newRecent = [dragItem.current, ...recentIngredients.slice(0, 7)];
        setRecentIngredients(newRecent);
      }
    }
    dragItem.current = null;
    dragOverSlot.current = null;
  };
  
  // Кнопка сброса всех слотов - исправлено для 3 слотов
  const handleClearAllSlots = () => {
    setStationSlots([null, null, null]);
    setResultItem(null);
  };
  
  // Обработчик процесса смешивания
  const handleMix = () => {
    setIsProcessing(true);
    
    // Имитация процесса обработки
    setTimeout(() => {
      // Получаем только непустые слоты
      const ingredients = stationSlots.filter(slot => slot !== null) as ItemData[];
      
      // Ищем подходящий рецепт
      const recipe = findMatchingRecipe(ingredients);
      
      if (recipe) {
        // Найден подходящий рецепт
        setResultItem({
          ...recipe.result,
          isSuccess: true
        });
      } else {
        // Рецепт не найден, создаем испорченную еду
        const foodType = determineSpoiledFoodType(ingredients);
        const spoiledFood = state.mixingSystem.spoiledFood.find(f => f.type === foodType);
        
        setResultItem({
          name: spoiledFood?.name || 'Испорченная еда',
          imageId: spoiledFood?.imageId || '',
          foodType,
          isSuccess: false,
          description: spoiledFood?.description || 'Что-то пошло не так...'
        });
      }
      
      setIsProcessing(false);
    }, 1500);
  };
  
  // Отображение категорий в удобной форме (бейджи)
  const displayCategories = (item: ItemData) => {
    if (!item.selectedCategories || item.selectedCategories.length === 0) return null;
    
    // В сетке показываем только 2 категории
    const categoriesToShow = displayMode === 'grid' ? item.selectedCategories.slice(0, 2) : item.selectedCategories;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1 justify-center">
        {categoriesToShow.map(category => (
          <span
            key={category}
            className="text-xs px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded-full"
          >
            {category}
          </span>
        ))}
        {displayMode === 'grid' && item.selectedCategories.length > 2 && (
          <span className="text-xs px-1.5 py-0.5 bg-gray-700 text-gray-400 rounded-full">
            +{item.selectedCategories.length - 2}
          </span>
        )}
      </div>
    );
  };
  
  // Функция для поиска подходящего рецепта
  const findMatchingRecipe = (ingredients: ItemData[]) => {
    if (ingredients.length === 0) return null;
    
    // Имена ингредиентов для сравнения
    const ingredientNames = ingredients.map(i => i.name).sort();
    
    return state.mixingSystem.recipes.find(recipe => {
      // Проверяем, совпадают ли ингредиенты
      const recipeIngredientNames = recipe.ingredients.map(i => i.name).sort();
      
      // Проверяем совпадение количества и имен ингредиентов
      if (ingredientNames.length !== recipeIngredientNames.length) return false;
      
      // Проверяем каждый ингредиент
      return ingredientNames.every((name, index) => name === recipeIngredientNames[index]);
    });
  };
  
  // Функция для определения типа испорченной еды
  const determineSpoiledFoodType = (ingredients: ItemData[]): 'meat' | 'fish' | 'general' => {
    // Проверяем наличие мясных ингредиентов
    const hasMeat = ingredients.some(item => {
      return (
        item.selectedCategories?.includes('Мясо') || 
        item.subType === 'Мясной' ||
        (item.name && item.name.toLowerCase().includes('мясо'))
      );
    });
    
    // Проверяем наличие рыбных ингредиентов
    const hasFish = ingredients.some(item => {
      return (
        item.selectedCategories?.includes('Рыба') || 
        item.subType === 'Рыбный' ||
        (item.name && item.name.toLowerCase().includes('рыба'))
      );
    });
    
    if (hasMeat) return 'meat';
    if (hasFish) return 'fish';
    return 'general';
  };

  // Отображение подменю для выбора слота
  const renderSlotDropdown = (item: ItemData, index: number) => {
    if (showSlotsDropdown !== index) return null;
    
    return (
      <div className="absolute right-0 mt-10 bg-gray-800 border border-gray-700 rounded shadow-lg z-10">
        <ul>
          {stationSlots.map((slot, slotIndex) => (
            <li key={slotIndex}>
              <button
                onClick={() => {
                  handleAddItemToSlot(item, slotIndex);
                  setShowSlotsDropdown(null);
                }}
                disabled={slot !== null}
                className={`w-full text-left px-4 py-2 ${
                  slot === null 
                    ? 'hover:bg-gray-700 text-gray-200' 
                    : 'text-gray-500 cursor-not-allowed'
                }`}
              >
                {slot === null ? `Добавить в слот ${slotIndex + 1}` : `Слот ${slotIndex + 1} занят`}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };
  
  // Проверяем, можно ли смешивать (должен быть хотя бы 1 ингредиент)
  const canMix = stationSlots.some(slot => slot !== null);

  // Закрыть выпадающее меню при клике вне
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSlotsDropdown(null);
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-100">Тестирование станции смешивания</h2>
        
        {/* Слоты для ингредиентов */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-md font-medium text-gray-200">Ингредиенты</h3>
            <button 
              onClick={handleClearAllSlots}
              className={`text-xs px-2 py-1 text-red-400 border border-red-500 rounded hover:bg-red-500 hover:text-white transition-colors ${
                !canMix ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              disabled={!canMix}
            >
              Очистить все
            </button>
          </div>
          
          {/* КВАДРАТНЫЕ СЛОТЫ */}
          <div className="flex flex-col space-y-6">
            {stationSlots.map((slot, index) => (
              <div 
                key={index}
                className={`relative aspect-[3/1] border-2 ${
                  slot ? 'border-solid border-blue-600/40' : 'border-dashed'
                } rounded-lg flex items-center justify-center overflow-hidden p-4
                ${dragOverSlot.current === index ? 'border-blue-500 bg-blue-900/20' : 'dark:border-gray-600'}
                `}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
              >
                {/* Номер слота с безопасным отступом */}
                <div className="absolute left-0 top-0 p-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <span className="text-white text-base font-bold">{index + 1}</span>
                  </div>
                </div>
                
                {slot ? (
                  <div className="flex w-full h-full pl-10">
                    {/* Изображение */}
                    <div className="flex-shrink-0 flex items-center">
                      {slot.imageId ? (
                        <div className="w-16 h-16 mr-4">
                          <img 
                            src={getImageUrl(slot.imageId)}
                            alt={slot.name}
                            className="w-full h-full object-cover rounded shadow-md"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 mr-4 bg-gray-700 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-500">Нет изображения</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Информация о предмете */}
                    <div className="flex-1 flex flex-col justify-center mr-8">
                      <p className="font-semibold text-gray-100 text-base mb-1 truncate">
                        {slot.name}
                      </p>
                      
                      {slot.subType && (
                        <p className="text-xs text-gray-400 mb-1">{slot.subType}</p>
                      )}
                      
                      <div className="flex flex-wrap gap-1">
                        {slot.selectedCategories && slot.selectedCategories.map(category => (
                          <span
                            key={category}
                            className="text-xs px-1.5 py-0.5 bg-blue-900/40 text-blue-300 rounded-full"
                          >
                            {category}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    {/* Кнопка удаления */}
                    <div className="flex-shrink-0 flex items-center">
                      <button 
                        onClick={() => handleRemoveFromSlot(index)}
                        className="bg-red-500/20 hover:bg-red-500/40 text-red-300 w-8 h-8 rounded-full flex items-center justify-center"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full h-full pl-8">
                    <span className="text-gray-500">Пустой слот</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
        
        {/* Кнопка смешивания */}
        <div className="mb-4 text-center">
          <button
            onClick={handleMix}
            disabled={!canMix || isProcessing}
            className={`px-6 py-3 rounded-lg font-semibold ${
              canMix && !isProcessing 
                ? 'bg-primary text-white hover:bg-opacity-90' 
                : 'bg-gray-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isProcessing ? 'Смешивание...' : 'Смешать ингредиенты'}
          </button>
        </div>
        
        {/* Результат смешивания */}
        {resultItem && (
          <div className="mt-6 p-4 border rounded-lg dark:border-gray-700">
            <h3 className="text-lg font-medium mb-2 text-gray-100">Результат:</h3>
            <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-4">
              <div className="w-24 h-24 bg-gray-700 rounded-lg flex items-center justify-center">
                {resultItem.imageId ? (
                  <img 
                    src={getImageUrl(resultItem.imageId)}
                    alt={resultItem.name}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <span className="text-gray-500 text-sm text-center px-2">Нет изображения</span>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg text-gray-100">{resultItem.name}</p>
                <p className={`text-sm ${resultItem.isSuccess ? 'text-green-400' : 'text-red-400'}`}>
                  {resultItem.isSuccess ? 'Успешно приготовлено!' : 'Испорчено!'}
                </p>
                {resultItem.description && (
                  <p className="mt-2 text-sm text-gray-300">{resultItem.description}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Правая колонка без изменений */}
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-100">Доступные ингредиенты</h2>
        
        <div className="mb-2 text-xs text-gray-400">
          Разрешены категории: {ALLOWED_CATEGORIES.join(', ')}
        </div>
        
        {/* Панель управления фильтрами и отображением */}
        <div className="mb-4 space-y-3">
          {/* Поиск и переключатель вида */}
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск ингредиентов..."
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-gray-400 hover:text-gray-200"
                >
                  ×
                </button>
              )}
            </div>
            
            <div className="flex border border-gray-600 rounded overflow-hidden">
              <button
                onClick={() => setDisplayMode('list')}
                className={`px-2 py-1 ${displayMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                title="Список"
              >
                ☰
              </button>
              <button
                onClick={() => setDisplayMode('grid')}
                className={`px-2 py-1 ${displayMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                title="Сетка"
              >
                ▦
              </button>
            </div>
          </div>
          
          {/* Фильтры и сортировка */}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-sm text-gray-300">Фильтры:</span>
            
            <div className="flex items-center">
              <button
                onClick={() => setShowRecent(!showRecent)}
                className={`px-2 py-1 text-xs rounded ${
                  showRecent ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                Недавние
              </button>
            </div>
            
            <div className="flex items-center ml-2">
              <span className="text-sm text-gray-300 mr-1">Сортировка:</span>
              <select
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value as 'name' | 'category')}
                className="bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm py-1"
              >
                <option value="name">По имени</option>
                <option value="category">По категории</option>
              </select>
            </div>
            
            {(selectedCategories.length > 0 || searchQuery || showRecent) && (
              <button
                onClick={resetFilters}
                className="px-2 py-1 text-xs bg-red-500/40 text-red-300 rounded hover:bg-red-500/60"
              >
                Сбросить
              </button>
            )}
          </div>
          
          {/* Категории */}
          <div className="flex flex-wrap gap-1">
            {ALLOWED_CATEGORIES.map(category => (
              <button
                key={category}
                onClick={() => handleCategoryChange(category)}
                className={`px-2 py-1 text-xs rounded ${
                  selectedCategories.includes(category) 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>
        
        {/* Недавно использованные */}
        {showRecent && recentIngredients.length > 0 && (
          <div className="mb-4">
            <h3 className="text-md font-medium mb-2 text-gray-200">Недавно использованные</h3>
            <div className="flex flex-wrap gap-2">
              {recentIngredients.map((item, idx) => (
                <div 
                  key={idx}
                  className="bg-gray-700 rounded p-2 flex items-center cursor-pointer hover:bg-gray-600"
                  onClick={() => handleAddToFirstEmptySlot(item)}
                >
                  {item.imageId && (
                    <img 
                      src={getImageUrl(item.imageId)}
                      alt={item.name}
                      className="w-6 h-6 object-cover rounded mr-1"
                    />
                  )}
                  <span className="text-sm text-gray-200">{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Список доступных ингредиентов */}
        {displayMode === 'list' ? (
          // Отображение в виде списка
          <div className="max-h-[500px] overflow-y-auto border border-gray-700 rounded">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                Ничего не найдено
              </div>
            ) : (
              sortedItems.map((item, index) => (
                <div 
                  key={index}
                  className="p-3 border-b border-gray-700 hover:bg-gray-700 transition-colors"
                  draggable
                  onDragStart={(e) => handleDragStart(e, item)}
                  onDragEnd={handleDragEnd}
                >
                  <div className="flex items-center">
                    {item.imageId ? (
                      <div className="w-10 h-10 mr-3 flex-shrink-0">
                        <img 
                          src={getImageUrl(item.imageId)} 
                          alt={item.name}
                          className="w-full h-full object-cover rounded"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 mr-3 bg-gray-700 rounded flex items-center justify-center flex-shrink-0">
                        <span className="text-xs text-gray-500">Нет</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-gray-200">{item.name}</p>
                      {displayCategories(item)}
                      {item.subType && (
                        <span className="text-xs text-gray-400">{item.subType}</span>
                      )}
                    </div>
                    
                    <div className="relative">
                      {hasEmptySlot ? (
                        <button 
                          onClick={() => handleAddToFirstEmptySlot(item)}
                          className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                        >
                          Добавить
                        </button>
                      ) : (
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSlotsDropdown(index);
                            }}
                            className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Выбрать слот
                          </button>
                          {renderSlotDropdown(item, index)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          // Отображение в виде сетки
          <div className="max-h-[500px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-gray-400">
                Ничего не найдено
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {sortedItems.map((item, index) => (
                  <div 
                    key={index}
                    className="p-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                    onClick={() => hasEmptySlot ? handleAddToFirstEmptySlot(item) : setShowSlotsDropdown(index)}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item)}
                    onDragEnd={handleDragEnd}
                  >
                    <div className="flex flex-col items-center">
                      {item.imageId ? (
                        <div className="w-16 h-16 mb-1">
                          <img 
                            src={getImageUrl(item.imageId)} 
                            alt={item.name}
                            className="w-full h-full object-cover rounded"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 mb-1 bg-gray-700 rounded flex items-center justify-center">
                          <span className="text-xs text-gray-500">Нет изображения</span>
                        </div>
                      )}
                      <p className="text-sm text-center text-gray-200 truncate w-full">{item.name}</p>
                      {item.subType && (
                        <p className="text-xs text-center text-gray-400 truncate w-full">{item.subType}</p>
                      )}
                      <div className="flex justify-center flex-wrap mt-1">
                        {displayCategories(item)}
                      </div>
                      
                      {/* Всплывающее меню выбора слота */}
                      {renderSlotDropdown(item, index)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MixingStationSimulator;