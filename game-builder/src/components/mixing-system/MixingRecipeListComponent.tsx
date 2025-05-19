import React, { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { getImageUrl as getImageUrlUtil } from '../../utils/imageUtils';

interface MixingRecipeListComponentProps {
  onEditRecipe: (recipeId: string) => void;
  onCreateRecipe: () => void;
}

const MixingRecipeListComponent: React.FC<MixingRecipeListComponentProps> = ({ 
  onEditRecipe, 
  onCreateRecipe 
}) => {
  const { state, updateState } = useAppState();
  const { recipes } = state.mixingSystem;
  
  // Состояния для фильтрации, поиска и отображения
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFoodTypes, setSelectedFoodTypes] = useState<string[]>([]);
  const [displayMode, setDisplayMode] = useState<'list' | 'grid'>('grid');
  const [sortOption, setSortOption] = useState<'name' | 'type'>('name');
  
  // Функция для получения URL изображения
  const getImageUrl = (imageId: string): string => {
    return imageId ? getImageUrlUtil(imageId, state) || '' : '';
  };
  
  // Фильтрация рецептов
  const filteredRecipes = recipes.filter(recipe => {
    // Фильтр по типу еды
    const typeMatch = selectedFoodTypes.length === 0 || 
      selectedFoodTypes.includes(recipe.result.foodType);
    
    // Фильтр по поисковому запросу (в названии или ингредиентах)
    const searchMatch = !searchQuery || 
      recipe.result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      recipe.ingredients.some(ing => 
        ing.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    
    return typeMatch && searchMatch;
  });
  
  // Сортировка рецептов
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    if (sortOption === 'name') {
      return a.result.name.localeCompare(b.result.name);
    } else {
      // Сначала по типу, затем по имени
      const typeCompare = a.result.foodType.localeCompare(b.result.foodType);
      return typeCompare !== 0 ? typeCompare : a.result.name.localeCompare(b.result.name);
    }
  });
  
  // Обработчик удаления рецепта
  const handleDeleteRecipe = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить этот рецепт?')) {
      updateState('mixingSystem.recipes', recipes.filter(r => r.id !== id));
    }
  };
  
  // Обработчик изменения типа блюда для фильтра
  const handleFoodTypeChange = (foodType: string) => {
    setSelectedFoodTypes(prev => {
      if (prev.includes(foodType)) {
        return prev.filter(type => type !== foodType);
      } else {
        return [...prev, foodType];
      }
    });
  };
  
  // Сброс фильтров
  const resetFilters = () => {
    setSelectedFoodTypes([]);
    setSearchQuery('');
    setSortOption('name');
  };
  
  // Получение локализованного названия типа еды
  const getFoodTypeLabel = (foodType: string): string => {
    switch (foodType) {
      case 'meat': return 'Мясное';
      case 'fish': return 'Рыбное';
      case 'general': return 'Обычное';
      default: return 'Неизвестно';
    }
  };
  
  // Цвет бейджа в зависимости от типа еды
  const getFoodTypeColor = (foodType: string): string => {
    switch (foodType) {
      case 'meat': return 'bg-red-900/40 text-red-300';
      case 'fish': return 'bg-blue-900/40 text-blue-300';
      case 'general': return 'bg-green-900/40 text-green-300';
      default: return 'bg-gray-700 text-gray-300';
    }
  };
  
  return (
    <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-100">Список рецептов смешивания</h2>
      
      {/* Панель управления фильтрами и отображением */}
      <div className="mb-6 space-y-3">
        {/* Поиск и переключатель вида */}
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск рецептов..."
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
          
          <div className="flex flex-wrap gap-1">
            <button
              onClick={() => handleFoodTypeChange('meat')}
              className={`px-2 py-1 text-xs rounded ${
                selectedFoodTypes.includes('meat') 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Мясное
            </button>
            <button
              onClick={() => handleFoodTypeChange('fish')}
              className={`px-2 py-1 text-xs rounded ${
                selectedFoodTypes.includes('fish') 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Рыбное
            </button>
            <button
              onClick={() => handleFoodTypeChange('general')}
              className={`px-2 py-1 text-xs rounded ${
                selectedFoodTypes.includes('general') 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
              }`}
            >
              Обычное
            </button>
          </div>
          
          <div className="flex items-center ml-2">
            <span className="text-sm text-gray-300 mr-1">Сортировка:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as 'name' | 'type')}
              className="bg-gray-700 border border-gray-600 rounded text-gray-200 text-sm py-1"
            >
              <option value="name">По имени</option>
              <option value="type">По типу</option>
            </select>
          </div>
          
          {(selectedFoodTypes.length > 0 || searchQuery) && (
            <button
              onClick={resetFilters}
              className="px-2 py-1 text-xs bg-red-500/40 text-red-300 rounded hover:bg-red-500/60"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>
      
      {sortedRecipes.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          {recipes.length === 0 ? (
            <>
              <p className="mb-2">У вас пока нет созданных рецептов</p>
              <button
                onClick={onCreateRecipe}
                className="px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
              >
                Создать рецепт
              </button>
            </>
          ) : (
            <p>Не найдено рецептов, соответствующих фильтрам</p>
          )}
        </div>
      ) : (
        displayMode === 'list' ? (
          // Вид списка
          <div className="space-y-4">
            {sortedRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/50 transition-colors"
              >
                <div className="flex">
                  {/* Изображение результата */}
                  <div className="w-20 h-20 rounded overflow-hidden flex-shrink-0 mr-4">
                    {recipe.result.imageId ? (
                      <img 
                        src={getImageUrl(recipe.result.imageId)}
                        alt={recipe.result.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                        <span className="text-xs text-gray-500">Нет фото</span>
                      </div>
                    )}
                  </div>
                  
                  {/* Информация о рецепте */}
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium text-gray-100 text-lg">{recipe.result.name}</h3>
                        <div className="mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getFoodTypeColor(recipe.result.foodType)}`}>
                            {getFoodTypeLabel(recipe.result.foodType)}
                          </span>
                        </div>
                        {recipe.result.description && (
                          <p className="text-sm text-gray-400 mt-1 line-clamp-2">{recipe.result.description}</p>
                        )}
                      </div>
                      
                      <div className="flex space-x-2">
                        <button
                          onClick={() => onEditRecipe(recipe.id)}
                          className="px-3 py-1 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 text-sm rounded transition-colors"
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteRecipe(recipe.id)}
                          className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 text-red-300 text-sm rounded transition-colors"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-3">
                      <p className="text-sm font-medium text-gray-300 mb-1">Ингредиенты:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {recipe.ingredients.map((item, idx) => (
                          <div key={idx} className="flex items-center bg-gray-700 rounded px-2 py-1">
                            {item.imageId && (
                              <img 
                                src={getImageUrl(item.imageId)}
                                alt={item.name}
                                className="w-4 h-4 object-cover rounded mr-1"
                              />
                            )}
                            <span className="text-xs text-gray-300">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // Вид сетки
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedRecipes.map(recipe => (
              <div 
                key={recipe.id} 
                className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/50 transition-colors flex flex-col"
              >
                {/* Изображение результата */}
                <div className="w-full h-40 rounded overflow-hidden mb-3">
                  {recipe.result.imageId ? (
                    <img 
                      src={getImageUrl(recipe.result.imageId)}
                      alt={recipe.result.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                      <span className="text-gray-500">Нет изображения</span>
                    </div>
                  )}
                </div>
                
                {/* Информация о рецепте */}
                <div className="flex-1">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-gray-100">{recipe.result.name}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getFoodTypeColor(recipe.result.foodType)}`}>
                      {getFoodTypeLabel(recipe.result.foodType)}
                    </span>
                  </div>
                  
                  {recipe.result.description && (
                    <p className="text-sm text-gray-400 mb-3 line-clamp-2">{recipe.result.description}</p>
                  )}
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium text-gray-300 mb-1">Ингредиенты:</p>
                    <div className="flex flex-wrap gap-1">
                      {recipe.ingredients.map((item, idx) => (
                        <span key={idx} className="text-xs px-2 py-0.5 bg-gray-700 text-gray-300 rounded-full">
                          {item.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                {/* Кнопки действий */}
                <div className="flex space-x-2 pt-2 mt-auto border-t border-gray-700">
                  <button
                    onClick={() => onEditRecipe(recipe.id)}
                    className="flex-1 px-3 py-1.5 bg-blue-500/30 hover:bg-blue-500/50 text-blue-300 text-sm rounded transition-colors"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => handleDeleteRecipe(recipe.id)}
                    className="flex-1 px-3 py-1.5 bg-red-500/30 hover:bg-red-500/50 text-red-300 text-sm rounded transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
};

export default MixingRecipeListComponent;