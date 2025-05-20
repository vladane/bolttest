import React, { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { useBalance, ItemData } from '../../contexts/BalanceContext';
import ImageUpload from '../common/ImageUpload';
import { getImageUrl as getImageUrlUtil } from '../../utils/imageUtils';

// Используем те же разрешенные категории для согласованности
const ALLOWED_CATEGORIES = ['Еда', 'Напитки', 'Насекомые', 'Плоды', 'Ингредиент', 'Урожай', 'Рыба', 'Грибы'];

// Режимы отображения списка ингредиентов
type DisplayMode = 'list' | 'grid';

// Добавляем пропсы
interface MixingRecipeEditorComponentProps {
  editingRecipeId: string | null;
  onSaveComplete: () => void;
}

const MixingRecipeEditorComponent: React.FC<MixingRecipeEditorComponentProps> = ({
  editingRecipeId,
  onSaveComplete
}) => {
  const { state, updateState } = useAppState();
  const balance = useBalance();
  const [selectedItems, setSelectedItems] = useState<ItemData[]>([]);
  const [resultName, setResultName] = useState('');
  const [resultImageId, setResultImageId] = useState('');
  const [foodType, setFoodType] = useState<'meat' | 'fish' | 'general'>('general');
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<DisplayMode>('grid');
  const [sortOption, setSortOption] = useState<'name' | 'category'>('name');
  const [showRecent, setShowRecent] = useState(false);
  const [recentIngredients, setRecentIngredients] = useState<ItemData[]>([]);
  
  // Ref для отслеживания перетаскивания
  const dragItem = useRef<any>(null);
  
  // Функция для получения URL изображения
  const getImageUrl = (imageId: string): string => {
    return imageId ? getImageUrlUtil(imageId, state) || '' : '';
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
  
  
  // Загрузка рецепта для редактирования
  useEffect(() => {
    if (editingRecipeId) {
      const recipe = state.mixingSystem.recipes.find(r => r.id === editingRecipeId);
      if (recipe) {
        setSelectedItems(recipe.ingredients);
        setResultName(recipe.result.name);
        setResultImageId(recipe.result.imageId);
        setFoodType(recipe.result.foodType as 'meat' | 'fish' | 'general');
        setDescription(recipe.result.description || '');
      }
    } else {
      // Сброс формы при создании нового рецепта
      setSelectedItems([]);
      setResultName('');
      setResultImageId('');
      setFoodType('general');
      setDescription('');
    }
  }, [editingRecipeId, state.mixingSystem.recipes]);
  
  // Обработчик добавления ингредиента
  const handleAddIngredient = (item: ItemData) => {
    if (selectedItems.find(i => i.name === item.name)) return;
    
    setSelectedItems([...selectedItems, item]);
    
    // Добавление в недавние ингредиенты
    if (!recentIngredients.some(recent => recent.name === item.name)) {
      const newRecent = [item, ...recentIngredients.slice(0, 7)];
      setRecentIngredients(newRecent);
    }
  };
  
  // Обработчик удаления ингредиента
  const handleRemoveIngredient = (index: number) => {
    setSelectedItems(selectedItems.filter((_, i) => i !== index));
  };
  
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
  
  // Обработчик начала перетаскивания
  const handleDragStart = (e: React.DragEvent, item: ItemData) => {
    dragItem.current = item;
    e.dataTransfer.effectAllowed = 'move';
    setTimeout(() => {
      e.currentTarget.classList.add('opacity-50');
    }, 0);
  };
  
  // Обработчик завершения перетаскивания
  const handleDragEnd = (e: React.DragEvent) => {
    dragItem.current = null;
    // Проверка на существование e.currentTarget
    if (e.currentTarget && e.currentTarget.classList) {
      e.currentTarget.classList.remove('opacity-50');
    }
  };
  
  // Обработчик сохранения рецепта
  const handleSaveRecipe = () => {
    if (!resultName || selectedItems.length === 0) {
      alert('Пожалуйста, заполните все необходимые поля!');
      return;
    }
    
    const newRecipe = {
      id: editingRecipeId || `recipe-${Date.now()}`,
      name: resultName,
      ingredients: selectedItems,
      result: {
        name: resultName,
        imageId: resultImageId,
        foodType,
        description
      }
    };
    
    if (editingRecipeId) {
      // Обновляем существующий рецепт
      const updatedRecipes = state.mixingSystem.recipes.map(r => 
        r.id === editingRecipeId ? newRecipe : r
      );
      updateState('mixingSystem.recipes', updatedRecipes);
    } else {
      // Добавляем новый рецепт
      updateState('mixingSystem.recipes', [...state.mixingSystem.recipes, newRecipe]);
    }
    
    // Сброс формы
    setSelectedItems([]);
    setResultName('');
    setResultImageId('');
    setFoodType('general');
    setDescription('');
    
    // Показываем сообщение
    alert(`Рецепт "${resultName}" успешно сохранен!`);
    
    // Вызываем callback для возврата к списку рецептов
    onSaveComplete();
  };
  
  // Отображение категорий в удобной форме (бейджи)
  const displayCategories = (item: ItemData) => {
    if (!item.selectedCategories || item.selectedCategories.length === 0) return null;
    
    // В сетке показываем только 2 категории
    const categoriesToShow = displayMode === 'grid' ? item.selectedCategories.slice(0, 2) : item.selectedCategories;
    
    return (
      <div className="flex flex-wrap gap-1 mt-1">
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
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-100">Ингредиенты рецепта</h2>
        
        {/* Список выбранных ингредиентов */}
        <div className="mb-6">
          <h3 className="text-md font-medium mb-3 text-gray-200">Выбранные ингредиенты</h3>
          
          {selectedItems.length === 0 ? (
            <p className="text-gray-400 mb-4 p-4 border border-dashed border-gray-600 rounded-lg text-center">
              Нет выбранных ингредиентов. Добавьте ингредиенты из списка ниже.
            </p>
          ) : (
            <div className="space-y-3 mb-4">
              {selectedItems.map((item, index) => (
                <div 
                  key={index}
                  className="relative flex items-center bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-colors border border-gray-600"
                >
                  <div className="flex-shrink-0 mr-3">
                    {item.imageId ? (
                      <img 
                        src={getImageUrl(item.imageId)} 
                        alt={item.name}
                        className="w-12 h-12 object-cover rounded-md"
                      />
                    ) : (
                      <div className="w-12 h-12 bg-gray-600 rounded-md flex items-center justify-center">
                        <span className="text-xs text-gray-400">Нет изображения</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-100">{item.name}</p>
                    <div className="flex items-center flex-wrap gap-1 mt-1">
                      {item.subType && (
                        <span className="text-xs text-gray-400 mr-1">{item.subType}</span>
                      )}
                      {displayCategories(item)}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleRemoveIngredient(index)}
                    className="ml-2 bg-red-500/20 hover:bg-red-500/40 text-red-300 w-8 h-8 rounded-full flex items-center justify-center"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Поиск и выбор ингредиентов */}
        <div>
          <h3 className="text-md font-medium mb-3 text-gray-200">Выбрать ингредиенты</h3>
          
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
              <h4 className="text-sm font-medium mb-2 text-gray-300">Недавно использованные</h4>
              <div className="flex flex-wrap gap-2">
                {recentIngredients.map((item, idx) => (
                  <div 
                    key={idx}
                    className="bg-gray-700 rounded p-2 flex items-center cursor-pointer hover:bg-gray-600"
                    onClick={() => handleAddIngredient(item)}
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
          
          {/* Доступные ингредиенты */}
          <div className="border border-gray-700 rounded">
            {displayMode === 'list' ? (
              // Вид списка
              <div className="max-h-[400px] overflow-y-auto">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    Ничего не найдено
                  </div>
                ) : (
                  filteredItems.map((item, index) => (
                    <div 
                      key={index}
                      className="p-3 border-b border-gray-700 hover:bg-gray-700 transition-colors cursor-pointer"
                      onClick={() => handleAddIngredient(item)}
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
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddIngredient(item);
                          }}
                          className="ml-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Добавить
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              // Вид сетки
              <div className="max-h-[400px] overflow-y-auto p-2">
                {filteredItems.length === 0 ? (
                  <div className="p-4 text-center text-gray-400">
                    Ничего не найдено
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {filteredItems.map((item, index) => (
                      <div 
                        key={index}
                        className="p-2 border border-gray-700 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors cursor-pointer"
                        onClick={() => handleAddIngredient(item)}
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
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-4 text-gray-100">Результат рецепта</h2>
        
        <div className="space-y-5">
          <div>
            <label className="block mb-2 text-gray-200">Название блюда</label>
            <input 
              type="text"
              value={resultName}
              onChange={(e) => setResultName(e.target.value)}
              placeholder="Введите название блюда"
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          <div>
            <label className="block mb-2 text-gray-200">Тип еды</label>
            <select
              value={foodType}
              onChange={(e) => setFoodType(e.target.value as 'meat' | 'fish' | 'general')}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="general">Обычное блюдо</option>
              <option value="meat">Мясное блюдо</option>
              <option value="fish">Рыбное блюдо</option>
            </select>
          </div>
          
          <div>
            <label className="block mb-2 text-gray-200">Изображение</label>
            <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
              <ImageUpload onUpload={(id) => setResultImageId(id)} />
              
              {resultImageId ? (
                <div className="mt-4 flex justify-center">
                  <div className="w-40 h-40 rounded-lg overflow-hidden border border-gray-600">
                    <img 
                      src={getImageUrl(resultImageId)}
                      alt={resultName}
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex justify-center">
                  <div className="w-40 h-40 border border-dashed border-gray-500 rounded-lg flex items-center justify-center bg-gray-800">
                    <span className="text-gray-400 text-center px-4">
                      Изображение будет отображаться здесь
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="block mb-2 text-gray-200">Описание (необязательно)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Опишите блюдо..."
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded h-32 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
          
          {/* Предпросмотр рецепта */}
          <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
            <h3 className="text-md font-medium mb-3 text-gray-200">Предпросмотр рецепта</h3>
            
            <div className="flex items-center mb-3">
              {resultImageId ? (
                <img 
                  src={getImageUrl(resultImageId)}
                  alt={resultName || 'Предпросмотр'}
                  className="w-16 h-16 object-cover rounded-lg mr-3"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-800 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-xs text-gray-500">Нет изображения</span>
                </div>
              )}
              
              <div>
                <h4 className="font-medium text-gray-100">
                  {resultName || 'Название блюда'}
                </h4>
                <div className="flex items-center mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    foodType === 'meat' ? 'bg-red-900/40 text-red-300' :
                    foodType === 'fish' ? 'bg-blue-900/40 text-blue-300' :
                    'bg-green-900/40 text-green-300'
                  }`}>
                    {foodType === 'meat' ? 'Мясное' : 
                     foodType === 'fish' ? 'Рыбное' : 'Обычное'}
                  </span>
                </div>
              </div>
            </div>
            
            {description && (
              <p className="text-sm text-gray-400 mb-3">{description}</p>
            )}
            
            <div>
              <p className="text-sm font-medium text-gray-300 mb-1">Ингредиенты:</p>
              {selectedItems.length === 0 ? (
                <p className="text-xs text-gray-500">Нет ингредиентов</p>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {selectedItems.map((item, idx) => (
                    <span key={idx} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">
                      {item.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 text-center">
            <button
              onClick={handleSaveRecipe}
              disabled={!resultName || selectedItems.length === 0}
              className={`px-6 py-3 rounded-lg font-semibold ${
                resultName && selectedItems.length > 0
                  ? 'bg-primary text-white hover:bg-opacity-90' 
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {editingRecipeId ? 'Обновить рецепт' : 'Создать рецепт'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MixingRecipeEditorComponent;