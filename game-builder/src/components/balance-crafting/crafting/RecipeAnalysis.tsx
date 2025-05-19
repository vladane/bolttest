import { useMemo, useState, useEffect } from 'react';
import { useAppState } from '../../../contexts/AppStateContext';
import { 
  formatCraftTime, 
  getCraftTimeDetails,
  isValidRecipe
} from '../../../utils/craftingCalculations';
import { useBalance, ItemData } from '../../../contexts/BalanceContext';
import EChartWrapper from '../../common/EChartWrapper';
import * as echarts from 'echarts';

// Сохраняем существующие интерфейсы
interface VariantCost {
  id: string;
  cost: number;
}

interface CraftPriceResult {
  ingredientsCost: number;
  craftValue: number;
  profit: number;
  profitPercentage: number;
  variantCosts: VariantCost[];
}

interface ItemIngredient {
  name: string;
  amount: number;
  cost: number;
  tier: number;
}

interface VariantAnalysis {
  variantId: string;
  variantName: string;
  ingredientsCost: number;
  craftTime: number;
  profit: number;
  efficiency: number;
  roi: number;
  ingredients: ItemIngredient[];
}

interface RecipeAnalysisResult {
  recipeId: string;
  recipeName: string;
  resultName: string;
  resultValue: number;
  variants: VariantAnalysis[];
  bestVariant: VariantAnalysis;
}

// Интерфейс для рецепта и варианта
interface Recipe {
  id: string;
  name: string;
  resultItemName: string;
  resultAmount: number;
  level?: number;
  variants: RecipeVariant[];
}

interface RecipeVariant {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
}

interface RecipeIngredient {
  itemName: string;
  amount: number;
}

export default function RecipeAnalysis() {
  const { state } = useAppState();
  const balance = useBalance();
  const { recipes } = state.craftSystem;
  const [sortField, setSortField] = useState('profit');
  const [sortDirection, setSortDirection] = useState('desc');
  const [error, setError] = useState<string | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [chartView, setChartView] = useState<'profit' | 'efficiency' | 'roi'>('profit');
  
  // Отладочная информация и проверка рецептов
  useEffect(() => {
    console.log("RecipeAnalysis: Загружены рецепты", recipes);
    
    // Проверка структуры рецептов
    const invalidRecipes = recipes.filter(r => !isValidRecipe(r));
    if (invalidRecipes.length > 0) {
      console.error("Найдены некорректные рецепты:", invalidRecipes);
      setError("Некоторые рецепты имеют неправильную структуру. Проверьте консоль для подробностей.");
    } else {
      setError(null);
    }
  }, [recipes]);

  // Объединяем предметы из разных источников для расчета цен
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
      imageId: item.imageId || null // Добавляем imageId для соответствия типу ItemData
    }));
    
    // Объединяем с предметами из сравнения
    return [...state.balance.comparisonItems, ...resourceItems];
  }, [state.resources.items, state.balance.comparisonItems]);
  
  // Функция для расчета стоимости предмета с типами
  const calculateItemPrice = (item: ItemData | undefined): number => {
    if (!item) return 0;
    return balance.calculateItemCost(item);
  };
  
  // Функция для расчета стоимости крафта с типами
  const calculateCraftPrice = (recipe: Recipe, items: ItemData[]): CraftPriceResult => {
    // Существующий код расчета
    if (!recipe || !recipe.variants || recipe.variants.length === 0) {
      return { ingredientsCost: 0, craftValue: 0, profit: 0, profitPercentage: 0, variantCosts: [] };
    }
    
    const resultItem = items.find(item => item.name === recipe.resultItemName);
    if (!resultItem) {
      return { ingredientsCost: 0, craftValue: 0, profit: 0, profitPercentage: 0, variantCosts: [] };
    }
    
    const resultValue = calculateItemPrice(resultItem) * (recipe.resultAmount || 1);
    
    // Расчет стоимости вариантов
    const variantCosts = recipe.variants
      .filter((variant) => variant && variant.ingredients && Array.isArray(variant.ingredients))
      .map((variant) => {
        const cost = variant.ingredients.reduce((total: number, ingredient) => {
          if (!ingredient || !ingredient.itemName) return total;
          
          const item = items.find(i => i.name === ingredient.itemName);
          if (!item) return total;
          
          const price = calculateItemPrice(item);
          return total + (price * ingredient.amount);
        }, 0);
        
        return { id: variant.id, cost };
      });
    
    // Находим минимальную стоимость варианта
    const minCost = variantCosts.length > 0 
      ? Math.min(...variantCosts.map((vc: VariantCost) => vc.cost))
      : 0;
    
    // Рассчитываем прибыль
    const profit = resultValue - minCost;
    const profitPercentage = minCost > 0 ? (profit / minCost) * 100 : 0;
    
    return {
      ingredientsCost: minCost,
      craftValue: resultValue,
      profit,
      profitPercentage,
      variantCosts
    };
  };
  
  // Остальной существующий код...
  const recipeAnalysis = useMemo(() => {
    if (!recipes || recipes.length === 0) return [];
    
    try {
      return recipes
        .filter(recipe => isValidRecipe(recipe))
        .map(recipe => {
          try {
            // Получаем данные о результате
            const resultName = recipe.resultItemName;
            const resultItem = allItems.find(item => item.name === resultName);
            
            // Используем функцию вместо хука
            const basePrice = calculateItemPrice(resultItem);
            const resultValue = basePrice * (recipe.resultAmount || 1);
            
            // Расчет крафта через функцию вместо хука
            const { 
              // Переименовываем чтобы избежать предупреждений
              variantCosts 
            } = calculateCraftPrice(recipe, allItems);
            
            // Анализ вариантов
            const variantAnalysis = recipe.variants
              .filter((variant) => variant && variant.ingredients && Array.isArray(variant.ingredients))
              .map((variant) => {
                try {
                  // Находим стоимость ингредиентов из variantCosts
                  const variantCostInfo = variantCosts.find((vc: VariantCost) => vc.id === variant.id);
                  const variantCost = variantCostInfo?.cost || 0;
                  
                  // Используем новую функцию getCraftTimeDetails для расчета времени
                  const recipeClone = { ...recipe };
                    // Создаем временный рецепт с одним вариантом для правильного расчета времени
                    recipeClone.variants = [variant];
                  const timeDetails = getCraftTimeDetails(
                    recipeClone,
                    allItems,
                    state.balance.currentConfig
                  );
                  const craftTime = timeDetails.totalTime;
                  
                  // Прибыль для варианта
                  const variantProfit = resultValue - variantCost;
                  
                  // Эффективность (прибыль в минуту)
                  const efficiency = craftTime > 0 ? variantProfit / (craftTime / 60) : 0;
                  
                  // ROI
                  const roi = variantCost > 0 ? variantProfit / variantCost : 0;
                  
                  // Используем обычную функцию для получения цен ингредиентов
                  const ingredients = variant.ingredients
                    .filter((ing) => ing && ing.itemName)
                    .map((ingredient) => {
                      // Информация об ингредиенте по имени
                      const itemData = allItems.find(
                        item => item.name === ingredient.itemName
                      );
                      
                      const unitPrice = calculateItemPrice(itemData);
                      
                      return {
                        name: ingredient.itemName,
                        amount: ingredient.amount,
                        cost: unitPrice * ingredient.amount,
                        tier: itemData?.tier || 1
                      };
                    });
                  
                  return {
                    variantId: variant.id,
                    variantName: variant.name,
                    ingredientsCost: variantCost,
                    craftTime,
                    profit: variantProfit,
                    efficiency,
                    roi,
                    ingredients
                  } as VariantAnalysis;
                } catch (error) {
                  console.error("Ошибка анализа варианта:", variant, error);
                  return null;
                }
              })
              .filter(Boolean) as VariantAnalysis[];
            
            if (variantAnalysis.length === 0) {
              return null;
            }
            
            // Находим наиболее эффективный вариант
            let bestVariant = variantAnalysis[0];
            
            if (variantAnalysis.length > 1) {
              for (let i = 1; i < variantAnalysis.length; i++) {
                // Добавляем дополнительную проверку на null для TypeScript
                if (variantAnalysis[i] && bestVariant && 
                    variantAnalysis[i].efficiency > bestVariant.efficiency) {
                  bestVariant = variantAnalysis[i];
                }
              }
            }
            
            return {
              recipeId: recipe.id,
              recipeName: recipe.name,
              resultName,
              resultValue,
              variants: variantAnalysis,
              bestVariant
            } as RecipeAnalysisResult;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error("Ошибка анализа рецепта:", recipe, errorMessage);
            return null;
          }
        })
        .filter(Boolean) as RecipeAnalysisResult[];
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error("Ошибка анализа рецептов:", errorMessage);
      setError(`Ошибка при анализе рецептов: ${errorMessage}`);
      return [];
    }
  }, [
    recipes, 
    allItems, 
    state.balance.currentConfig,
    state.balance.currentConfig?.craftTimeConfig?.version,
  ]);
  
  // Сортировка результатов остается без изменений
  const sortedAnalysis = useMemo(() => {
    if (!recipeAnalysis || recipeAnalysis.length === 0) return [];
    
    return [...recipeAnalysis].sort((a, b) => {
      if (!a || !b || !a.bestVariant || !b.bestVariant) return 0;
      
      let valueA: string | number = 0;
      let valueB: string | number = 0;
      
      switch (sortField) {
        case 'name':
          valueA = a.recipeName;
          valueB = b.recipeName;
          break;
        case 'profit':
          valueA = a.bestVariant.profit;
          valueB = b.bestVariant.profit;
          break;
        case 'efficiency':
          valueA = a.bestVariant.efficiency;
          valueB = b.bestVariant.efficiency;
          break;
        case 'roi':
          valueA = a.bestVariant.roi;
          valueB = b.bestVariant.roi;
          break;
        case 'craftTime':
          valueA = a.bestVariant.craftTime;
          valueB = b.bestVariant.craftTime;
          break;
        default:
          valueA = a.bestVariant.profit;
          valueB = b.bestVariant.profit;
      }
      
      if (typeof valueA === 'string' && typeof valueB === 'string') {
        return sortDirection === 'asc' 
          ? valueA.localeCompare(valueB) 
          : valueB.localeCompare(valueA);
      }
      
      return sortDirection === 'asc' 
        ? (valueA as number) - (valueB as number)
        : (valueB as number) - (valueA as number);
    });
  }, [recipeAnalysis, sortField, sortDirection]);
  
  // Получаем выбранный рецепт для детального отображения
  const selectedRecipe = useMemo(() => {
    if (!selectedRecipeId || !recipeAnalysis) return null;
    return recipeAnalysis.find(r => r.recipeId === selectedRecipeId) || null;
  }, [selectedRecipeId, recipeAnalysis]);
  
  // Создаем опции для графика сравнения рецептов
  const recipesChartOptions = useMemo((): echarts.EChartsOption => {
    if (!sortedAnalysis || sortedAnalysis.length === 0) return {};
    
    const isDark = document.documentElement.classList.contains('dark');
    
    // Ограничиваем количество рецептов для отображения (топ-10)
    // ИСПРАВЛЕНО: Фильтруем рецепты с нулевыми значениями для выбранного представления
    const topRecipes = [...sortedAnalysis]
      .filter(r => {
        if (!r.bestVariant) return false;
        
        switch (chartView) {
          case 'profit':
            return r.bestVariant.profit > 0;
          case 'efficiency':
            return r.bestVariant.efficiency > 0;
          case 'roi':
            return r.bestVariant.roi > 0;
          default:
            return r.bestVariant.profit > 0;
        }
      })
      .sort((a, b) => {
        if (!a.bestVariant || !b.bestVariant) return 0;
        
        switch (chartView) {
          case 'profit':
            return b.bestVariant.profit - a.bestVariant.profit;
          case 'efficiency':
            return b.bestVariant.efficiency - a.bestVariant.efficiency;
          case 'roi':
            return b.bestVariant.roi - a.bestVariant.roi;
          default:
            return b.bestVariant.profit - a.bestVariant.profit;
        }
      })
      .slice(0, 10);
    
    // Если нет данных после фильтрации, показываем сообщение
    if (topRecipes.length === 0) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: `No recipes with positive ${chartView} found`,
          textStyle: {
            color: isDark ? '#ccc' : '#333',
            fontSize: 14
          },
          left: 'center' as const,
          top: 'middle' as const
        }
      };
    }
    
    const recipeNames = topRecipes.map(r => r.recipeName);
    
    // Создаем массивы данных для каждой метрики
    const profitData = topRecipes.map(r => Math.round(r.bestVariant.profit));
    const efficiencyData = topRecipes.map(r => parseFloat(r.bestVariant.efficiency.toFixed(1)));
    const roiData = topRecipes.map(r => parseFloat((r.bestVariant.roi * 100).toFixed(1)));
    
    // Настраиваем серии в зависимости от выбранного представления
    let series;
    let title;
    let color;
    
    switch (chartView) {
      case 'profit':
        title = 'Top Recipes by Profit';
        color = '#10B981'; // green-500
        series = [{
          name: 'Profit',
          type: 'bar' as const,
          data: profitData,
          itemStyle: {
            color: color
          },
          emphasis: {
            itemStyle: {
              color: '#059669' // green-600
            }
          },
          label: {
            show: true,
            position: 'top' as const,
            formatter: '{c}',
            color: isDark ? '#ccc' : '#333'
          }
        }];
        break;
      case 'efficiency':
        title = 'Top Recipes by Efficiency (profit/min)';
        color = '#3B82F6'; // blue-500
        series = [{
          name: 'Efficiency',
          type: 'bar' as const,
          data: efficiencyData,
          itemStyle: {
            color: color
          },
          emphasis: {
            itemStyle: {
              color: '#2563EB' // blue-600
            }
          },
          label: {
            show: true,
            position: 'top' as const,
            formatter: '{c}',
            color: isDark ? '#ccc' : '#333'
          }
        }];
        break;
      case 'roi':
        title = 'Top Recipes by ROI (%)';
        color = '#8B5CF6'; // purple-500
        series = [{
          name: 'ROI %',
          type: 'bar' as const,
          data: roiData,
          itemStyle: {
            color: color
          },
          emphasis: {
            itemStyle: {
              color: '#7C3AED' // purple-600
            }
          },
          label: {
            show: true,
            position: 'top' as const,
            formatter: '{c}%',
            color: isDark ? '#ccc' : '#333'
          }
        }];
        break;
      default:
        title = 'Recipe Analysis';
        color = '#10B981'; // green-500
        series = [{
          name: 'Profit',
          type: 'bar' as const,
          data: profitData,
          itemStyle: {
            color: color
          },
          emphasis: {
            itemStyle: {
              color: '#059669' // green-600
            }
          },
          label: {
            show: true,
            position: 'top' as const,
            formatter: '{c}',
            color: isDark ? '#ccc' : '#333'
          }
        }];
    }
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: title,
        left: 'center' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const
        },
        backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#fff' : '#333'
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '15%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: recipeNames,
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 10,
          color: isDark ? '#ccc' : '#333',
          margin: 15
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      yAxis: {
        type: 'value' as const,
        name: chartView === 'roi' ? 'Percentage (%)' : 'Value',
        nameTextStyle: {
          color: isDark ? '#ccc' : '#333'
        },
        axisLabel: {
          color: isDark ? '#ccc' : '#333'
        },
        splitLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
          }
        }
      },
      series
    };
  }, [sortedAnalysis, chartView]);
  
  // ОБНОВЛЕНО: Создаем опции для графика вариантов рецепта
  const variantsChartOptions = useMemo((): echarts.EChartsOption => {
    if (!selectedRecipe) return {};
    
    const isDark = document.documentElement.classList.contains('dark');
    const { variants } = selectedRecipe;
    
    // Данные для графика
    const variantNames = variants.map(v => v.variantName);
    const profitData = variants.map(v => Math.round(v.profit));
    const efficiencyData = variants.map(v => parseFloat(v.efficiency.toFixed(1)));
    const roiData = variants.map(v => parseFloat((v.roi * 100).toFixed(1)));
    const craftTimeData = variants.map(v => parseFloat((v.craftTime / 60).toFixed(1))); // в минутах
    const costData = variants.map(v => Math.round(v.ingredientsCost));
    
    // Определяем лучший вариант для подсветки
    const bestVariantIndex = variants.findIndex(v => v.variantId === selectedRecipe.bestVariant.variantId);
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: `${selectedRecipe.recipeName} - Variant Comparison`,
        left: 'center' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const
        },
        backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#fff' : '#333'
        }
      },
      legend: {
        data: ['Profit', 'Efficiency (profit/min)', 'ROI (%)', 'Craft Time (min)', 'Cost'],
        top: 30,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        containLabel: true,
        top: 80
      },
      xAxis: {
        type: 'category' as const,
        data: variantNames,
        axisLabel: {
          interval: 0,
          rotate: variantNames.length > 2 ? 30 : 0,
          color: isDark ? '#ccc' : '#333'
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      yAxis: [
        {
          type: 'value' as const,
          name: 'Value',
          position: 'left' as const,
          nameTextStyle: {
            color: isDark ? '#ccc' : '#333'
          },
          axisLabel: {
            color: isDark ? '#ccc' : '#333'
          },
          splitLine: {
            lineStyle: {
              color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
            }
          }
        },
        {
          type: 'value' as const,
          name: 'Time (min)',
          position: 'right' as const,
          nameTextStyle: {
            color: isDark ? '#ccc' : '#333'
          },
          axisLabel: {
            color: isDark ? '#ccc' : '#333'
          },
          splitLine: {
            show: false
          }
        }
      ],
      series: [
        {
          name: 'Profit',
          type: 'bar' as const,
          data: profitData.map((value, index) => ({
            value,
            itemStyle: {
              color: index === bestVariantIndex ? '#10B981' : '#34D399' // green-500 или green-400
            },
            emphasis: {
              itemStyle: {
                color: index === bestVariantIndex ? '#059669' : '#10B981' // green-600 или green-500
              }
            }
          })),
          label: {
            show: true,
            position: 'top' as const,
            color: isDark ? '#ccc' : '#333',
            formatter: '{c}'
          }
        },
        {
          name: 'Efficiency (profit/min)',
          type: 'bar' as const,
          data: efficiencyData.map((value, index) => ({
            value,
            itemStyle: {
              color: index === bestVariantIndex ? '#3B82F6' : '#60A5FA' // blue-500 или blue-400
            },
            emphasis: {
              itemStyle: {
                color: index === bestVariantIndex ? '#2563EB' : '#3B82F6' // blue-600 или blue-500
              }
            }
          })),
          label: {
            show: true,
            position: 'top' as const,
            color: isDark ? '#ccc' : '#333',
            formatter: '{c}'
          }
        },
        {
          name: 'ROI (%)',
          type: 'bar' as const,
          data: roiData.map((value, index) => ({
            value,
            itemStyle: {
              color: index === bestVariantIndex ? '#8B5CF6' : '#A78BFA' // purple-500 или purple-400
            },
            emphasis: {
              itemStyle: {
                color: index === bestVariantIndex ? '#7C3AED' : '#8B5CF6' // purple-600 или purple-500
              }
            }
          })),
          label: {
            show: true,
            position: 'top' as const,
            color: isDark ? '#ccc' : '#333',
            formatter: '{c}%'
          }
        },
        {
          name: 'Cost',
          type: 'bar' as const,
          data: costData.map((value, index) => ({
            value,
            itemStyle: {
              color: index === bestVariantIndex ? '#F59E0B' : '#FBBF24' // amber-500 или amber-400
            },
            emphasis: {
              itemStyle: {
                color: index === bestVariantIndex ? '#D97706' : '#F59E0B' // amber-600 или amber-500
              }
            }
          })),
          label: {
            show: true,
            position: 'top' as const,
            color: isDark ? '#ccc' : '#333',
            formatter: '{c}'
          }
        },
        {
          name: 'Craft Time (min)',
          type: 'line' as const,
          yAxisIndex: 1,
          data: craftTimeData.map((value, index) => ({
            value,
            itemStyle: {
              color: index === bestVariantIndex ? '#EF4444' : '#F87171' // red-500 или red-400
            }
          })),
          symbol: 'circle',
          symbolSize: 8,
          lineStyle: {
            width: 2,
            type: 'dashed' as const,
            color: '#EF4444' // red-500
          },
          label: {
            show: true,
            position: 'top' as const,
            color: isDark ? '#ccc' : '#333',
            formatter: '{c}'
          }
        }
      ]
    };
  }, [selectedRecipe]);
  
  // ОБНОВЛЕНО: Создаем график для ингредиентов выбранного варианта
  const ingredientsChartOptions = useMemo((): echarts.EChartsOption => {
    if (!selectedRecipe || !selectedRecipe.bestVariant) return {};
    
    const isDark = document.documentElement.classList.contains('dark');
    const { ingredients } = selectedRecipe.bestVariant;
    
    if (ingredients.length === 0) {
      return {
        backgroundColor: 'transparent',
        title: {
          text: 'No ingredients available',
          textStyle: {
            color: isDark ? '#ccc' : '#333',
            fontSize: 14
          },
          left: 'center' as const,
          top: 'middle' as const
        }
      };
    }
    
    // Сортируем ингредиенты по стоимости (от дорогих к дешевым)
    const sortedIngredients = [...ingredients].sort((a, b) => b.cost - a.cost);
    
    // Данные для графика
    const ingredientNames = sortedIngredients.map(i => `${i.name} x${i.amount}`);
    
    // Определяем градиент цветов по стоимости
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // green-500
      '#8B5CF6', // purple-500
      '#F59E0B', // amber-500
      '#EF4444', // red-500
      '#EC4899', // pink-500
      '#6366F1', // indigo-500
      '#14B8A6', // teal-500
      '#F97316', // orange-500
      '#06B6D4'  // cyan-500
    ];
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: `${selectedRecipe.recipeName} - Best Variant Ingredients`,
        left: 'center' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: function(params: any): string {
          if (!params || !params.data) return '';
          return `${params.name}: ${params.value} (${params.percent}%)`;
        },
        backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#fff' : '#333'
        }
      },
      legend: {
        type: 'scroll' as const,
        orient: 'vertical' as const,
        right: 10,
        top: 20,
        bottom: 20,
        data: ingredientNames,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        },
        pageTextStyle: {
          color: isDark ? '#ccc' : '#333'
        },
        pageIconColor: isDark ? '#ccc' : '#333',
        pageIconInactiveColor: isDark ? '#666' : '#aaa',
        // Сокращаем длинные имена в легенде
        formatter: function(name: string): string {
          const maxLength = 15;
          return name.length > maxLength ? name.substring(0, maxLength) + '...' : name;
        }
      },
      series: [
        {
          name: 'Ingredient Cost',
          type: 'pie' as const,
          radius: ['40%', '70%'],
          center: ['35%', '50%'], // Сдвигаем график влево для легенды
          data: sortedIngredients.map((ingredient, index) => ({
            name: `${ingredient.name} x${ingredient.amount}`,
            value: Math.round(ingredient.cost),
            itemStyle: {
              color: colors[index % colors.length]
            }
          })),
          emphasis: {
            itemStyle: {
              shadowBlur: 10,
              shadowOffsetX: 0,
              shadowColor: 'rgba(0, 0, 0, 0.5)'
            }
          },
          label: {
            show: false
          },
          labelLine: {
            show: false
          }
        }
      ]
    };
  }, [selectedRecipe]);
  
  // Обработчик выбора рецепта
  const handleRecipeSelect = (recipeId: string) => {
    setSelectedRecipeId(prev => prev === recipeId ? null : recipeId);
  };
  
  // Если произошла ошибка, показываем сообщение об ошибке
  if (error) {
    return (
      <div className="bg-red-100 dark:bg-red-900/30 rounded-lg shadow-sm p-4 border border-red-300 dark:border-red-700">
        <h2 className="text-lg font-semibold text-red-800 dark:text-red-400 mb-2">Ошибка анализа</h2>
        <p className="text-red-700 dark:text-red-300">{error}</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* Добавляем секцию с графиком */}
      {sortedAnalysis.length > 0 && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-300 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Recipes Overview</h2>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setChartView('profit')}
                className={`px-3 py-1 rounded text-sm ${
                  chartView === 'profit' 
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Profit
              </button>
              <button
                onClick={() => setChartView('efficiency')}
                className={`px-3 py-1 rounded text-sm ${
                  chartView === 'efficiency' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Efficiency
              </button>
              <button
                onClick={() => setChartView('roi')}
                className={`px-3 py-1 rounded text-sm ${
                  chartView === 'roi' 
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                ROI
              </button>
            </div>
          </div>
          
          {/* Отображаем график для сравнения рецептов */}
          <div className="h-72 mt-4">
            <EChartWrapper options={recipesChartOptions} />
          </div>
          
          <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
            Click on a recipe in the table below to see detailed analysis
          </div>
        </div>
      )}
      
      {/* Таблица рецептов */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-300 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Recipe Analysis</h2>
          
          <div className="flex items-center space-x-2">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
            >
              <option value="name">Name</option>
              <option value="profit">Profit</option>
              <option value="efficiency">Efficiency</option>
              <option value="roi">ROI</option>
              <option value="craftTime">Craft Time</option>
            </select>
            
            <button
              onClick={() => setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        
        {!recipes || recipes.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-500 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/30">
            No recipes available for analysis. Create some recipes first!
          </div>
        ) : sortedAnalysis.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-500 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-900/30">
            Cannot analyze recipes. Check console for errors.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recipe</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Result</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-green-500 dark:text-green-400 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wider">Efficiency</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wider">ROI</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedAnalysis.map(analysis => (
                  <tr 
                    key={analysis.recipeId} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                      selectedRecipeId === analysis.recipeId ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                    onClick={() => handleRecipeSelect(analysis.recipeId)}
                  >
                    <td className="px-4 py-3 text-sm font-medium">{analysis.recipeName}</td>
                    <td className="px-4 py-3 text-sm">{analysis.resultName}</td>
                    <td className="px-4 py-3 text-sm">
                      {analysis.bestVariant ? formatCraftTime(analysis.bestVariant.craftTime) : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {analysis.bestVariant ? Math.round(analysis.bestVariant.ingredientsCost) : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm">{Math.round(analysis.resultValue)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-green-500 dark:text-green-400">
                      {analysis.bestVariant ? 
                        `${analysis.bestVariant.profit > 0 ? '+' : ''}${Math.round(analysis.bestVariant.profit)}` 
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-blue-500 dark:text-blue-400">
                      {analysis.bestVariant ? 
                        `${analysis.bestVariant.efficiency.toFixed(1)}/min` 
                        : '--'}
                    </td>
                    <td className="px-4 py-3 text-sm text-purple-500 dark:text-purple-400">
                      {analysis.bestVariant ? 
                        `${(analysis.bestVariant.roi * 100).toFixed(1)}%` 
                        : '--'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Отображаем детальный анализ выбранного рецепта с графиками */}
      {selectedRecipe && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-300 dark:border-gray-700">
          <h2 className="text-lg font-semibold mb-4">{selectedRecipe.recipeName} - Detailed Analysis</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* График сравнения вариантов */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium mb-2">Variant Comparison</h3>
              <div className="h-64">
                <EChartWrapper options={variantsChartOptions} />
              </div>
            </div>
            
            {/* График состава ингредиентов */}
            <div className="bg-white dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
              <h3 className="text-md font-medium mb-2">Ingredients Cost Distribution</h3>
              <div className="h-64">
                <EChartWrapper options={ingredientsChartOptions} />
              </div>
            </div>
          </div>
          
          {/* Таблица вариантов */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Variant</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ingredients</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Cost</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-green-500 dark:text-green-400 uppercase tracking-wider">Profit</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wider">Efficiency</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {selectedRecipe.variants.map(variant => (
                  <tr 
                    key={variant.variantId} 
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      variant.variantId === selectedRecipe.bestVariant?.variantId ? 'bg-green-50 dark:bg-green-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-2 text-sm font-medium">
                      {variant.variantName}
                      {variant.variantId === selectedRecipe.bestVariant?.variantId && (
                        <span className="ml-2 text-green-500 dark:text-green-400">★ Best</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-sm">
                      <div className="space-y-1">
                        {variant.ingredients.map((ingredient, idx) => (
                          <div key={idx} className="flex justify-between text-xs">
                            <span>{ingredient.name} (T{ingredient.tier}) x{ingredient.amount}</span>
                            <span className="text-gray-500 dark:text-gray-400">({Math.round(ingredient.cost)})</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-sm">{Math.round(variant.ingredientsCost)}</td>
                    <td className="px-4 py-2 text-sm text-green-500 dark:text-green-400">
                      {variant.profit > 0 ? '+' : ''}{Math.round(variant.profit)}
                    </td>
                    <td className="px-4 py-2 text-sm text-blue-500 dark:text-blue-400">
                      {variant.efficiency.toFixed(1)}/min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}