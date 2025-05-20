import { useState, useEffect, useMemo } from 'react';
import { useBalance, ItemData } from '../../../contexts/BalanceContext';
import FormulaPreview from './FormulaPreview';
import EChartWrapper from '../../common/EChartWrapper';
import ImageUpload from '../../common/ImageUpload';
import { useAppState } from '../../../contexts/AppStateContext';
import * as echarts from 'echarts';

export default function ItemCostCalculator() {
  const balance = useBalance();
  const { state } = useAppState();
  const { currentConfig, calculateItemCost, addItemToComparison } = balance;
  
  const [item, setItem] = useState<ItemData>({
    name: '',
    selectedCategories: [],
    tier: 1,
    mechanic: Object.keys(currentConfig.mechanics)[0] || '',
    selectedModifiers: [],
    selectedLocations: [],
    frequencyType: Object.keys(currentConfig.frequencyTypes)[0] || '',
    craftComplexity: Object.keys(currentConfig.craftComplexityTypes)[0] || '',
    imageId: null // Добавляем поле для хранения ID изображения
  });
  
  const [calculatedCost, setCalculatedCost] = useState<number>(0);
  const [historicalCosts, setHistoricalCosts] = useState<Array<{label: string, value: number}>>([]);
  // Удалена неиспользуемая переменная parametersHistory
  
  // Функция для получения URL изображения
  const getImageUrl = (imageId: string | null): string | null => {
    if (!imageId) return null;
    
    // Проверяем imageMap в resources
    const resourceImage = state.resources.imageMap.get(imageId);
    if (resourceImage) {
      return `data:${resourceImage.type};base64,${resourceImage.data}`;
    }
    
    // Проверяем imageMap в units
    const unitImage = state.units.imageMap.get(imageId);
    if (unitImage) {
      return `data:${unitImage.type};base64,${unitImage.data}`;
    }
    
    return null;
  };
  
  // Функция обработчика загрузки изображений
  const handleImageUpload = (imageId: string) => {
    setItem(prev => ({ ...prev, imageId }));
    addParameterHistory('Image', 'Uploaded new image');
  };
  
  // Обновляем стоимость при изменении данных
  useEffect(() => {
    const newCost = calculateItemCost(item);
    setCalculatedCost(newCost);
    
    // Добавляем в историю изменений только при существенном изменении
    if (Math.abs(newCost - (historicalCosts[historicalCosts.length - 1]?.value || 0)) > 1) {
      // Ограничиваем историю 10 последними значениями
      const label = new Date().toLocaleTimeString();
      setHistoricalCosts(prev => [...prev.slice(-9), { label, value: newCost }]);
    }
  }, [item, calculateItemCost, historicalCosts]);
  
  // Рассчитываем разбивку стоимости по компонентам
  const costComponents = useMemo(() => {
    // Рассчитываем влияние категорий
    const categorySum = item.selectedCategories.reduce((sum, cat) => {
      return sum + (currentConfig.categories[cat] || 0);
    }, 0);
    
    const categoryValue = item.selectedCategories.length > 0 
      ? categorySum / item.selectedCategories.length 
      : 0;
      
    const tierValue = 1 + (item.tier - 1) * currentConfig.tierMultiplier;
    const mechanicValue = currentConfig.mechanics[item.mechanic] || 1;
    
    const modifiersSum = item.selectedModifiers.reduce((sum, mod) => {
      return sum + (currentConfig.modifiers[mod] || 0);
    }, 0);

    const locationsSum = item.selectedLocations.reduce((sum, loc) => {
      return sum + (currentConfig.locations[loc] || 0);
    }, 0);

    const locationsValue = item.selectedLocations.length > 0 
      ? locationsSum / item.selectedLocations.length 
      : 1;
    
    const modifiersValue = item.selectedModifiers.length > 0 
      ? modifiersSum / item.selectedModifiers.length 
      : 1;
    
    const frequencyValue = currentConfig.frequencyTypes[item.frequencyType] || 1.0;
    const craftComplexityValue = currentConfig.craftComplexityTypes[item.craftComplexity] || 1.0;
    
    // Рассчитываем компоненты формулы
    const categoryComponent = currentConfig.weights.categoryWeight * categoryValue;
    const tierComponent = currentConfig.weights.tierWeight * tierValue;
    const mechanicComponent = currentConfig.weights.mechanicWeight * mechanicValue;
    const modifiersComponent = currentConfig.weights.modifiersWeight * modifiersValue;
    const locationsComponent = currentConfig.weights.locationsWeight * locationsValue;
    const frequencyComponent = (currentConfig.weights.frequencyWeight || 0) * frequencyValue;
    const craftComplexityComponent = (currentConfig.weights.craftComplexityWeight || 0) * craftComplexityValue;
    
    return {
      categoryComponent: Math.round(currentConfig.baseValue * categoryComponent),
      tierComponent: Math.round(currentConfig.baseValue * tierComponent),
      mechanicComponent: Math.round(currentConfig.baseValue * mechanicComponent),
      modifiersComponent: Math.round(currentConfig.baseValue * modifiersComponent),
      locationsComponent: Math.round(currentConfig.baseValue * locationsComponent),
      frequencyComponent: Math.round(currentConfig.baseValue * frequencyComponent),
      craftComplexityComponent: Math.round(currentConfig.baseValue * craftComplexityComponent)
    };
  }, [item, currentConfig]);
  
 // Окончательная версия диаграммы компонентов стоимости
const componentChartOptions = useMemo((): echarts.EChartsOption => {
  const isDark = document.documentElement.classList.contains('dark');
  
  // Определяем цвета компонентов
  const componentColors = {
    tier: '#10B981',          // green-500
    mechanic: '#3B82F6',      // blue-500
    modifiers: '#FBBF24',     // yellow-500
    locations: '#EF4444',     // red-500 
    frequency: '#EC4899',     // pink-500
    craftComplexity: '#F97316'// orange-500
  };
  
  // Создаем массив компонентов
  const components = [
    { name: 'Тир', value: costComponents.tierComponent, color: componentColors.tier },
    { name: 'Механика', value: costComponents.mechanicComponent, color: componentColors.mechanic },
    { name: 'Модификаторы', value: costComponents.modifiersComponent, color: componentColors.modifiers },
    { name: 'Локации', value: costComponents.locationsComponent, color: componentColors.locations },
    { name: 'Частота', value: costComponents.frequencyComponent, color: componentColors.frequency },
    { name: 'Сложность крафта', value: costComponents.craftComplexityComponent, color: componentColors.craftComplexity }
  ];
  
  // Фильтруем компоненты без значений
  const filteredComponents = components.filter(comp => comp.value > 0);
  
  // Если нет данных, показываем заглушку
  if (filteredComponents.length === 0) {
    return {
      title: {
        text: 'Нет данных для отображения',
        textStyle: {
          color: isDark ? '#ccc' : '#333',
          fontSize: 14
        },
        left: 'center' as const,
        top: 'middle' as const
      }
    };
  }
  
  // Сумма всех компонентов для процентов
  const totalValue = filteredComponents.reduce((sum, item) => sum + item.value, 0);
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      show: true, // Включаем подсказки только при наведении
      trigger: 'item' as const,
      formatter: function(params: any) {
        const value = typeof params.value === 'number' ? params.value : 0;
        const percent = (value / totalValue * 100).toFixed(1);
        return `${params.name}: ${value} (${percent}%)`;
      },
      backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
      borderColor: isDark ? '#555' : '#ddd',
      textStyle: {
        color: isDark ? '#fff' : '#333'
      }
    },
    legend: {
      orient: 'vertical' as const,
      right: 0,
      top: 'middle' as const,
      itemGap: 6,
      itemWidth: 10,
      itemHeight: 10,
      textStyle: {
        fontSize: 10,
        color: isDark ? '#ccc' : '#333'
      },
      formatter: function(name: string) {
        // Находим компонент и рассчитываем процент
        const item = filteredComponents.find(c => c.name === name);
        if (!item) return name;
        const percent = (item.value / totalValue * 100).toFixed(1);
        return `${name}: ${percent}%`;
      }
    },
    series: [
      {
        type: 'pie' as const,
        radius: ['40%', '100%'],
        center: ['35%', '50%'], 
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 3,
          borderColor: isDark ? '#333' : '#fff',
          borderWidth: 1
        },
        // ПОЛНОСТЬЮ отключаем метки на диаграмме
        label: {
          show: false
        },
        labelLine: {
          show: false
        },
        // Отключаем эффекты при наведении/выборе
        emphasis: {
          scale: false,
          focus: 'none' as const
        },
        select: {
          disabled: true
        },
        selectedMode: false, // Отключаем возможность выбора
        stillShowZeroSum: false,
        animation: false, // Отключаем анимацию
        animationDuration: 0,
        data: filteredComponents.map(item => ({
          value: item.value,
          name: item.name,
          itemStyle: {
            color: item.color
          },
          tooltip: {
            formatter: function(params: any) {
              const value = typeof params.value === 'number' ? params.value : 0;
              return `${item.name}: ${value} (${(value / totalValue * 100).toFixed(1)}%)`;
            }
          }
        }))
      }
    ]
  };
}, [costComponents]);

// Улучшенные опции для графика истории изменений
const historyChartOptions = useMemo((): echarts.EChartsOption => {
  if (historicalCosts.length < 2) {
    // Если недостаточно данных, создаем заглушку
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Изменяйте параметры для отображения истории',
        textStyle: {
          color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333',
          fontSize: 12,
          fontWeight: 'normal' as const
        },
        left: 'center' as const,
        top: 'middle' as const
      }
    };
  }
  
  const isDark = document.documentElement.classList.contains('dark');
  
  // Форматирование меток времени для экономии места
  const formattedLabels = historicalCosts.map(item => {
    // Извлекаем только часы:минуты из временной метки
    const timeParts = item.label.split(':');
    if (timeParts.length >= 2) {
      return `${timeParts[0]}:${timeParts[1]}`;
    }
    return item.label;
  });
  
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis' as const,
      formatter: function(params: any) {
        const paramArray = Array.isArray(params) ? params : [params];
        const data = paramArray[0].data;
        return `Стоимость: ${data}`;
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
      bottom: '5%', // Увеличиваем отступ снизу для меток
      top: '15%',    // Увеличиваем отступ сверху для заголовка
      containLabel: true
    },
    xAxis: {
      type: 'category' as const,
      data: formattedLabels, // Используем укороченные метки
      axisLabel: {
        color: isDark ? '#ccc' : '#333',
        interval: 'auto', // Автоматический интервал меток
        rotate: 45,       // Меньший угол наклона
        fontSize: 9,      // Очень маленький шрифт
        margin: 8,        // Меньше отступа
        hideOverlap: true // Скрываем перекрывающиеся метки
      },
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
        }
      },
      splitLine: {
        show: false
      }
    },
    yAxis: {
      type: 'value' as const,
      name: 'Cost',
      nameLocation: 'end' as const,
      nameGap: 10,
      nameTextStyle: {
        color: isDark ? '#ccc' : '#333',
        fontSize: 10     // Меньший шрифт
      },
      axisLabel: {
        color: isDark ? '#ccc' : '#333',
        fontSize: 10,    // Меньший шрифт
        margin: 4        // Меньший отступ
      },
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'
        }
      }
    },
    series: [
      {
        data: historicalCosts.map(item => item.value),
        type: 'line' as const,
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,      // Меньший размер маркеров
        lineStyle: {
          color: '#5D5CDE',
          width: 2          // Тоньше линия
        },
        itemStyle: {
          color: '#5D5CDE',
          borderWidth: 1,   // Тоньше граница
          borderColor: isDark ? '#333' : '#fff'
        },
        areaStyle: {
          opacity: 0.5,     // Менее интенсивная заливка
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(93, 92, 222, 0.4)' },
            { offset: 1, color: 'rgba(93, 92, 222, 0.05)' }
          ])
        }
      }
    ]
  };
}, [historicalCosts]);

// Полностью переработанная радарная диаграмма с безопасной конфигурацией
const radarChartOptions = useMemo((): echarts.EChartsOption => {
  const isDark = document.documentElement.classList.contains('dark');

  // Безопасно получаем максимальные значения с проверками на undefined
  const maxTier = 10;
  const maxCategory = Math.max(1, ...Object.values(currentConfig?.categories || {}));
  const maxMechanic = Math.max(1, ...Object.values(currentConfig?.mechanics || {}));
  const maxModifier = Math.max(1, ...Object.values(currentConfig?.modifiers || {}));
  const maxLocation = Math.max(1, ...Object.values(currentConfig?.locations || {}));
  const maxFrequency = Math.max(1, ...Object.values(currentConfig?.frequencyTypes || {}));
  const maxCraftComplexity = Math.max(1, ...Object.values(currentConfig?.craftComplexityTypes || {}));
  
  // Безопасно получаем текущие значения с проверками на undefined
  const categoryValue = item?.selectedCategories?.length > 0 
    ? item.selectedCategories.reduce((sum, cat) => sum + (currentConfig?.categories?.[cat] || 0), 0) / item.selectedCategories.length 
    : 0;
  const mechanicValue = (currentConfig?.mechanics?.[item?.mechanic || ''] || 0);
  const modifierValue = item?.selectedModifiers?.length > 0
    ? item.selectedModifiers.reduce((sum, mod) => sum + (currentConfig?.modifiers?.[mod] || 0), 0) / item.selectedModifiers.length
    : 0;
  const locationValue = item?.selectedLocations?.length > 0
    ? item.selectedLocations.reduce((sum, loc) => sum + (currentConfig?.locations?.[loc] || 0), 0) / item.selectedLocations.length
    : 0;
  const frequencyValue = (currentConfig?.frequencyTypes?.[item?.frequencyType || ''] || 0);
  const craftComplexityValue = (currentConfig?.craftComplexityTypes?.[item?.craftComplexity || ''] || 0);
  
  // Создаем безопасный массив значений
  const dataValues = [
    item?.tier || 0,
    categoryValue || 0,
    mechanicValue || 0,
    modifierValue || 0,
    locationValue || 0,
    frequencyValue || 0,
    craftComplexityValue || 0
  ];
  
  // Определяем индикаторы для радара
  const indicators = [
    { name: 'Тир', max: maxTier },
    { name: 'Категория', max: maxCategory },
    { name: 'Механика', max: maxMechanic },
    { name: 'Модификаторы', max: maxModifier },
    { name: 'Локации', max: maxLocation },
    { name: 'Частота', max: maxFrequency },
    { name: 'Сложность', max: maxCraftComplexity }
  ];
  
  // Явно определяем все необходимые свойства
  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item' as const,
      formatter: function(params: any) {
        if (!params || !params.value || !Array.isArray(params.value)) {
          return '';
        }
        
        let html = `<div style="font-weight:bold;margin-bottom:4px">${item?.name || 'Текущий предмет'}</div>`;
        
        // Безопасно формируем tooltip с проверками индексов
        for (let i = 0; i < params.value.length && i < indicators.length; i++) {
          const val = params.value[i] as number;
          const ind = indicators[i];
          const percent = ind.max > 0 ? Math.round((val / ind.max) * 100) : 0;
          
          html += `<div style="display:flex;justify-content:space-between;margin:2px 0">
            <span>${ind.name}:</span>
            <span style="font-weight:bold;margin-left:8px">${val.toFixed(2)} / ${ind.max.toFixed(2)} (${percent}%)</span>
          </div>`;
        }
        
        return html;
      }
    },
    radar: {
      indicator: indicators,
      shape: 'polygon' as const,
      splitNumber: 4,
      axisName: {
        color: isDark ? '#eee' : '#333',
        fontSize: 14,
        // Удаление несуществующего свойства textShadow
      },
      radius: '75%',
      center: ['50%', '50%'],
      splitLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
        }
      },
      splitArea: {
        show: true,
        areaStyle: {
          color: isDark 
            ? ['rgba(255, 255, 255, 0.03)', 'rgba(255, 255, 255, 0.08)']
            : ['rgba(0, 0, 0, 0.02)', 'rgba(0, 0, 0, 0.05)']
        }
      },
      axisLine: {
        lineStyle: {
          color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.3)'
        }
      }
    },
    series: [
      {
        type: 'radar' as const,
        name: item?.name || 'Текущий предмет',
        data: [
          {
            value: dataValues,
            name: item?.name || 'Текущий предмет',
            areaStyle: {
              // Простая полупрозрачная заливка вместо градиента
              color: 'rgba(93, 92, 222, 0.6)'
            },
            lineStyle: {
              width: 2,
              color: '#8B83FF'
            },
            symbol: 'circle',
            symbolSize: 8,
            itemStyle: {
              color: '#8B83FF'
            }
          }
        ]
      }
    ]
  };
}, [item, currentConfig]);
  
  // Обработчик изменения имени
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setItem(prev => ({ ...prev, name: e.target.value }));
    addParameterHistory('Name', e.target.value);
  };
  
  // Обработчик изменения тира
  const handleTierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tier = parseInt(e.target.value);
    setItem(prev => ({ ...prev, tier: isNaN(tier) ? 1 : Math.min(10, Math.max(1, tier)) }));
    addParameterHistory('Tier', e.target.value);
  };
  
  // Обработчик изменения механики
  const handleMechanicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItem(prev => ({ ...prev, mechanic: e.target.value }));
    addParameterHistory('Mechanic', e.target.value);
  };
  
  // Добавляем обработчики для новых полей
  const handleFrequencyChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItem(prev => ({ ...prev, frequencyType: e.target.value }));
    addParameterHistory('Frequency', e.target.value);
  };
  
  const handleCraftComplexityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setItem(prev => ({ ...prev, craftComplexity: e.target.value }));
    addParameterHistory('Craft Complexity', e.target.value);
  };
  
  // Обработчик выбора категорий
  const handleCategoryToggle = (category: string) => {
    setItem(prev => {
      const isSelected = prev.selectedCategories.includes(category);
      
      if (isSelected) {
        addParameterHistory('Category', `Removed ${category}`);
        return {
          ...prev,
          selectedCategories: prev.selectedCategories.filter(c => c !== category)
        };
      } else {
        addParameterHistory('Category', `Added ${category}`);
        return {
          ...prev,
          selectedCategories: [...prev.selectedCategories, category]
        };
      }
    });
  };
  
  // Обработчик выбора модификаторов
  const handleModifierToggle = (modifier: string) => {
    setItem(prev => {
      const isSelected = prev.selectedModifiers.includes(modifier);
      
      if (isSelected) {
        addParameterHistory('Modifier', `Removed ${modifier}`);
        return {
          ...prev,
          selectedModifiers: prev.selectedModifiers.filter(m => m !== modifier)
        };
      } else {
        addParameterHistory('Modifier', `Added ${modifier}`);
        return {
          ...prev,
          selectedModifiers: [...prev.selectedModifiers, modifier]
        };
      }
    });
  };

  // Обработчик выбора локаций
  const handleLocationToggle = (location: string) => {
    setItem(prev => {
      const isSelected = prev.selectedLocations.includes(location);
      
      if (isSelected) {
        addParameterHistory('Location', `Removed ${location}`);
        return {
          ...prev,
          selectedLocations: prev.selectedLocations.filter(l => l !== location)
        };
      } else {
        addParameterHistory('Location', `Added ${location}`);
        return {
          ...prev,
          selectedLocations: [...prev.selectedLocations, location]
        };
      }
    });
  };
  
  // Добавление истории изменения параметров
  const addParameterHistory = (parameter: string, value: string) => {
    // Функция оставлена для совместимости, но не использует состояние
    console.log(`Parameter changed: ${parameter} = ${value}`);
  };
  
  // Добавление предмета в список для сравнения
  const handleAddToComparison = () => {
    if (!item.name.trim()) {
      alert('Please enter an item name');
      return;
    }
    
    addItemToComparison({ ...item });
  };
  
  // Генерация случайного предмета для быстрого тестирования
  const generateRandomItem = () => {
    const categories = Object.keys(currentConfig.categories);
    const mechanics = Object.keys(currentConfig.mechanics);
    const modifiers = Object.keys(currentConfig.modifiers);
    const locations = Object.keys(currentConfig.locations);
    const frequencies = Object.keys(currentConfig.frequencyTypes);
    const complexities = Object.keys(currentConfig.craftComplexityTypes);
    
    const getRandomElements = (array: string[], count: number) => {
      const shuffled = [...array].sort(() => 0.5 - Math.random());
      return shuffled.slice(0, Math.min(count, array.length));
    };
    
    const randomItem: ItemData = {
      name: `Item ${Math.floor(Math.random() * 1000)}`,
      tier: Math.floor(Math.random() * 10) + 1,
      mechanic: mechanics[Math.floor(Math.random() * mechanics.length)],
      selectedCategories: getRandomElements(categories, Math.floor(Math.random() * 3) + 1),
      selectedModifiers: getRandomElements(modifiers, Math.floor(Math.random() * 2)),
      selectedLocations: getRandomElements(locations, Math.floor(Math.random() * 2)),
      frequencyType: frequencies[Math.floor(Math.random() * frequencies.length)],
      craftComplexity: complexities[Math.floor(Math.random() * complexities.length)],
      imageId: null // Изображение не генерируем случайно
    };
    
    setItem(randomItem);
  };
  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Item Details</h2>
            <button
              onClick={generateRandomItem}
              className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-600 rounded hover:bg-gray-300 dark:hover:bg-gray-500"
            >
              Generate Random
            </button>
          </div>
          
          <div className="space-y-4">
            {/* Добавляем компонент загрузки изображения */}
            <div>
              <label className="block text-sm font-medium mb-1">Item Image</label>
              <ImageUpload 
                onImageUpload={handleImageUpload}
                currentImageId={item.imageId}
                size="lg"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Item Name</label>
              <input
                type="text"
                value={item.name}
                onChange={handleNameChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                placeholder="Enter item name"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tier (1-10)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={item.tier}
                onChange={handleTierChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Acquisition Mechanic</label>
              <select
                value={item.mechanic}
                onChange={handleMechanicChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                {Object.keys(currentConfig.mechanics).map((mechanic: string) => (
                  <option key={mechanic} value={mechanic}>
                    {mechanic} (×{currentConfig.mechanics[mechanic]})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Новые поля выбора */}
            <div>
              <label className="block text-sm font-medium mb-1">Встречаемость объекта</label>
              <select
                value={item.frequencyType}
                onChange={handleFrequencyChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                {Object.entries(currentConfig.frequencyTypes).map(([type, value]) => (
                  <option key={type} value={type}>
                    {type} (×{value})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Сложность крафта</label>
              <select
                value={item.craftComplexity}
                onChange={handleCraftComplexityChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              >
                {Object.entries(currentConfig.craftComplexityTypes).map(([type, value]) => (
                  <option key={type} value={type}>
                    {type} (×{value})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Item Categories</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(currentConfig.categories).map((category: string) => (
                  <div key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`category-${category}`}
                      checked={item.selectedCategories.includes(category)}
                      onChange={() => handleCategoryToggle(category)}
                      className="h-4 w-4 text-primary rounded"
                    />
                    <label htmlFor={`category-${category}`} className="ml-2 text-sm">
                      {category} (×{currentConfig.categories[category]})
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Modifiers</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(currentConfig.modifiers).map((modifier: string) => (
                  <div key={modifier} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`modifier-${modifier}`}
                      checked={item.selectedModifiers.includes(modifier)}
                      onChange={() => handleModifierToggle(modifier)}
                      className="h-4 w-4 text-primary rounded"
                    />
                    <label htmlFor={`modifier-${modifier}`} className="ml-2 text-sm">
                      {modifier} (×{currentConfig.modifiers[modifier]})
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Locations</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {Object.keys(currentConfig.locations).map((location: string) => (
                  <div key={location} className="flex items-center">
                    <input
                      type="checkbox"
                      id={`location-${location}`}
                      checked={item.selectedLocations.includes(location)}
                      onChange={() => handleLocationToggle(location)}
                      className="h-4 w-4 text-primary rounded"
                    />
                    <label htmlFor={`location-${location}`} className="ml-2 text-sm">
                      {location} (×{currentConfig.locations[location]})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Раздел визуализации параметров - с увеличенным размером */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* ... (существующий содержание) ... */}
            
            {/* Раздел визуализации параметров с полной шириной */}
            <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg"> {/* Увеличен отступ с 4 до 6 */}
              <h2 className="text-lg font-semibold mb-4">Item Parameters Visualization</h2>
              <div className="h-80">
                <EChartWrapper 
                  options={radarChartOptions} 
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 text-center italic">
                Наведите курсор на точки для получения подробной информации
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="space-y-6">
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Cost Calculation</h2>
          
          {/* Отображаем предпросмотр предмета с изображением */}
          <div className="mb-4 flex items-center space-x-3">
            {item.imageId && getImageUrl(item.imageId) && (
              <div className="w-12 h-12 rounded overflow-hidden bg-gray-200 dark:bg-gray-800 flex-shrink-0">
                <img 
                  src={getImageUrl(item.imageId) || undefined} 
                  alt={item.name} 
                  className="w-full h-full object-cover" 
                />
              </div>
            )}
            <div>
              <div className="font-medium">{item.name || 'Unnamed Item'}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">Tier {item.tier}</div>
            </div>
          </div>
          
          <FormulaPreview item={item} />
          
          <div className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Calculated Cost:</div>
            <div className="text-3xl font-bold text-primary">{calculatedCost}</div>
          </div>
          
          <button
            onClick={handleAddToComparison}
            className="mt-4 w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
          >
            Add to Comparison
          </button>
        </div>
        
        {/* Секции Cost Breakdown и Cost History */}
        <div className="space-y-4">
          {/* Секция Cost Breakdown */}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <h2 className="text-lg font-semibold mb-2">Cost Breakdown</h2>
              <div className="h-36 w-full max-w-full overflow-hidden"> {/* Еще меньше высота + max-width */}
                <EChartWrapper 
                  options={componentChartOptions} 
                  style={{ height: '100%', width: '100%' }}
                />
              </div>
            </div>
          
          {/* Секция Cost History */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-2">Cost History</h2>
            <div className="h-40"> {/* Просто уменьшенная высота без нижнего отступа */}
              <EChartWrapper 
                options={historyChartOptions}
                style={{ height: '100%', width: '100%' }}
              />
            </div>
            {/* Удаляем секцию Recent Changes полностью */}
          </div>
        </div>
      </div>
    </div>
  );
}