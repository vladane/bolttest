import { useState, useMemo } from 'react';
import { CraftRecipe } from '../../../contexts/AppStateContext';
import { useAppState } from '../../../contexts/AppStateContext';
import { formatCraftTime, calculateCraftTime, getCraftTimeDetails } from '../../../utils/craftingCalculations';
import { useBalance } from '../../../contexts/BalanceContext';
import { 
  calculateIngredientsCost, 
  calculateCraftResultValue 
} from '../../../utils/priceCalculation';

interface RecipeListProps {
  recipes?: CraftRecipe[];
  onSelectRecipe?: (recipeId: string) => void;
  selectedRecipeId?: string | null;
}

export default function RecipeList({ 
  recipes: propRecipes, 
  onSelectRecipe: propOnSelectRecipe, 
  selectedRecipeId: propSelectedRecipeId 
}: RecipeListProps = {}) {
  const { state } = useAppState();
  const balance = useBalance();
  const [searchTerm, setSearchTerm] = useState('');
  const [internalSelectedRecipeId, setInternalSelectedRecipeId] = useState<string | null>(null);
  
  // Используем пропсы, если они предоставлены, иначе используем внутреннее состояние
  const recipes = propRecipes || state.craftSystem.recipes || [];
  const selectedRecipeId = propSelectedRecipeId !== undefined ? propSelectedRecipeId : internalSelectedRecipeId;
  
  // Обработчик выбора рецепта
  const handleSelectRecipe = (recipeId: string) => {
    if (propOnSelectRecipe) {
      propOnSelectRecipe(recipeId);
    } else {
      setInternalSelectedRecipeId(recipeId);
    }
  };
  
  // Улучшенная функция для получения URL изображения
  const getImageUrl = (imageId: string | null): string | null => {
    if (!imageId) return null;
    
    try {
      // Проверяем imageMap в resources
      const resourceImage = state.resources.imageMap?.get(imageId);
      if (resourceImage) {
        // Проверяем, содержит ли данные уже data:image формат
        if (typeof resourceImage.data === 'string' && resourceImage.data.startsWith('data:')) {
          return resourceImage.data;
        }
        return `data:${resourceImage.type};base64,${resourceImage.data}`;
      }
      
      // Проверяем imageMap в units
      const unitImage = state.units.imageMap?.get(imageId);
      if (unitImage) {
        // Проверяем, содержит ли данные уже data:image формат
        if (typeof unitImage.data === 'string' && unitImage.data.startsWith('data:')) {
          return unitImage.data;
        }
        return `data:${unitImage.type};base64,${unitImage.data}`;
      }
      
      // Проверяем imageMap в balance.comparisonItems (если есть)
      // Удаляем проверку на imageUrl, так как это свойство не существует в типе ItemData
      
      return null;
    } catch (error) {
      console.error(`Ошибка при получении URL изображения (ID: ${imageId}):`, error);
      return null;
    }
  };
  
  // Функция для получения изображения по имени предмета
  const getItemImageByName = (itemName: string): string | null => {
    // Сначала ищем в рецептах (может быть это результат рецепта)
    const recipeWithImage = recipes.find(r => 
      r.resultItemName === itemName && r.imageId
    );
    if (recipeWithImage?.imageId) {
      return getImageUrl(recipeWithImage.imageId);
    }
    
    // Ищем в предметах баланса
    const balanceItem = state.balance.comparisonItems.find(i => i.name === itemName);
    if (balanceItem?.imageId) {
      return getImageUrl(balanceItem.imageId);
    }
    
    // Ищем в ресурсах
    const resourceItem = state.resources.items.find(r => r.name === itemName);
    if (resourceItem?.imageId) {
      return getImageUrl(resourceItem.imageId);
    }
    
    return null;
  };
  
  // Собираем все доступные предметы для расчета цен
  const allItems = useMemo(() => {
    // Преобразуем ресурсы в формат ItemData для расчетов
    const resourceItems = state.resources.items.map(item => ({
      name: item.name,
      tier: 1,
      mechanic: 'Найти в мире',
      selectedCategories: [item.category],
      selectedModifiers: [],
      selectedLocations: [],
      frequencyType: 'Часто встречаемый',
      craftComplexity: 'Не крафтиться',
      imageId: item.imageId || null // Добавляем поле imageId для соответствия типу ItemData
    }));
    
    // Объединяем с предметами из сравнения
    return [...state.balance.comparisonItems, ...resourceItems];
  }, [state.resources.items, state.balance.comparisonItems]);
  
  // Получение тира предмета по имени
  const getItemTier = (itemName: string): number => {
    const item = allItems.find(i => i.name === itemName);
    return item?.tier || 1;
  };
  
  // Получение сложности крафта предмета по имени
  const getItemComplexity = (itemName: string): string => {
    const item = allItems.find(i => i.name === itemName);
    return item?.craftComplexity || 'Средне';
  };
  
  // Фильтрация рецептов по поисковому запросу
  const filteredRecipes = recipes?.filter(recipe => 
    recipe.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    recipe.resultItemName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Сортировка рецептов: сначала выбранный, затем по имени
  const sortedRecipes = [...filteredRecipes].sort((a, b) => {
    if (a.id === selectedRecipeId) return -1;
    if (b.id === selectedRecipeId) return 1;
    return a.name.localeCompare(b.name);
  });
  
  // Предварительный расчет данных для всех рецептов
  // Вместо вызова хука для каждого рецепта в map, мы вычисляем все данные заранее
  const recipesWithPrices = useMemo(() => {
    return sortedRecipes.map(recipe => {
      // Рассчитываем стоимость ингредиентов для каждого варианта
      const variantCosts = recipe.variants.map(variant => {
        const cost = calculateIngredientsCost(variant.ingredients, allItems, balance.currentConfig);
        return {
          id: variant.id,
          name: variant.name,
          cost
        };
      });
      
      // Общая стоимость - минимальная из всех вариантов
      const ingredientsCost = variantCosts.length > 0 
        ? Math.min(...variantCosts.map(v => v.cost))
        : 0;
      
      // Итоговая стоимость крафта с учетом множителей
      const craftValue = calculateCraftResultValue(recipe, allItems, balance.currentConfig);
      
      // Рассчитываем прибыль
      const profit = craftValue - ingredientsCost;
      const tier = getItemTier(recipe.resultItemName);
      
      // Рассчитываем время крафта с использованием новой системы
      let craftTime;
      try {
        // Используем новую функцию для получения деталей времени
        const timeDetails = getCraftTimeDetails(
          recipe,
          allItems,
          balance.currentConfig
        );
        
        // Форматируем общее время
        craftTime = formatCraftTime(timeDetails.totalTime);
      } catch (error) {
        console.error("Error calculating craft time for", recipe.name, ":", error);
        
        // Запасной вариант - старый метод
        const complexity = getItemComplexity(recipe.resultItemName);
        const timeSecs = calculateCraftTime(
          complexity,
          recipe.level,
          balance.currentConfig
        );
        craftTime = formatCraftTime(timeSecs);
      }
      
      // Получаем изображение рецепта или изображение результирующего предмета
      const recipeImageUrl = getImageUrl(recipe.imageId);
      const resultItemImageUrl = getItemImageByName(recipe.resultItemName);
      const imageUrl = recipeImageUrl || resultItemImageUrl;
      
      return {
        recipe,
        tier,
        ingredientsCost,
        craftValue,
        profit,
        craftTime,
        imageUrl // Добавляем URL изображения
      };
    });
  }, [sortedRecipes, allItems, balance.currentConfig, getItemTier]);
  
  // Получение иконки категории
  const getCategoryIcon = (category: string): string => {
    const icons: Record<string, string> = {
      'Оружие': '⚔️',
      'Броня': '🛡️',
      'Еда': '🍲',
      'Ресурсы': '🧰',
      'Инструменты': '🔨',
      'Алхимия': '⚗️',
      'Магия': '✨',
      'Прочее': '📦'
    };
    return icons[category] || '📄';
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-300 dark:border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Recipe List</h2>
        <button
          onClick={() => handleSelectRecipe('')}
          className="px-3 py-1 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
        >
          New Recipe
        </button>
      </div>
      
      {/* Поиск */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search recipes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        />
      </div>
      
      {/* Список рецептов */}
      <div className="space-y-3 overflow-y-auto max-h-[calc(100vh-280px)]">
        {sortedRecipes.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400 border border-dashed border-gray-500 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/30">
            No recipes found. Create your first recipe!
          </div>
        ) : (
          recipesWithPrices.map(({ recipe, tier, profit, craftTime, imageUrl }) => (
            <div
              key={recipe.id}
              className={`p-3 rounded-lg border ${
                recipe.id === selectedRecipeId
                  ? 'border-primary bg-primary/5 dark:bg-primary/10'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
              } hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors cursor-pointer`}
              onClick={() => handleSelectRecipe(recipe.id)}
            >
              <div className="flex justify-between items-start">
                <div className="flex items-start space-x-3">
                  {/* Отображаем изображение, если оно есть */}
                  <div className="w-10 h-10 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-md text-lg overflow-hidden">
                    {imageUrl ? (
                      <img 
                        src={imageUrl} 
                        alt={recipe.name} 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      getCategoryIcon(recipe.category)
                    )}
                  </div>
                  <div>
                    <h3 className="font-medium">{recipe.name}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                      <span>
                        Result: {recipe.resultAmount}x {recipe.resultItemName}
                      </span>
                      <span className="mx-1 text-xs px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-300 ml-2">
                        T{tier}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Индикатор прибыльности */}
                <div className={`text-sm font-medium px-2 py-1 rounded ${
                  profit > 0 
                    ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                    : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                }`}>
                  {profit > 0 ? '+' : ''}{Math.round(profit)}
                </div>
              </div>
              
              {/* Детали рецепта */}
              <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-500 dark:text-gray-400">
                <div>
                  <span className="inline-block mr-1">⏱️</span>
                  {craftTime}
                </div>
                <div>
                  <span className="inline-block mr-1">🔄</span>
                  {recipe.variants.length} variant{recipe.variants.length !== 1 ? 's' : ''}
                </div>
                
                {/* Основные ингредиенты (только для первого варианта) */}
                {recipe.variants.length > 0 && recipe.variants[0].ingredients.length > 0 && (
                  <div className="col-span-2 mt-1 pt-1 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {recipe.variants[0].ingredients.slice(0, 3).map(ing => {
                        // Получаем изображение ингредиента
                        const ingredientImageUrl = getItemImageByName(ing.itemName);
                        
                        return (
                          <span 
                            key={ing.itemName} 
                            className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded flex items-center"
                          >
                            {ingredientImageUrl && (
                              <div className="w-4 h-4 mr-1 rounded-full overflow-hidden">
                                <img 
                                  src={ingredientImageUrl} 
                                  alt={ing.itemName} 
                                  className="w-full h-full object-cover" 
                                />
                              </div>
                            )}
                            {ing.itemName} ({ing.amount}x)
                          </span>
                        );
                      })}
                      {recipe.variants[0].ingredients.length > 3 && (
                        <span className="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded">
                          +{recipe.variants[0].ingredients.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}