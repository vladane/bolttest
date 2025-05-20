import { useState, useEffect, useRef, useMemo } from 'react';
import { useAppState } from '../../../contexts/AppStateContext';
import { CraftRecipe } from '../../../contexts/AppStateContext';
import { 
  calculateCraftTime, 
  formatCraftTime, 
  calculateIngredientAmount,
  getCraftTimeDetails 
} from '../../../utils/craftingCalculations';
import { useBalance } from '../../../contexts/BalanceContext';
import SearchableSelect from '../../common/SearchableSelect';

interface RecipeFormProps {
  selectedRecipeId: string | null;
  onRecipeSaved: () => void;
}

interface CraftTimeDetail {
  baseTime: number;
  ingredientsTime: number;
  totalTime: number;
  variantTimes: Array<{
    variantId: string;
    time: number;
    breakdown?: Array<{
      itemName: string;
      amount: number;
      totalTime: number;
    }>;
  }>;
}

interface Ingredient {
  itemName: string;
  amount: number;
}

export default function RecipeForm({ selectedRecipeId, onRecipeSaved }: RecipeFormProps) {
  const { state, updateState } = useAppState();
  const balance = useBalance();
  const [formData, setFormData] = useState<{
    name: string;
    resultItemName: string;
    resultAmount: number;
    category: string;
    level: number;
    currentVariant: number;
    variants: {
      id: string;
      name: string;
      ingredients: {
        itemName: string;
        amount: number;
      }[];
      fuelItems?: { // Новое поле для топлива
        itemName: string;
        amount: number;
      }[];
    }[];
    // Поля для сезонности
    isSeasonDependent: boolean;
    availableSeasons: string[];
    seasonalMultipliers: Record<string, number>;
    // Новое поле для печи
    requiresFuel: boolean; // Требуется ли топливо для крафта в печи
  }>({
    name: '',
    resultItemName: '',
    resultAmount: 1,
    category: '',
    level: 1,
    currentVariant: 0,
    variants: [{
      id: 'new-variant',
      name: 'Standard',
      ingredients: [],
      fuelItems: [] // Инициализируем пустым массивом
    }],
    // Инициализация полей
    isSeasonDependent: false,
    availableSeasons: [],
    seasonalMultipliers: {},
    requiresFuel: false // Инициализируем как false
  });
  
  const ingredientsRef = useRef<{itemName: string; amount: number}[][]>([]);
  const fuelItemsRef = useRef<{itemName: string; amount: number}[][]>([]); // Новый ref для топлива
  // Объект для хранения деталей времени крафта
  const craftTimeDetails = useRef<CraftTimeDetail>({
    baseTime: 0,
    ingredientsTime: 0,
    totalTime: 0,
    variantTimes: []
  });
  // Состояние для отображения деталей времени крафта
  const [showTimeDetails, setShowTimeDetails] = useState(false);
  
  // Получаем список сезонов из контекста баланса
  const seasons = balance.currentConfig.seasons || ['Весна', 'Лето', 'Осень', 'Зима'];
  
  // Отслеживаем изменения в результатах рецептов для автоматического сброса
  useEffect(() => {
    // Создаем список всех предметов, которые являются результатами рецептов
    const itemsWithRecipes = new Set<string>();
    state.craftSystem.recipes.forEach(recipe => {
      if (recipe.resultItemName) {
        itemsWithRecipes.add(recipe.resultItemName);
      }
    });
    
    // Проверяем все предметы и сбрасываем craftValue для тех, 
    // которые не являются результатами рецептов, но имеют флаг hasCraftRecipe
    const updatedItems = state.balance.comparisonItems.map(item => {
      if (item.hasCraftRecipe && !itemsWithRecipes.has(item.name)) {
        console.log(`Автоматически сбрасываем craftValue для ${item.name}, т.к. нет рецепта`);
        return {
          ...item,
          craftValue: undefined,
          hasCraftRecipe: false
        };
      }
      return item;
    });
    
    // Обновляем список предметов, если были изменения
    const hasChanges = updatedItems.some((item, idx) => 
      item.hasCraftRecipe !== state.balance.comparisonItems[idx].hasCraftRecipe ||
      item.craftValue !== state.balance.comparisonItems[idx].craftValue
    );
    
    if (hasChanges) {
      console.log("Обновляем список предметов из-за изменений hasCraftRecipe или craftValue");
      updateState('balance.comparisonItems', updatedItems);
    }
  }, [state.craftSystem.recipes]);
  
  // Загрузка рецепта при изменении selectedRecipeId
  useEffect(() => {
    if (selectedRecipeId) {
      const selectedRecipe = state.craftSystem.recipes.find(r => r.id === selectedRecipeId);
      if (selectedRecipe) {
        const variants = selectedRecipe.variants.map(v => ({
          id: v.id,
          name: v.name,
          ingredients: v.ingredients.map(i => ({
            itemName: i.itemName,
            amount: i.amount
          })),
          fuelItems: v.fuelItems ? v.fuelItems.map(f => ({
            itemName: f.itemName,
            amount: f.amount
          })) : [] // Загружаем топливо, если оно есть
        }));
        
        setFormData({
          name: selectedRecipe.name,
          resultItemName: selectedRecipe.resultItemName,
          resultAmount: selectedRecipe.resultAmount,
          category: selectedRecipe.category,
          level: selectedRecipe.level,
          currentVariant: 0,
          variants,
          // Загружаем поля сезонности
          isSeasonDependent: selectedRecipe.isSeasonDependent || false,
          availableSeasons: selectedRecipe.availableSeasons || [],
          seasonalMultipliers: selectedRecipe.seasonalMultipliers || {},
          // Загружаем поле для печи
          requiresFuel: selectedRecipe.requiresFuel || false
        });
        
        ingredientsRef.current = variants.map(v => [...v.ingredients]);
        fuelItemsRef.current = variants.map(v => [...(v.fuelItems || [])]); // Сохраняем топливо в ref
      }
    } else {
      setFormData({
        name: '',
        resultItemName: '',
        resultAmount: 1,
        category: '',
        level: 1,
        currentVariant: 0,
        variants: [{
          id: 'new-variant',
          name: 'Standard',
          ingredients: [],
          fuelItems: []
        }],
        isSeasonDependent: false,
        availableSeasons: [],
        seasonalMultipliers: {},
        requiresFuel: false
      });
      
      ingredientsRef.current = [[]];
      fuelItemsRef.current = [[]];
    }
  }, [selectedRecipeId, state.craftSystem.recipes]);
  
  const balanceItems = state.balance.comparisonItems;
  
  // Получаем список топлива
  const fuelItems = useMemo(() => {
    return balanceItems.filter(item => item.isFuel);
  }, [balanceItems]);
  
  // Полный сброс craftValue и hasCraftRecipe
  const resetAllCraftValues = async () => {
    console.log("ПОЛНЫЙ СБРОС craftValue и hasCraftRecipe для ВСЕХ предметов");
    
    // Сначала полностью сбрасываем все значения
    const resetItems = state.balance.comparisonItems.map(item => ({
      ...item,
      hasCraftRecipe: false,
      craftValue: undefined
    }));
    
    await new Promise<void>((resolve) => {
      updateState('balance.comparisonItems', resetItems);
      setTimeout(resolve, 200); // Ждем полсекунды для обновления
    });
    
    console.log("СБРОС завершен");
    
    // Затем восстанавливаем hasCraftRecipe для предметов с рецептами
    const itemsWithRecipes = new Set<string>();
    state.craftSystem.recipes.forEach(recipe => {
      if (recipe.resultItemName) {
        itemsWithRecipes.add(recipe.resultItemName);
      }
    });
    
    const updateItems = state.balance.comparisonItems.map(item => {
      if (itemsWithRecipes.has(item.name)) {
        console.log(`Восстанавливаем hasCraftRecipe для ${item.name}`);
        return {
          ...item,
          hasCraftRecipe: true
        };
      }
      return item;
    });
    
    await new Promise<void>((resolve) => {
      updateState('balance.comparisonItems', updateItems);
      setTimeout(resolve, 200); // Ждем еще полсекунды для обновления
    });
    
    console.log("Восстановление hasCraftRecipe завершено");
  };
  
  // Расчет craftValue для результата рецепта
  const calculateCraftValueForResult = async () => {
    console.log("Расчет craftValue для результата рецепта:", formData.resultItemName);
    
    if (!formData.resultItemName || !formData.variants.length) {
      console.log("Нет результата или вариантов рецепта");
      return;
    }
    
    const resultItem = state.balance.comparisonItems.find(i => i.name === formData.resultItemName);
    if (!resultItem) {
      console.log("Не найден предмет результата:", formData.resultItemName);
      return;
    }
    
    const craftBaseMultiplier = state.balance.currentConfig.craftBaseMultiplier !== undefined 
      ? state.balance.currentConfig.craftBaseMultiplier 
      : 1.2;
    const craftComplexityMultiplier = state.balance.currentConfig.craftComplexityMultiplier !== undefined
      ? state.balance.currentConfig.craftComplexityMultiplier
      : 0.1;
    
    const craftComplexity = resultItem.craftComplexity || 'Средне';
    const craftComplexityValue = state.balance.currentConfig.craftComplexityTypes[craftComplexity] || 1;
    
    const variantCosts = formData.variants.map(variant => {
      if (!variant.ingredients.length) return Infinity;
      
      // Расчет стоимости ингредиентов
      const ingredientsCost = variant.ingredients.reduce((total: number, ing: Ingredient) => {
        if (!ing.itemName) return total;
        
        const ingredient = state.balance.comparisonItems.find(i => i.name === ing.itemName);
        if (!ingredient) return total;
        
        let value = balance.calculateItemCost(ingredient);
        
        // Проверяем, является ли ингредиент сезонным урожаем
        if (ingredient.isHarvest && ingredient.growingSeason && balance.currentConfig.currentSeason) {
          // Проверка доступности ингредиента-урожая в текущем сезоне
          if (!ingredient.growingSeason.includes(balance.currentConfig.currentSeason)) {
            console.log(`Ингредиент ${ing.itemName} - сезонный и недоступен в текущем сезоне, стоимость увеличена`);
            // Если ингредиент недоступен в текущем сезоне, используем сезонную стоимость
            value = balance.calculateSeasonalItemCost(ingredient);
          }
        }
        
        const cost = value * ing.amount;
        console.log(`Ингредиент ${ing.itemName} x${ing.amount}: стоимость ${value}, всего ${cost}`);
        
        return total + cost;
      }, 0);
      
      // Расчет стоимости топлива, если оно требуется
      let fuelCost = 0;
      if (formData.requiresFuel && variant.fuelItems && variant.fuelItems.length > 0) {
        fuelCost = variant.fuelItems.reduce((total: number, fuel: Ingredient) => {
          if (!fuel.itemName) return total;
          
          const fuelItem = state.balance.comparisonItems.find(i => i.name === fuel.itemName);
          if (!fuelItem) return total;
          
          const value = balance.calculateItemCost(fuelItem);
          const cost = value * fuel.amount;
          console.log(`Топливо ${fuel.itemName} x${fuel.amount}: стоимость ${value}, всего ${cost}`);
          
          return total + cost;
        }, 0);
      }
      
      // Общая стоимость ингредиентов и топлива
      const totalCost = ingredientsCost + fuelCost;
      console.log(`Стоимость варианта ${variant.name}: ингредиенты=${ingredientsCost}, топливо=${fuelCost}, всего=${totalCost}`);
      return totalCost;
    }).filter(cost => cost !== Infinity);
    
    if (!variantCosts.length) {
      console.log("Нет вариантов с ингредиентами");
      return;
    }
    
    const minCost = Math.min(...variantCosts);
    console.log("Минимальная стоимость ингредиентов и топлива:", minCost);
    
    const costPerUnit = minCost / formData.resultAmount;
    console.log("Стоимость на единицу результата:", costPerUnit);
    
    const totalMultiplier = craftBaseMultiplier + (craftComplexityValue * craftComplexityMultiplier);
    console.log("Итоговый множитель:", totalMultiplier);
    
    let craftValue = Math.round(costPerUnit * totalMultiplier);
    
    // Проверяем сезонные модификаторы для рецепта
    if (formData.isSeasonDependent && balance.currentConfig.currentSeason) {
      // Проверяем, доступен ли рецепт в текущем сезоне
      if (formData.availableSeasons.length > 0 && !formData.availableSeasons.includes(balance.currentConfig.currentSeason)) {
        console.log(`Рецепт недоступен в текущем сезоне (${balance.currentConfig.currentSeason})`);
        // Если рецепт недоступен в текущем сезоне, значительно увеличиваем стоимость
        craftValue = craftValue * 2; // Удваиваем стоимость
      } else {
        // Применяем сезонный модификатор, если он задан
        const seasonalMultiplier = formData.seasonalMultipliers[balance.currentConfig.currentSeason] || 1.0;
        if (seasonalMultiplier !== 1.0) {
          console.log(`Применяем сезонный модификатор для ${balance.currentConfig.currentSeason}: ${seasonalMultiplier}`);
          craftValue = Math.round(craftValue * seasonalMultiplier);
        }
      }
    }
    
    console.log("Рассчитанный craftValue за единицу:", craftValue);
    
    // Обновляем предмет в списке balance
    const updatedItems = state.balance.comparisonItems.map(item => {
      if (item.name === formData.resultItemName) {
        const updatedItem = {
          ...item,
          craftValue: craftValue,
          hasCraftRecipe: true
        };
        console.log("Обновляем предмет:", updatedItem);
        return updatedItem;
      }
      return item;
    });
    
    updateState('balance.comparisonItems', updatedItems);
    console.log("Обновлен craftValue для", formData.resultItemName, "=", craftValue);
  };
  
  // Функция для расчета необходимого количества топлива
  const calculateRequiredFuel = (ingredients: Array<{itemName: string, amount: number}>, fuelEfficiency: number): number => {
    if (!ingredients.length || !fuelEfficiency) return 0;
    
    // Общее количество ингредиентов
    const totalIngredients = ingredients.reduce((sum: number, ing: Ingredient) => sum + ing.amount, 0);
    
    // Расчет необходимого количества топлива с округлением вверх
    return Math.ceil(totalIngredients / fuelEfficiency);
  };
  
  // Сохранение рецепта
  const handleSave = async () => {
    if (!formData.name || !formData.resultItemName) {
      alert('Please fill in all required fields');
      return;
    }
    
    try {
      // Сохраняем данные старого рецепта для сравнения
      let oldResultItemName = '';
      if (selectedRecipeId) {
        const existingRecipe = state.craftSystem.recipes.find(r => r.id === selectedRecipeId);
        oldResultItemName = existingRecipe?.resultItemName || '';
        
        if (oldResultItemName && oldResultItemName !== formData.resultItemName) {
          console.log(`Изменен результат рецепта: ${oldResultItemName} -> ${formData.resultItemName}`);
        }
      }
      
      // Полностью сбрасываем все craftValue и hasCraftRecipe
      await resetAllCraftValues();
      
      // Теперь сохраняем рецепт
      if (selectedRecipeId) {
        // Обновление существующего рецепта
        const updatedRecipes = state.craftSystem.recipes.map(recipe => {
          if (recipe.id === selectedRecipeId) {
            return {
              ...recipe,
              name: formData.name,
              resultItemName: formData.resultItemName,
              resultAmount: formData.resultAmount,
              category: formData.category,
              level: formData.level,
              variants: formData.variants.map(v => ({
                id: v.id,
                name: v.name,
                ingredients: v.ingredients.map(i => ({
                  itemName: i.itemName,
                  amount: i.amount
                })),
                fuelItems: v.fuelItems ? v.fuelItems.map(f => ({ // Добавляем топливо
                  itemName: f.itemName,
                  amount: f.amount
                })) : []
              })),
              // Новые поля сезонности
              isSeasonDependent: formData.isSeasonDependent,
              availableSeasons: formData.isSeasonDependent ? formData.availableSeasons : [],
              seasonalMultipliers: formData.isSeasonDependent ? formData.seasonalMultipliers : {},
              // Добавляем поле requiresFuel
              requiresFuel: formData.requiresFuel
            };
          }
          return recipe;
        });
        
        // Обновляем рецепты и ждем
        await new Promise<void>((resolve) => {
          updateState('craftSystem.recipes', updatedRecipes);
          setTimeout(resolve, 200);
        });
      } else {
        // Создание нового рецепта
        const newRecipe: CraftRecipe = {
          id: `recipe-${state.craftSystem.nextRecipeId}`,
          name: formData.name,
          resultItemName: formData.resultItemName,
          resultAmount: formData.resultAmount,
          category: formData.category,
          level: formData.level,
          imageId: null,
          variants: formData.variants.map(v => ({
            id: v.id === 'new-variant' ? `variant-${state.craftSystem.nextVariantId}` : v.id,
            name: v.name,
            ingredients: v.ingredients.map(i => ({
              itemName: i.itemName,
              amount: i.amount
            })),
            fuelItems: v.fuelItems ? v.fuelItems.map(f => ({ // Добавляем топливо
              itemName: f.itemName,
              amount: f.amount
            })) : []
          })),
          // Новые поля сезонности
          isSeasonDependent: formData.isSeasonDependent,
          availableSeasons: formData.isSeasonDependent ? formData.availableSeasons : [],
          seasonalMultipliers: formData.isSeasonDependent ? formData.seasonalMultipliers : {},
          // Добавляем поле requiresFuel
          requiresFuel: formData.requiresFuel
        };
        
        // Обновляем рецепты и счетчики и ждем
        await new Promise<void>((resolve) => {
          updateState('craftSystem.recipes', [...state.craftSystem.recipes, newRecipe]);
          updateState('craftSystem.nextRecipeId', state.craftSystem.nextRecipeId + 1);
          updateState('craftSystem.nextVariantId', state.craftSystem.nextVariantId + formData.variants.length);
          setTimeout(resolve, 200);
        });
      }
      
      // Теперь выполняем расчет craftValue
      await calculateCraftValueForResult();
      
      // Завершаем редактирование
      onRecipeSaved();
      
    } catch (error) {
      console.error("Ошибка при сохранении рецепта:", error);
      alert(`Ошибка при сохранении: ${error}`);
    }
  };
  
  // Управление вариантами рецепта
  const handleAddVariant = () => {
    const newVariants = [
      ...formData.variants,
      {
        id: `new-variant-${formData.variants.length}`,
        name: `Variant ${formData.variants.length + 1}`,
        ingredients: [],
        fuelItems: [] // Добавляем пустое поле для топлива
      }
    ];
    
    setFormData({
      ...formData,
      variants: newVariants,
      currentVariant: formData.variants.length
    });
    
    // Обновляем ref
    ingredientsRef.current = [...ingredientsRef.current, []];
    fuelItemsRef.current = [...fuelItemsRef.current, []]; // Добавляем для топлива
  };
  
  // Управление ингредиентами
  const handleAddIngredient = () => {
    // Создаем новый ингредиент
    const newIngredient = {
      itemName: '',
      amount: 1
    };
    
    // Обновляем вариант с новым ингредиентом
    const updatedVariants = formData.variants.map((variant, idx) => {
      if (idx === formData.currentVariant) {
        return {
          ...variant,
          ingredients: [...variant.ingredients, newIngredient]
        };
      }
      return variant;
    });
    
    // Обновляем состояние
    setFormData({
      ...formData,
      variants: updatedVariants
    });
    
    // Обновляем ref
    const newIngredientsRef = [...ingredientsRef.current];
    if (!newIngredientsRef[formData.currentVariant]) {
      newIngredientsRef[formData.currentVariant] = [];
    }
    newIngredientsRef[formData.currentVariant].push(newIngredient);
    ingredientsRef.current = newIngredientsRef;
  };
  
  // Новые обработчики для топлива
  const handleAddFuel = () => {
    // Создаем новое топливо
    const newFuel = {
      itemName: '',
      amount: 1
    };
    
    // Обновляем вариант с новым топливом
    const updatedVariants = formData.variants.map((variant, idx) => {
      if (idx === formData.currentVariant) {
        // Создаем fuelItems, если он не существует
        const fuelItems = variant.fuelItems || [];
        return {
          ...variant,
          fuelItems: [...fuelItems, newFuel]
        };
      }
      return variant;
    });
    
    // Обновляем состояние
    setFormData({
      ...formData,
      variants: updatedVariants
    });
    
    // Обновляем ref
    const newFuelItemsRef = [...fuelItemsRef.current];
    if (!newFuelItemsRef[formData.currentVariant]) {
      newFuelItemsRef[formData.currentVariant] = [];
    }
    newFuelItemsRef[formData.currentVariant].push(newFuel);
    fuelItemsRef.current = newFuelItemsRef;
  };
  
  const handleFuelItemChange = (idx: number, itemName: string) => {
    console.log(`Выбор топлива: ${itemName} для индекса ${idx}`);
    
    // Находим выбранное топливо
    const fuelItem = balanceItems.find(item => item.name === itemName);
    
    // Глубокое копирование вариантов
    const updatedVariants = JSON.parse(JSON.stringify(formData.variants));
    
    // Обновляем имя топлива, предварительно инициализируя fuelItems, если он undefined
    if (!updatedVariants[formData.currentVariant].fuelItems) {
      updatedVariants[formData.currentVariant].fuelItems = [];
    }
    
    // Убедимся, что элемент с индексом idx существует
    while (updatedVariants[formData.currentVariant].fuelItems.length <= idx) {
      updatedVariants[formData.currentVariant].fuelItems.push({ itemName: '', amount: 1 });
    }
    
    updatedVariants[formData.currentVariant].fuelItems[idx].itemName = itemName;
    
    // Если у нас есть данные об эффективности топлива, рассчитываем количество
    if (fuelItem && fuelItem.isFuel && fuelItem.fuelEfficiency && updatedVariants[formData.currentVariant].ingredients.length > 0) {
      const ingredientsTotal = updatedVariants[formData.currentVariant].ingredients.reduce(
        (sum: number, ing: Ingredient) => sum + ing.amount, 0
      );
      
      // Рассчитываем необходимое количество топлива с округлением вверх
      const requiredFuel = Math.ceil(ingredientsTotal / fuelItem.fuelEfficiency);
      
      // Устанавливаем рассчитанное количество
      updatedVariants[formData.currentVariant].fuelItems[idx].amount = requiredFuel;
    }
    
    // Обновляем состояние
    setFormData({
      ...formData,
      variants: updatedVariants
    });
    
    // Обновляем ref для сохранения выбора
    const newFuelItemsRef = [...fuelItemsRef.current];
    if (!newFuelItemsRef[formData.currentVariant]) {
      newFuelItemsRef[formData.currentVariant] = [];
    }
    
    // Убедимся, что элемент с индексом idx существует в ref
    while (newFuelItemsRef[formData.currentVariant].length <= idx) {
      newFuelItemsRef[formData.currentVariant].push({ itemName: '', amount: 1 });
    }
    
    newFuelItemsRef[formData.currentVariant][idx] = {
      itemName,
      amount: updatedVariants[formData.currentVariant].fuelItems[idx].amount
    };
    fuelItemsRef.current = newFuelItemsRef;
  };
  
  const handleRemoveFuel = (idx: number) => {
    const updatedVariants = [...formData.variants];
    
    // Убедимся, что fuelItems существует перед операциями над ним
    if (!updatedVariants[formData.currentVariant].fuelItems) {
      updatedVariants[formData.currentVariant].fuelItems = [];
    } else {
      // Используем безопасный подход: сначала делаем проверку на существование массива
      const fuelItems = updatedVariants[formData.currentVariant].fuelItems;
      updatedVariants[formData.currentVariant].fuelItems = fuelItems ? 
        fuelItems.filter((_, i) => i !== idx) : [];
    }
    
    setFormData({
      ...formData,
      variants: updatedVariants
    });
    
    // Обновляем ref
    const newFuelItemsRef = [...fuelItemsRef.current];
    if (newFuelItemsRef[formData.currentVariant]) {
      newFuelItemsRef[formData.currentVariant].splice(idx, 1);
    }
    fuelItemsRef.current = newFuelItemsRef;
  };

  // Получение значения предмета по имени
  const getItemValue = (itemName: string): number => {
    const item = state.balance.comparisonItems.find(i => i.name === itemName);
    if (!item) return 0;
    
    // Используем calculateItemCost из Balance
    const value = balance.calculateItemCost(item);
    console.log(`Получение значения для ${itemName}: ${value}`);
    return value;
  };

  // Обработчик выбора результата рецепта
  const handleResultItemChange = (itemName: string) => {
    // Всегда устанавливаем имя рецепта равным имени результата
    if (itemName) {
      setFormData({
        ...formData,
        resultItemName: itemName,
        name: itemName // Всегда обновляем имя рецепта
      });
    } else {
      setFormData({
        ...formData,
        resultItemName: '',
        name: '' // Если результат не выбран, очищаем имя
      });
    }
  };

  // Автоматический расчет количества при выборе ингредиента
  const handleIngredientItemChange = (idx: number, itemName: string) => {
    console.log(`Выбор ингредиента: ${itemName} для индекса ${idx}`);
    
    // Глубокое копирование вариантов
    const updatedVariants = JSON.parse(JSON.stringify(formData.variants));
    
    // Обновляем имя ингредиента
    updatedVariants[formData.currentVariant].ingredients[idx].itemName = itemName;
    
    // Если у нас есть результат и ингредиент, рассчитываем количество
    if (itemName && formData.resultItemName) {
      try {
        // Получаем стоимости
        const resultValue = getItemValue(formData.resultItemName);
        const ingredientValue = getItemValue(itemName);
        
        console.log(`Стоимости: результат=${resultValue}, ингредиент=${ingredientValue}`);
        
        // Рассчитываем количество если стоимости положительны
        if (resultValue > 0 && ingredientValue > 0) {
          const calculatedAmount = calculateIngredientAmount(
            resultValue,
            formData.resultAmount,
            ingredientValue
          );
          
          console.log(`Рассчитанное количество: ${calculatedAmount}`);
          
          // Устанавливаем рассчитанное количество
          updatedVariants[formData.currentVariant].ingredients[idx].amount = calculatedAmount;
        }
      } catch (error) {
        console.error("Ошибка при расчете количества:", error);
      }
    }
    
    // Обновляем состояние
    setFormData({
      ...formData,
      variants: updatedVariants
    });
    
    // Обновляем ref для сохранения выбора
    const newIngredientsRef = [...ingredientsRef.current];
    if (!newIngredientsRef[formData.currentVariant]) {
      newIngredientsRef[formData.currentVariant] = [];
    }
    newIngredientsRef[formData.currentVariant][idx] = {
      itemName,
      amount: updatedVariants[formData.currentVariant].ingredients[idx].amount
    };
    ingredientsRef.current = newIngredientsRef;
    
    // Если включено использование топлива, автоматически пересчитываем количество топлива
    if (formData.requiresFuel) {
      // Убедимся, что массив fuelItems существует
      if (!updatedVariants[formData.currentVariant].fuelItems) {
        updatedVariants[formData.currentVariant].fuelItems = [];
      }
      
      const fuelItems = updatedVariants[formData.currentVariant].fuelItems;
      // Если у нас есть fuelItems и его длина больше 0, пересчитываем для каждого элемента
      if (fuelItems && fuelItems.length > 0) {
        fuelItems.forEach((fuel: Ingredient, fuelIdx: number) => {
          if (fuel.itemName) {
            const fuelItem = balanceItems.find(i => i.name === fuel.itemName);
            if (fuelItem && fuelItem.isFuel && fuelItem.fuelEfficiency) {
              // Пересчитываем количество топлива
              const totalIngredients = updatedVariants[formData.currentVariant].ingredients.reduce(
                (sum: number, ing: Ingredient) => sum + ing.amount, 0
              );
              fuelItems[fuelIdx].amount = 
                Math.ceil(totalIngredients / fuelItem.fuelEfficiency);
            }
          }
        });
      }
    }
  };

  // Удаление ингредиента
  const handleRemoveIngredient = (idx: number) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[formData.currentVariant].ingredients.splice(idx, 1);
    
    setFormData({
      ...formData,
      variants: updatedVariants
    });
    
    // Обновляем ref
    const newIngredientsRef = [...ingredientsRef.current];
    newIngredientsRef[formData.currentVariant].splice(idx, 1);
    ingredientsRef.current = newIngredientsRef;
    
    // Если включено использование топлива, автоматически пересчитываем количество топлива
    if (formData.requiresFuel) {
      // Проверяем существование fuelItems и его длину
      const fuelItems = updatedVariants[formData.currentVariant].fuelItems;
      if (fuelItems && fuelItems.length > 0) {
        // Обновляем состояние после удаления ингредиента для пересчета топлива
        setTimeout(() => {
          const variantWithUpdatedFuel = JSON.parse(JSON.stringify(updatedVariants));
          
          const currentFuelItems = variantWithUpdatedFuel[formData.currentVariant].fuelItems;
          if (currentFuelItems) {
            currentFuelItems.forEach((fuel: Ingredient, fuelIdx: number) => {
              if (fuel.itemName) {
                const fuelItem = balanceItems.find(i => i.name === fuel.itemName);
                if (fuelItem && fuelItem.isFuel && fuelItem.fuelEfficiency) {
                  // Пересчитываем количество топлива
                  const totalIngredients = variantWithUpdatedFuel[formData.currentVariant].ingredients.reduce(
                    (sum: number, ing: Ingredient) => sum + ing.amount, 0
                  );
                  
                  currentFuelItems[fuelIdx].amount = 
                    Math.ceil(totalIngredients / fuelItem.fuelEfficiency);
                }
              }
            });
          }
          
          setFormData({
            ...formData,
            variants: variantWithUpdatedFuel
          });
        }, 10);
      }
    }
  };

  // Обернем расчет времени крафта в useMemo для кэширования и реактивности на изменения version
  const craftTimeData = useMemo(() => {
    if (!formData.resultItemName) return { formattedTime: '--', details: { baseTime: 0, ingredientsTime: 0, totalTime: 0, variantTimes: [] } };
    
    try {
      // Преобразуем ресурсы в формат ItemData для расчетов
      const resourceItems = state.resources.items.map(item => ({
        name: item.name,
        tier: 1,
        mechanic: 'Найти в мире',
        selectedCategories: [item.category],
        selectedModifiers: [],
        selectedLocations: [],
        frequencyType: 'Часто встречаемый',
        craftComplexity: 'Не крафтиться'
      }));
      
      // Объединяем с предметами из сравнения
      const allItems = [...state.balance.comparisonItems, ...resourceItems];
      
      // Подготавливаем данные рецепта в формате для расчета
      const recipeData = {
        resultItemName: formData.resultItemName,
        level: formData.level,
        variants: formData.variants
      };
      
      // Используем новую функцию для получения деталей времени
      const timeDetails = getCraftTimeDetails(
        recipeData,
        allItems,
        state.balance.currentConfig
      );
      
      // Возвращаем форматированное время и детали
      return {
        formattedTime: formatCraftTime(timeDetails.totalTime),
        details: timeDetails
      };
    } catch (error) {
      console.error("Ошибка при расчете времени крафта:", error);
      
      // Резервный метод - старый способ расчета
      const itemData = state.balance.comparisonItems.find(
        item => item.name === formData.resultItemName
      );
      
      if (!itemData) return { formattedTime: '--', details: { baseTime: 0, ingredientsTime: 0, totalTime: 0, variantTimes: [] } };
      
      const complexity = itemData.craftComplexity || 'Средне';
      const craftTime = calculateCraftTime(
        complexity,
        formData.level,
        state.balance.currentConfig
      );
      
      // Возвращаем базовое время
      return {
        formattedTime: formatCraftTime(craftTime),
        details: { baseTime: craftTime, ingredientsTime: 0, totalTime: craftTime, variantTimes: [] }
      };
    }
  }, [
    formData.resultItemName,
    formData.level,
    formData.variants,
    state.resources.items,
    state.balance.comparisonItems,
    state.balance.currentConfig,
    state.balance.currentConfig?.craftTimeConfig?.version // Добавляем зависимость от версии
  ]);
  
  // Обновляем ref с результатами расчета при изменении craftTimeData
  useEffect(() => {
    craftTimeDetails.current = craftTimeData.details;
  }, [craftTimeData]);
  
  // Упрощенная функция getCraftTime, использующая кэшированные данные
  const getCraftTime = () => craftTimeData.formattedTime;
  
  // Обработчики для сезонных настроек
  const handleSeasonDependencyChange = (isDependent: boolean) => {
    // Если включаем зависимость от сезона, инициализируем сезонные данные
    if (isDependent && !formData.isSeasonDependent) {
      // Инициализируем сезонные модификаторы, если их нет
      let seasonalMultipliers = { ...formData.seasonalMultipliers };
      
      // Добавляем нейтральные модификаторы для всех сезонов
      seasons.forEach(season => {
        if (!seasonalMultipliers[season]) {
          seasonalMultipliers[season] = 1.0;
        }
      });
      
      setFormData({
        ...formData,
        isSeasonDependent: true,
        seasonalMultipliers
      });
    } else {
      // Если выключаем зависимость, просто обновляем флаг
      setFormData({
        ...formData,
        isSeasonDependent: isDependent
      });
    }
  };
  
  const handleSeasonToggle = (season: string) => {
    const newAvailableSeasons = formData.availableSeasons.includes(season)
      ? formData.availableSeasons.filter(s => s !== season)
      : [...formData.availableSeasons, season];
    
    setFormData({
      ...formData,
      availableSeasons: newAvailableSeasons
    });
  };
  
  const handleSeasonalMultiplierChange = (season: string, value: number) => {
    setFormData({
      ...formData,
      seasonalMultipliers: {
        ...formData.seasonalMultipliers,
        [season]: value
      }
    });
  };
  
  // Основная форма
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
      <h2 className="text-lg font-semibold mb-4">
        {selectedRecipeId ? 'Edit Recipe' : 'Create New Recipe'}
      </h2>
      
      <div className="space-y-4">
        {/* Основные свойства рецепта */}
        <div>
          <label className="block text-sm font-medium mb-1 flex items-center">
            Recipe Name
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-300">
              Auto-generated
            </span>
          </label>
          <input
            type="text"
            value={formData.name}
            readOnly={true}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 cursor-not-allowed opacity-70"
            placeholder="Auto-generated from result item"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Recipe name is automatically set to match the result item name
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Result Item</label>
          <SearchableSelect
            items={balanceItems}
            value={formData.resultItemName}
            onChange={handleResultItemChange}
            placeholder="Select Item"
          />
        </div>
        
        {/* Показываем расчетное время крафта с возможностью раскрыть детали */}
        {formData.resultItemName && (
          <div className="mt-2 p-3 bg-gray-200 dark:bg-gray-700 rounded-md">
            <div className="flex justify-between items-start">
              <div>
                <div className="text-sm font-medium">
                  Craft Time: {getCraftTime()}
                </div>
                <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <div>Base processing: {formatCraftTime(craftTimeDetails.current.baseTime)}</div>
                  {craftTimeDetails.current.ingredientsTime > 0 && (
                    <div>Ingredients processing: +{formatCraftTime(craftTimeDetails.current.ingredientsTime)}</div>
                  )}
                </div>
              </div>
              
              {craftTimeDetails.current.variantTimes && craftTimeDetails.current.variantTimes.length > 0 && (
                <button
                  onClick={() => setShowTimeDetails(!showTimeDetails)}
                  className="text-xs text-blue-500 hover:underline"
                >
                  {showTimeDetails ? 'Hide details' : 'Show details'}
                </button>
              )}
            </div>
            
            {/* Детализированная информация о времени крафта */}
            {showTimeDetails && craftTimeDetails.current.variantTimes && craftTimeDetails.current.variantTimes.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-600">
                <h4 className="text-xs font-medium mb-2">Processing time per variant:</h4>
                
                <div className="space-y-2">
                  {craftTimeDetails.current.variantTimes.map((variant, idx) => {
                    const variantName = formData.variants.find(v => v.id === variant.variantId)?.name || `Variant ${idx + 1}`;
                    
                    return (
                      <div key={`time-${idx}`} className="text-xs border border-gray-300 dark:border-gray-600 rounded-md p-2">
                        <div className="font-medium mb-1">
                          {variantName}: {formatCraftTime(variant.time)}
                        </div>
                        
                        {variant.breakdown && variant.breakdown.length > 0 && (
                          <div className="space-y-1 mt-1 pl-2 border-l-2 border-gray-300 dark:border-gray-600">
                            {variant.breakdown.map((item, i) => (
                              <div key={`ing-${i}`} className="flex justify-between">
                                <span>{item.itemName} x{item.amount}</span>
                                <span>{formatCraftTime(item.totalTime)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Note: The total time uses the fastest variant for optimal crafting.
                </p>
              </div>
            )}
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Result Amount</label>
          <input
            type="number"
            value={formData.resultAmount}
            onChange={(e) => setFormData({ ...formData, resultAmount: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            min="1"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select Category</option>
            {Object.keys(state.balance.currentConfig.categories).map(category => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Recipe Level</label>
          <input
            type="number"
            value={formData.level}
            onChange={(e) => setFormData({ ...formData, level: parseInt(e.target.value) || 1 })}
            className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            min="1"
            max="10"
          />
        </div>
        
        {/* Переключатель для требования топлива */}
        <div className="mt-6 p-3 border border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="requiresFuel"
              checked={formData.requiresFuel}
              onChange={(e) => setFormData({ ...formData, requiresFuel: e.target.checked })}
              className="h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
            />
            <label htmlFor="requiresFuel" className="ml-2 text-base font-medium text-gray-700 dark:text-gray-300">
              Требуется топливо (печь)
            </label>
          </div>
          
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            Включите эту опцию, если для крафта требуется печь и расходуется топливо. 
            Для каждого варианта рецепта можно указать разные типы топлива.
          </p>
        </div>
        
        {/* Новый раздел - Сезонные настройки */}
        <div className="space-y-4 p-4 border border-gray-300 dark:border-gray-600 rounded-lg">
          <h3 className="text-lg font-medium">Сезонные настройки</h3>
          
          {/* Переключатель зависимости от сезона */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isSeasonDependent"
              checked={formData.isSeasonDependent}
              onChange={(e) => handleSeasonDependencyChange(e.target.checked)}
              className="mr-2 h-4 w-4"
            />
            <label htmlFor="isSeasonDependent">
              Рецепт зависит от сезона
            </label>
          </div>
          
          {/* Выбор доступных сезонов (отображается только если рецепт зависит от сезона) */}
          {formData.isSeasonDependent && (
            <div>
              <label className="block mb-2">Доступные сезоны для крафта:</label>
              <div className="flex flex-wrap gap-2">
                {seasons.map(season => (
                  <label key={season} className="flex items-center p-2 border border-gray-300 dark:border-gray-600 rounded-md">
                    <input
                      type="checkbox"
                      checked={formData.availableSeasons.includes(season)}
                      onChange={() => handleSeasonToggle(season)}
                      className="mr-2 h-4 w-4"
                    />
                    <span>{season}</span>
                  </label>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Если не выбран ни один сезон, рецепт доступен во всех сезонах.
              </p>
            </div>
          )}
          
          {/* Настройка сезонных модификаторов (если рецепт зависит от сезона) */}
          {formData.isSeasonDependent && (
            <div>
              <label className="block mb-2">Сезонные модификаторы стоимости:</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {seasons.map(season => (
                  <div key={season} className="flex items-center">
                    <span className="w-20">{season}:</span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={formData.seasonalMultipliers[season] || 1.0}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value);
                        if (!isNaN(value) && value > 0) {
                          handleSeasonalMultiplierChange(season, value);
                        }
                      }}
                      className="ml-2 px-2 py-1 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 w-24"
                    />
                    <span className="ml-2">×</span>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Указанные значения будут умножать базовую стоимость крафта в соответствующем сезоне.
              </p>
            </div>
          )}
          
          {/* Отображение текущего сезона */}
          <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-700 rounded-md">
            <div className="text-sm">
              Текущий сезон: <span className="font-medium">{balance.currentConfig.currentSeason || 'Не выбран'}</span>
            </div>
            {formData.isSeasonDependent && balance.currentConfig.currentSeason && (
              <div className="mt-1 text-sm">
                {formData.availableSeasons.length > 0 && !formData.availableSeasons.includes(balance.currentConfig.currentSeason) ? (
                  <span className="text-red-500 dark:text-red-400">
                    Рецепт недоступен в текущем сезоне
                  </span>
                ) : (
                  <span className="text-green-500 dark:text-green-400">
                    Рецепт доступен в текущем сезоне {formData.seasonalMultipliers[balance.currentConfig.currentSeason] !== 1.0 ? 
                      `(модификатор: ${formData.seasonalMultipliers[balance.currentConfig.currentSeason]}×)` : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Секция вариантов рецепта */}
        <div className="mt-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-medium">Recipe Variants</h3>
            <button
              onClick={handleAddVariant}
              className="px-2 py-1 bg-blue-500 text-white rounded-md text-sm hover:bg-blue-600 transition"
            >
              Add Variant
            </button>
          </div>
          
          {/* Вкладки вариантов */}
          <div className="flex border-b border-gray-300 dark:border-gray-700 mb-4">
            {formData.variants.map((variant, index) => (
              <button
                key={variant.id}
                className={`px-4 py-2 ${
                  formData.currentVariant === index
                    ? 'border-b-2 border-primary text-primary'
                    : 'text-gray-500 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
                }`}
                onClick={() => setFormData({ ...formData, currentVariant: index })}
              >
                {variant.name}
              </button>
            ))}
          </div>
          
          {/* Текущий выбранный вариант */}
          {formData.variants.length > 0 && (
            <div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Variant Name</label>
                <input
                  type="text"
                  value={formData.variants[formData.currentVariant].name}
                  onChange={(e) => {
                    const variants = [...formData.variants];
                    variants[formData.currentVariant] = {
                      ...variants[formData.currentVariant],
                      name: e.target.value
                    };
                    setFormData({ ...formData, variants });
                  }}
                  className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                />
              </div>
              
              {/* Ингредиенты */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium text-sm">Ingredients</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={handleAddIngredient}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Add Ingredient
                    </button>
                  </div>
                </div>
                
                {formData.variants[formData.currentVariant].ingredients.length === 0 ? (
                  <div className="text-center py-4 text-gray-500 dark:text-gray-400 border border-dashed border-gray-500 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/30">
                    No ingredients yet. Add some ingredients to this variant.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formData.variants[formData.currentVariant].ingredients.map((ingredient, idx) => {
                      // Найдем данные ингредиента для отображения сезонной информации
                      const ingredientItem = balanceItems.find(item => item.name === ingredient.itemName);
                      const isSeasonalIngredient = ingredientItem?.isHarvest && ingredientItem?.growingSeason;
                      const isAvailableInCurrentSeason = 
                        balance.currentConfig.currentSeason && 
                        ingredientItem?.growingSeason?.includes(balance.currentConfig.currentSeason);
                      
                      return (
                        <div key={`ingredient-${formData.currentVariant}-${idx}`}>
                          <div className="flex space-x-2">
                            <SearchableSelect
                              items={balanceItems}
                              value={ingredient.itemName}
                              onChange={(value) => handleIngredientItemChange(idx, value)}
                              placeholder="Select Ingredient"
                              className="flex-1"
                            />
                            
                            <input
                              type="number"
                              value={ingredient.amount}
                              onChange={(e) => {
                                const variants = [...formData.variants];
                                variants[formData.currentVariant].ingredients[idx].amount = parseInt(e.target.value) || 1;
                                setFormData({ ...formData, variants });
                              }}
                              className="w-20 px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                              min="1"
                            />
                            
                            <button
                              onClick={() => handleRemoveIngredient(idx)}
                              className="px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* Информация о сезонном ингредиенте */}
                          {isSeasonalIngredient && (
                            <div className="mt-1 ml-2 text-xs">
                              <div className="flex flex-wrap gap-1 mb-1">
                                <span>Сезоны роста:</span>
                                {ingredientItem?.growingSeason?.map(season => (
                                  <span key={season} className={`px-1.5 py-0.5 rounded-full ${
                                    balance.currentConfig.currentSeason === season 
                                      ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                  }`}>
                                    {season}
                                  </span>
                                ))}
                              </div>
                              
                              {balance.currentConfig.currentSeason && (
                                <div className={isAvailableInCurrentSeason 
                                  ? "text-green-600 dark:text-green-400" 
                                  : "text-red-600 dark:text-red-400"
                                }>
                                  {isAvailableInCurrentSeason 
                                    ? `✓ Доступен в текущем сезоне (${balance.currentConfig.currentSeason})` 
                                    : `⚠ Недоступен в текущем сезоне (${balance.currentConfig.currentSeason})`
                                  }
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Секция топлива, если это требуется */}
              {formData.requiresFuel && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-sm">Топливо</h4>
                    <button
                      onClick={handleAddFuel}
                      className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded-md text-sm hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                    >
                      Добавить топливо
                    </button>
                  </div>
                  
                  {!formData.variants[formData.currentVariant].fuelItems || 
                   formData.variants[formData.currentVariant].fuelItems?.length === 0 ? (
                    <div className="text-center py-4 text-gray-500 dark:text-gray-400 border border-dashed border-gray-500 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/30">
                      Не указано топливо. Добавьте хотя бы один тип топлива.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.variants[formData.currentVariant].fuelItems?.map((fuel, idx) => {
                        // Найдем данные о топливе
                        const fuelItem = balanceItems.find(item => item.name === fuel.itemName);
                        const isFuelItem = fuelItem?.isFuel;
                        const fuelEfficiency = fuelItem?.fuelEfficiency || 1;
                        
                        return (
                          <div key={`fuel-${formData.currentVariant}-${idx}`}>
                            <div className="flex space-x-2">
                              <SearchableSelect
                                items={fuelItems} // Используем отфильтрованный список только топлива
                                value={fuel.itemName}
                                onChange={(value) => handleFuelItemChange(idx, value)}
                                placeholder="Выберите топливо"
                                className="flex-1"
                              />
                              
                              <input
                                type="number"
                                value={fuel.amount}
                                onChange={(e) => {
                                  const variants = [...formData.variants];
                                  // Убедимся, что fuelItems существует
                                  if (!variants[formData.currentVariant].fuelItems) {
                                    variants[formData.currentVariant].fuelItems = [];
                                  }
                                  
                                  const fuelItems = variants[formData.currentVariant].fuelItems!; // Non-null assertion после проверки
                                  
                                  // Убедимся, что у нас есть элемент с индексом idx
                                  while (fuelItems.length <= idx) {
                                    fuelItems.push({ itemName: '', amount: 1 });
                                  }
                                  
                                  fuelItems[idx].amount = parseInt(e.target.value) || 1;
                                  setFormData({ ...formData, variants });
                                }}
                                className="w-20 px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                                min="1"
                              />
                              
                              <button
                                onClick={() => handleRemoveFuel(idx)}
                                className="px-2 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition"
                              >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            {/* Информация о топливе */}
                            {isFuelItem && (
                              <div className="mt-1 ml-2 text-xs">
                                <div className="text-gray-600 dark:text-gray-400">
                                  Эффективность: 1 ед. топлива на {fuelEfficiency} ед. ресурса
                                </div>
                                
                                {/* Расчет необходимого количества топлива */}
                                {formData.variants[formData.currentVariant].ingredients.length > 0 && (
                                  <div className="mt-1 text-green-600 dark:text-green-400">
                                    Расчетное количество: {calculateRequiredFuel(
                                      formData.variants[formData.currentVariant].ingredients,
                                      fuelEfficiency
                                    )} шт.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Кнопки управления */}
        <div className="flex justify-end space-x-2 mt-6">
          <button
            onClick={onRecipeSaved}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
          >
            Save Recipe
          </button>
        </div>
      </div>
    </div>
  );
}