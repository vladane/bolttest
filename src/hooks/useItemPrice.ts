import { useMemo } from 'react';
import { useBalance } from '../contexts/BalanceContext';
import type { ItemData } from '../contexts/BalanceContext';
import {
  calculateItemPrice,
  calculateSellPrice,
  calculateBuyPrice,
  calculateIngredientsCost,
  calculateCraftResultValue,
  CraftRecipe,
  CraftIngredient
} from '../utils/priceCalculation';

/**
 * Хук для реактивного расчета цены предмета на основе текущей конфигурации баланса
 */
export function useItemPrice(item: ItemData | null | undefined) {
  const { currentConfig } = useBalance();
  
  // Используем useMemo для кэширования результатов расчета
  // Пересчет будет происходить только при изменении item или currentConfig
  const prices = useMemo(() => {
    if (!item || !currentConfig) {
      return { basePrice: 0, sellPrice: 0, buyPrice: 0 };
    }
    
    const basePrice = calculateItemPrice(item, currentConfig);
    const sellPrice = calculateSellPrice(item, currentConfig);
    const buyPrice = calculateBuyPrice(item, currentConfig);
    
    return { basePrice, sellPrice, buyPrice };
  }, [item, currentConfig]);
  
  return prices;
}

/**
 * Хук для расчета стоимости рецепта и его ингредиентов
 */
export function useCraftPrice(recipe: CraftRecipe | null | undefined, itemsData: ItemData[]) {
  const { currentConfig } = useBalance();
  
  const craftValues = useMemo(() => {
    if (!recipe || !currentConfig || !itemsData || itemsData.length === 0) {
      return { 
        ingredientsCost: 0, 
        craftValue: 0, 
        profit: 0, 
        profitPercentage: 0,
        variantCosts: []
      };
    }
    
    // Рассчитываем стоимость ингредиентов для каждого варианта
    const variantCosts = recipe.variants.map(variant => {
      const cost = calculateIngredientsCost(variant.ingredients, itemsData, currentConfig);
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
    const craftValue = calculateCraftResultValue(recipe, itemsData, currentConfig);
    
    // Рассчитываем прибыль
    const profit = craftValue - ingredientsCost;
    const profitPercentage = ingredientsCost > 0 
      ? Math.round((profit / ingredientsCost) * 100) 
      : 0;
    
    return { 
      ingredientsCost, 
      craftValue, 
      profit, 
      profitPercentage,
      variantCosts
    };
  }, [recipe, itemsData, currentConfig]);
  
  return craftValues;
}

/**
 * Хук для расчета цен ингредиентов рецепта
 */
export function useIngredientPrices(
  ingredients: CraftIngredient[] | undefined,
  itemsData: ItemData[]
) {
  const { currentConfig } = useBalance();
  
  const ingredientDetails = useMemo(() => {
    if (!ingredients || !currentConfig || !itemsData) {
      return [];
    }
    
    return ingredients.map(ingredient => {
      const itemData = itemsData.find(item => item.name === ingredient.itemName);
      
      if (!itemData) {
        return {
          ...ingredient,
          unitPrice: 0,
          totalPrice: 0
        };
      }
      
      const unitPrice = calculateItemPrice(itemData, currentConfig);
      const totalPrice = unitPrice * ingredient.amount;
      
      return {
        ...ingredient,
        unitPrice,
        totalPrice
      };
    });
  }, [ingredients, itemsData, currentConfig]);
  
  return ingredientDetails;
}