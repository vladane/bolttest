import { BalanceConfig, ItemData } from '../contexts/BalanceContext';

/**
 * Рассчитывает базовую цену предмета на основе конфигурации баланса
 */
export function calculateItemPrice(item: ItemData, config: BalanceConfig): number {
  // Если у предмета есть craftValue и он является крафтовым, используем его
  if (item.craftValue !== undefined && item.craftValue > 0 && item.hasCraftRecipe === true) {
    return item.craftValue;
  }
  
  // Расчет влияния категорий
  const categorySum = item.selectedCategories.reduce((sum: number, cat: string) => {
    return sum + (config.categories[cat] || 0);
  }, 0);
  
  // Компонент категорий
  const categoryComponent = config.weights.categoryWeight * 
    (item.selectedCategories.length > 0 ? categorySum / item.selectedCategories.length : 0);
  
  // Компонент тира (уровня)
  const tierComponent = config.weights.tierWeight * 
    (1 + (item.tier - 1) * config.tierMultiplier);
  
  // Компонент механики
  const mechanicComponent = config.weights.mechanicWeight * 
    (config.mechanics[item.mechanic] || 1);
  
  // Компонент модификаторов
  const modifiersSum = item.selectedModifiers.reduce((sum: number, mod: string) => {
    return sum + (config.modifiers[mod] || 0);
  }, 0);
  
  const modifiersComponent = config.weights.modifiersWeight * 
    (item.selectedModifiers.length > 0 ? modifiersSum / item.selectedModifiers.length : 1);
    
  // Компонент локаций
  const locationsSum = item.selectedLocations.reduce((sum: number, loc: string) => {
    return sum + (config.locations[loc] || 0);
  }, 0);
  
  const locationsComponent = config.weights.locationsWeight * 
    (item.selectedLocations.length > 0 ? locationsSum / item.selectedLocations.length : 1);
  
  // Добавляем расчет для новых модификаторов
  const frequencyComponent = config.weights.frequencyWeight * 
    (config.frequencyTypes[item.frequencyType] || 1.0);
  
  const craftComplexityComponent = config.weights.craftComplexityWeight * 
    (config.craftComplexityTypes[item.craftComplexity] || 1.0);
  
  // Итоговый расчет
  const total = config.baseValue * 
    (categoryComponent + tierComponent + mechanicComponent + modifiersComponent + 
    locationsComponent + frequencyComponent + craftComplexityComponent);
  
  return Math.round(total);
}

/**
 * Возвращает цену продажи предмета с учетом скидки
 */
export function calculateSellPrice(item: ItemData, config: BalanceConfig): number {
  const basePrice = calculateItemPrice(item, config);
  // Применяем скидку при продаже
  return Math.round(basePrice * (1 - config.sellDiscount));
}

/**
 * Возвращает цену покупки предмета с учетом наценки
 */
export function calculateBuyPrice(item: ItemData, config: BalanceConfig): number {
  const basePrice = calculateItemPrice(item, config);
  // Применяем наценку при покупке
  return Math.round(basePrice * (1 + config.buyMarkup));
}

/**
 * Интерфейс для ингредиента рецепта
 */
export interface CraftIngredient {
  itemName: string;
  amount: number;
}

/**
 * Интерфейс для варианта рецепта
 */
export interface CraftVariant {
  id: string;
  name: string;
  ingredients: CraftIngredient[];
}

/**
 * Интерфейс для рецепта крафта
 */
export interface CraftRecipe {
  id: string;
  name: string;
  resultItemName: string;
  resultAmount: number;
  variants: CraftVariant[];
  category?: string;
  level?: number;
  imageId?: string | null;
}

/**
 * Рассчитывает стоимость ингредиентов рецепта
 */
export function calculateIngredientsCost(
  ingredients: CraftIngredient[], 
  itemsData: ItemData[], 
  config: BalanceConfig
): number {
  return ingredients.reduce((total, ingredient) => {
    // Находим данные по имени предмета
    const itemData = itemsData.find(item => item.name === ingredient.itemName);
    
    if (itemData) {
      // Рассчитываем цену предмета и умножаем на количество
      return total + (calculateItemPrice(itemData, config) * ingredient.amount);
    }
    
    return total;
  }, 0);
}

/**
 * Рассчитывает стоимость крафта на основе ингредиентов
 */
export function calculateCraftingCost(
  recipe: CraftRecipe, 
  itemsData: ItemData[], 
  config: BalanceConfig
): number {
  if (!recipe.variants || recipe.variants.length === 0) {
    return 0;
  }
  
  // Находим вариант с минимальной стоимостью ингредиентов
  const costs = recipe.variants.map(variant => 
    calculateIngredientsCost(variant.ingredients, itemsData, config)
  );
  
  return Math.min(...costs);
}

/**
 * Рассчитывает полную стоимость результата крафта с учетом множителя прибыли
 */
export function calculateCraftResultValue(
  recipe: CraftRecipe, 
  itemsData: ItemData[], 
  config: BalanceConfig
): number {
  // Базовая стоимость крафта (ингредиенты)
  const baseCost = calculateCraftingCost(recipe, itemsData, config);
  
  // Найдем сложность крафта предмета
  const resultItem = itemsData.find(item => item.name === recipe.resultItemName);
  const craftComplexity = resultItem?.craftComplexity || 'Не крафтиться';
  
  // Получим множитель сложности
  const complexityMultiplier = config.craftComplexityTypes[craftComplexity] || 1;
  
  // Добавляем множитель базовой прибыли и сложности
  const profitMultiplier = config.craftBaseMultiplier + 
    (complexityMultiplier * config.craftComplexityMultiplier);
  
  // Рассчитываем итоговую цену с учетом количества получаемых предметов
  return Math.round(baseCost * profitMultiplier);
}