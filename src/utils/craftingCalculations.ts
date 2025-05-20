// Маппинг между русскими и английскими названиями сложности - правильная типизация
const complexityMapping: Record<string, string> = {
  'Очень легко': 'Very Easy',
  'Легко': 'Easy',
  'Средне': 'Medium',
  'Сложно': 'Hard',
  'Очень сложно': 'Very Hard',
  'Very Easy': 'Очень легко',
  'Easy': 'Легко',
  'Medium': 'Средне',
  'Hard': 'Сложно',
  'Very Hard': 'Очень сложно'
};

// Расчет времени крафта на основе сложности с учетом ингредиентов
export function calculateCraftTime(
  complexityOrRecipe: string | any, 
  itemLevelOrItems: number | any[],
  config: any
): number {
  // Проверяем, был ли передан рецепт и данные предметов
  if (typeof complexityOrRecipe === 'object' && complexityOrRecipe !== null && 
      complexityOrRecipe.resultItemName && Array.isArray(itemLevelOrItems)) {
    // Новый формат вызова: calculateCraftTime(recipe, itemsData, config)
    const recipe = complexityOrRecipe;
    const itemsData = itemLevelOrItems;
    
    // Используем новую логику расчета, если craftTimeConfig доступен
    if (config && config.craftTimeConfig) {
      return calculateNewCraftTime(recipe, itemsData, config);
    }
    
    // Иначе, используем старый расчет
    const resultItem = itemsData.find(item => item.name === recipe.resultItemName);
    const complexity = resultItem?.craftComplexity || 'Средне';
    return calculateOldCraftTime(complexity, recipe.level || 1, config);
  }
  
  // Старый формат вызова: calculateCraftTime(complexity, itemLevel, config)
  // Исправляем проблему с типами - передаем только если itemLevelOrItems является числом
  if (typeof itemLevelOrItems === 'number') {
    return calculateOldCraftTime(complexityOrRecipe, itemLevelOrItems, config);
  } else {
    // Если это не число, используем значение по умолчанию (1)
    return calculateOldCraftTime(complexityOrRecipe, 1, config);
  }
}

// Старый метод расчета времени крафта
function calculateOldCraftTime(
  complexity: string, 
  itemLevel: number,
  config: any
): number {
  if (!complexity || !config || !config.craftComplexityTypes) return 60; // Значение по умолчанию
  
  // Получаем множитель сложности
  const complexityMultiplier = config.craftComplexityTypes[complexity] || 1;
  
  // Базовое время для крафта (в секундах)
  const baseTime = 30; 
  
  // Множитель от уровня предмета
  const levelMultiplier = 1 + ((itemLevel || 1) - 1) * 0.2;
  
  // Итоговое время
  return Math.round(baseTime * complexityMultiplier * levelMultiplier);
}

// Новый метод расчета времени крафта с учетом ингредиентов
function calculateNewCraftTime(
  recipe: any,
  itemsData: any[],
  config: any
): number {
  // Получаем детальную информацию о времени
  const timeDetails = getCraftTimeDetails(recipe, itemsData, config);
  return timeDetails.totalTime;
}

// Форматирование времени крафта в удобный формат
export function formatCraftTime(seconds: number, language: string = 'ru'): string {
  if (!seconds || seconds < 0) return language === 'en' ? '0 sec' : '0 сек';
  
  if (seconds < 60) {
    return language === 'en' ? `${seconds} sec` : `${seconds} сек`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    if (language === 'en') {
      return remainingSeconds > 0 
        ? `${minutes} min ${remainingSeconds} sec` 
        : `${minutes} min`;
    } else {
      return remainingSeconds > 0 
        ? `${minutes} мин ${remainingSeconds} сек` 
        : `${minutes} мин`;
    }
  } else if (seconds < 86400) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (language === 'en') {
      return minutes > 0 
        ? `${hours} h ${minutes} min` 
        : `${hours} h`;
    } else {
      return minutes > 0 
        ? `${hours} ч ${minutes} мин` 
        : `${hours} ч`;
    }
  } else {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (language === 'en') {
      return hours > 0 
        ? `${days} d ${hours} h` 
        : `${days} d`;
    } else {
      return hours > 0 
        ? `${days} д ${hours} ч` 
        : `${days} д`;
    }
  }
}

// Получение времени из конфигурации с учетом разных языковых вариантов
function getBaseTimeByComplexity(complexity: string, craftTimeConfig: any): number {
  // Проверяем, есть ли время для оригинального значения
  if (craftTimeConfig.baseTimesByComplexity[complexity] !== undefined) {
    return craftTimeConfig.baseTimesByComplexity[complexity];
  }
  
  // Проверяем, есть ли маппинг для этой сложности - исправляем индексацию
  if (complexity in complexityMapping) {
    const mappedComplexity = complexityMapping[complexity];
    if (mappedComplexity && craftTimeConfig.baseTimesByComplexity[mappedComplexity] !== undefined) {
      return craftTimeConfig.baseTimesByComplexity[mappedComplexity];
    }
  }
  
  // Возвращаем значение по умолчанию
  return 45;
}

// Определение интерфейса для варианта времени
interface VariantTimeDetails {
  variantId: string;
  time: number;
  breakdown?: Array<{
    itemName: string;
    amount: number;
    baseTime: number;
    categoryMultiplier: number;
    tierFactor: number;
    scaleFactor: number;
    totalTime: number;
  }>;
}

// Определение интерфейса для результата
interface CraftTimeDetails {
  baseTime: number;
  ingredientsTime: number; 
  totalTime: number;
  variantTimes: VariantTimeDetails[];
}

// Детальная информация о времени крафта
export function getCraftTimeDetails(
  recipe: any,
  itemsData: any[],
  config: any
): CraftTimeDetails {
  // Добавляем отладочную информацию
  console.log("getCraftTimeDetails - recipe:", recipe.name || recipe.resultItemName);
  console.log("getCraftTimeDetails - config:", config.craftTimeConfig);
  
  // Если нет craftTimeConfig, используем старую логику
  if (!config || !config.craftTimeConfig) {
    console.log("craftTimeConfig missing - using old calculation");
    const resultItem = itemsData.find(item => item.name === recipe.resultItemName);
    const complexity = resultItem?.craftComplexity || 'Средне';
    const itemLevel = recipe.level || 1;
    const craftTime = calculateOldCraftTime(complexity, itemLevel, config);
    return { baseTime: craftTime, ingredientsTime: 0, totalTime: craftTime, variantTimes: [] };
  }
  
  // Находим данные о результате
  const resultItem = itemsData.find(item => item.name === recipe.resultItemName);
  if (!resultItem) {
    console.log("Result item not found:", recipe.resultItemName);
    return { baseTime: 60, ingredientsTime: 0, totalTime: 60, variantTimes: [] };
  }
  
  const craftTimeConfig = config.craftTimeConfig;
  
  // Определяем базовое время из сложности с учетом возможных разных языков
  const complexity = resultItem.craftComplexity || 'Средне';
  const baseTime = getBaseTimeByComplexity(complexity, craftTimeConfig);
  
  // Множитель уровня
  const itemLevel = recipe.level || 1;
  const levelMultiplier = 1 + ((itemLevel - 1) * craftTimeConfig.levelMultiplier);
  
  // Базовое время с учетом сложности и уровня
  const baseProcessingTime = Math.round(baseTime * levelMultiplier);
  
  // Проверка на сезонные ограничения рецепта
  let seasonalMultiplier = 1.0;
  
  if (recipe.isSeasonDependent && config.currentSeason) {
    // Проверяем доступность рецепта в текущем сезоне
    if (recipe.availableSeasons && recipe.availableSeasons.length > 0) {
      if (!recipe.availableSeasons.includes(config.currentSeason)) {
        // Рецепт недоступен в текущем сезоне - увеличиваем время крафта
        seasonalMultiplier = 1.5; // Увеличиваем время на 50%
        console.log(`Рецепт недоступен в текущем сезоне (${config.currentSeason}), множитель времени: ${seasonalMultiplier}`);
      }
    }
    
    // Применяем сезонный модификатор, если он задан
    if (recipe.seasonalMultipliers && recipe.seasonalMultipliers[config.currentSeason]) {
      const recipeSeasonalMultiplier = recipe.seasonalMultipliers[config.currentSeason];
      seasonalMultiplier *= recipeSeasonalMultiplier;
      console.log(`Применяем сезонный модификатор рецепта для ${config.currentSeason}: ${recipeSeasonalMultiplier}`);
    }
  }
  
  // Расчет времени для каждого варианта с детализацией
  const variantTimes: VariantTimeDetails[] = [];
  
  if (recipe.variants && recipe.variants.length > 0) {
    for (const variant of recipe.variants) {
      if (!variant.ingredients || !Array.isArray(variant.ingredients)) {
        variantTimes.push({ variantId: variant.id, time: 0, breakdown: [] });
        continue;
      }
      
      let variantTime = 0;
      const breakdown: Array<{
        itemName: string;
        amount: number;
        baseTime: number;
        categoryMultiplier: number;
        tierFactor: number;
        scaleFactor: number;
        totalTime: number;
      }> = [];
      
      // Проверяем наличие сезонных ингредиентов
      let hasSeasonalIngredients = false;
      
      for (const ing of variant.ingredients) {
        if (!ing.itemName || !ing.amount) continue;
        
        // Находим данные об ингредиенте
        const ingredient = itemsData.find(item => item.name === ing.itemName);
        if (!ingredient) continue;
        
        // Проверяем, является ли ингредиент сезонным урожаем
        if (ingredient.isHarvest && ingredient.growingSeason && config.currentSeason) {
          // Проверка доступности ингредиента в текущем сезоне
          if (!ingredient.growingSeason.includes(config.currentSeason)) {
            hasSeasonalIngredients = true;
            console.log(`Ингредиент ${ing.itemName} - сезонный и недоступен в текущем сезоне`);
          }
        }
        
        // Базовое время обработки ингредиента
        let processingTime = craftTimeConfig.ingredientBaseTime;
        
        // Учитываем множитель категории
        let categoryMultiplier = 1;
        if (ingredient.selectedCategories && ingredient.selectedCategories.length > 0) {
          // Находим множители для категорий этого ингредиента
          const categoryMultipliers = ingredient.selectedCategories.map((cat: string) => 
            craftTimeConfig.categoryTimeMultipliers[cat] || 1
          );
          
          // Если есть хотя бы один множитель, рассчитываем среднее
          if (categoryMultipliers.length > 0) {
            categoryMultiplier = categoryMultipliers.reduce((sum: number, val: number) => sum + val, 0) / 
                                categoryMultipliers.length;
          }
          
          processingTime *= categoryMultiplier;
        }
        
        // Учитываем тир предмета
        const tierFactor = 1 + ((ingredient.tier || 1) - 1) * 0.2;
        processingTime *= tierFactor;
        
        // Увеличиваем время обработки для сезонных ингредиентов, недоступных в текущем сезоне
        if (ingredient.isHarvest && ingredient.growingSeason && config.currentSeason) {
          if (!ingredient.growingSeason.includes(config.currentSeason)) {
            processingTime *= 1.3; // Увеличиваем время на 30%
          }
        }
        
        // Учитываем количество с масштабированием
        const scaleFactor = Math.pow(ing.amount, craftTimeConfig.ingredientScalingFactor);
        const ingredientTime = Math.round(processingTime * scaleFactor);
        
        variantTime += ingredientTime;
        
        breakdown.push({
          itemName: ing.itemName,
          amount: ing.amount,
          baseTime: craftTimeConfig.ingredientBaseTime,
          categoryMultiplier,
          tierFactor,
          scaleFactor,
          totalTime: ingredientTime
        });
      }
      
      // Применяем сезонный множитель, если это необходимо
      if (hasSeasonalIngredients) {
        variantTime = Math.round(variantTime * 1.2); // Увеличиваем время варианта с сезонными ингредиентами на 20%
      }
      
      variantTimes.push({
        variantId: variant.id,
        time: variantTime,
        breakdown
      });
    }
  }
  
  // Находим минимальное время варианта
  const variantMinTime = variantTimes.length > 0 
    ? Math.min(...variantTimes.map(v => v.time)) 
    : 0;
  
  // Итоговое время: базовое время + время ингредиентов, с учетом сезонных модификаторов
  const totalTime = Math.round((baseProcessingTime + variantMinTime) * seasonalMultiplier);
  
  return {
    baseTime: baseProcessingTime,
    ingredientsTime: variantMinTime,
    totalTime,
    variantTimes
  };
}

// Расчет оптимального количества ингредиентов
export function calculateIngredientAmount(
  resultItemValue: number,
  resultAmount: number,
  ingredientItemValue: number,
  ingredientWeight: number = 1
): number {
  if (!resultItemValue || !ingredientItemValue || resultItemValue <= 0 || ingredientItemValue <= 0) {
    return 1; // Значение по умолчанию при неверных входных данных
  }
  
  // Формула для расчета: учитывает ценность ингредиента и результата, 
  // а также вес ингредиента в рецепте
  
  // Чем ценнее ингредиент, тем меньше его требуется
  // Чем ценнее результат, тем больше ингредиентов нужно
  
  const rawAmount = (resultItemValue * resultAmount * ingredientWeight) / ingredientItemValue;
  
  // Округляем до целого числа (минимум 1)
  return Math.max(1, Math.ceil(rawAmount));
}

// Расчет общей стоимости ингредиентов
export function calculateTotalIngredientsCost(
  ingredients: { itemName: string; amount: number }[],
  getItemValue: (itemName: string) => number
): number {
  if (!ingredients || ingredients.length === 0) return 0;
  
  let totalCost = 0;
  
  ingredients.forEach(ingredient => {
    if (!ingredient.itemName || ingredient.amount <= 0) return;
    const itemValue = getItemValue(ingredient.itemName);
    totalCost += itemValue * ingredient.amount;
    
    // Отладочная информация
    console.log(`Ингредиент ${ingredient.itemName} x${ingredient.amount}: стоимость = ${itemValue}, всего = ${itemValue * ingredient.amount}`);
  });
  
  console.log(`Общая стоимость ингредиентов: ${totalCost}`);
  return totalCost;
}

// Расчет прибыли от крафта
export function calculateCraftProfit(
  resultItemName: string,
  resultAmount: number,
  ingredients: { itemName: string; amount: number }[],
  getItemValue: (itemName: string) => number
): number {
  if (!resultItemName || !ingredients) return 0;
  
  try {
    const resultValue = getItemValue(resultItemName) * resultAmount;
    console.log(`Стоимость результата ${resultItemName} x${resultAmount}: ${resultValue}`);
    
    const ingredientsCost = calculateTotalIngredientsCost(ingredients, getItemValue);
    const profit = resultValue - ingredientsCost;
    
    console.log(`Прибыль: ${profit} (${resultValue} - ${ingredientsCost})`);
    return profit;
  } catch (error) {
    console.error("Ошибка расчета прибыли:", error);
    return 0;
  }
}

// Расчет эффективности (прибыль/время)
export function calculateEfficiency(
  profit: number,
  craftTime: number
): number {
  if (craftTime <= 0 || !craftTime) return 0;
  // Прибыль в минуту
  return (profit / craftTime) * 60;
}

// Расчет ROI (Return on Investment)
export function calculateROI(
  profit: number,
  totalCost: number
): number {
  if (totalCost <= 0 || !totalCost) return 0;
  return profit / totalCost;
}

// Вспомогательная функция для проверки наличия всех необходимых свойств в рецепте
export function isValidRecipe(recipe: any): boolean {
  return Boolean(
    recipe && 
    recipe.name && 
    recipe.resultItemName && 
    recipe.variants && 
    Array.isArray(recipe.variants) &&
    recipe.variants.length > 0
  );
}

// Проверка доступности рецепта в текущем сезоне
export function isRecipeAvailableInSeason(recipe: any, currentSeason: string): boolean {
  if (!recipe || !currentSeason) return true;
  
  // Если рецепт не зависит от сезона, он всегда доступен
  if (!recipe.isSeasonDependent) return true;
  
  // Если список доступных сезонов пуст, рецепт доступен во всех сезонах
  if (!recipe.availableSeasons || recipe.availableSeasons.length === 0) return true;
  
  // Проверяем, включен ли текущий сезон в список доступных
  return recipe.availableSeasons.includes(currentSeason);
}

// Получение сезонного модификатора стоимости для рецепта
export function getRecipeSeasonalCostMultiplier(recipe: any, currentSeason: string): number {
  if (!recipe || !currentSeason || !recipe.isSeasonDependent) return 1.0;
  
  // Проверяем доступность рецепта в сезоне
  if (recipe.availableSeasons && recipe.availableSeasons.length > 0) {
    if (!recipe.availableSeasons.includes(currentSeason)) {
      // Рецепт недоступен в текущем сезоне, значительно увеличиваем стоимость
      return 2.0; // Удваиваем стоимость
    }
  }
  
  // Применяем сезонный модификатор, если он задан
  if (recipe.seasonalMultipliers && recipe.seasonalMultipliers[currentSeason]) {
    return recipe.seasonalMultipliers[currentSeason];
  }
  
  return 1.0; // По умолчанию нейтральный модификатор
}