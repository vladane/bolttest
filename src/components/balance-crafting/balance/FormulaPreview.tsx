import { useBalance, ItemData } from '../../../contexts/BalanceContext';
import EChartWrapper from '../../common/EChartWrapper';
import { useMemo } from 'react';
import * as echarts from 'echarts';

export default function FormulaPreview({ item }: { item: ItemData }) {
  const balance = useBalance();
  const { currentConfig } = balance;
  const isDark = document.documentElement.classList.contains('dark');
  
  // Расчет компонентов без изменений
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
  
  // Добавляем вычисление модификатора подтипа
  const subTypeValue = item.subType && currentConfig.subTypeModifiers && currentConfig.subTypeModifiers[item.subType]
    ? currentConfig.subTypeModifiers[item.subType]
    : 1.0;
  
  // Рассчитываем компоненты формулы
  const categoryComponent = currentConfig.weights.categoryWeight * categoryValue;
  const tierComponent = currentConfig.weights.tierWeight * tierValue;
  const mechanicComponent = currentConfig.weights.mechanicWeight * mechanicValue;
  const modifiersComponent = currentConfig.weights.modifiersWeight * modifiersValue;
  const locationsComponent = currentConfig.weights.locationsWeight * locationsValue;
  const frequencyComponent = (currentConfig.weights.frequencyWeight || 0) * frequencyValue;
  const craftComplexityComponent = (currentConfig.weights.craftComplexityWeight || 0) * craftComplexityValue;
  
  // Общая сумма компонентов
  const totalComponents = 
    categoryComponent + 
    tierComponent + 
    mechanicComponent + 
    modifiersComponent +
    locationsComponent +
    frequencyComponent +
    craftComplexityComponent;
  
  // Общая стоимость с учетом подтипа
  const totalValue = currentConfig.baseValue * totalComponents * subTypeValue;
  
  // Четко определяем цвета компонентов
  const componentColors = {
    category: '#8B5CF6',      // purple-500
    tier: '#10B981',          // green-500
    mechanic: '#3B82F6',      // blue-500
    modifiers: '#FBBF24',     // yellow-500
    locations: '#EF4444',     // red-500 
    frequency: '#EC4899',     // pink-500
    craftComplexity: '#F97316',// orange-500
    subType: '#06B6D4'        // cyan-500 для подтипа
  };
  
  // Подготавливаем данные ТОЛЬКО для горизонтальной диаграммы
  const barChartOptions = useMemo((): echarts.EChartsOption => {
    // Создаем массив компонентов для диаграммы
    const components = [
      { name: 'Категория', value: categoryComponent, color: componentColors.category },
      { name: 'Тир', value: tierComponent, color: componentColors.tier },
      { name: 'Механика', value: mechanicComponent, color: componentColors.mechanic },
      { name: 'Модификаторы', value: modifiersComponent, color: componentColors.modifiers },
      { name: 'Локации', value: locationsComponent, color: componentColors.locations },
      { name: 'Частота', value: frequencyComponent, color: componentColors.frequency },
      { name: 'Сложность крафта', value: craftComplexityComponent, color: componentColors.craftComplexity }
    ];
    
    // Добавляем компонент подтипа в диаграмму, если он отличается от 1.0
    if (subTypeValue !== 1.0) {
      components.push({ 
        name: 'Подтип', 
        value: totalComponents * (subTypeValue - 1), // влияние подтипа на общую сумму
        color: componentColors.subType 
      });
    }
    
    // Фильтруем и сортируем компоненты по убыванию значения
    const filteredComponents = components
      .filter(comp => comp.value > 0)
      .sort((a, b) => b.value - a.value);
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Влияние компонентов (сортировка)',
        left: 'center' as const,
        top: 0,
        textStyle: {
          fontSize: 14,
          color: isDark ? '#ccc' : '#333'
        }
      },
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const
        },
        formatter: function(params: any) {
          const data = Array.isArray(params) ? params[0] : params;
          const value = typeof data.value === 'number' ? data.value : 0;
          const percent = (value / totalComponents * 100).toFixed(1);
          return `${data.name}: ${value.toFixed(2)} (${percent}%)`;
        },
        backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#fff' : '#333'
        }
      },
      grid: {
        left: '3%',
        right: '28%',  // Оптимизировано для отображения меток
        bottom: '3%',
        top: '40px',   // Добавляем отступ сверху для заголовка
        containLabel: true
      },
      xAxis: {
        type: 'value' as const,
        axisLabel: {
          show: false
        },
        axisLine: {
          show: false
        },
        axisTick: {
          show: false
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'category' as const,
        data: filteredComponents.map(item => item.name),
        axisLabel: {
          color: isDark ? '#ccc' : '#333',
          fontSize: 12,
          padding: [0, 15, 0, 0],
          fontWeight: 'bold' as const
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        },
        axisTick: {
          show: false
        }
      },
      series: [
        {
          type: 'bar' as const,
          barWidth: '50%',
          data: filteredComponents.map(item => ({
            value: item.value,
            itemStyle: {
              color: item.color
            }
          })),
          label: {
            show: true,
            position: 'right' as const,
            distance: 10,
            formatter: function(params: any) {
              const value = typeof params.value === 'number' ? params.value : 0;
              const percent = (value / totalComponents * 100).toFixed(1);
              return `${value.toFixed(2)} (${percent}%)`;
            },
            color: isDark ? '#ccc' : '#333',
            fontSize: 12,
            fontWeight: 'bold' as const
          }
        }
      ]
    };
  }, [
    categoryComponent, 
    tierComponent, 
    mechanicComponent, 
    modifiersComponent, 
    locationsComponent, 
    frequencyComponent, 
    craftComplexityComponent,
    subTypeValue,
    totalComponents,
    isDark
  ]);

  return (
    <div className="mb-4">
      <h3 className="text-sm font-medium mb-2">Формула:</h3>
      <div className="p-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-600">
        {/* Одна горизонтальная диаграмма на весь блок */}
        <div className="h-56 mb-4">
          <EChartWrapper options={barChartOptions} style={{ height: '100%' }} />
        </div>
        
        <div className="text-xs font-mono">
          <h4 className="text-xs font-medium mb-1 text-gray-500 dark:text-gray-400">Детальный расчет:</h4>
          
          {/* Первая строка формулы с переносом */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-gray-500 dark:text-gray-400">Базовая</span>
            <span>×</span>
            <span className="text-gray-500 dark:text-gray-400">(</span>
            
            <span style={{color: componentColors.category}}>
              {currentConfig.weights.categoryWeight.toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.category}}>
              {categoryValue.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.tier}}>
              {currentConfig.weights.tierWeight.toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.tier}}>
              {tierValue.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.mechanic}}>
              {currentConfig.weights.mechanicWeight.toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.mechanic}}>
              {mechanicValue.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.modifiers}}>
              {currentConfig.weights.modifiersWeight.toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.modifiers}}>
              {modifiersValue.toFixed(2)}
            </span>
            
            <span>+</span>

            <span style={{color: componentColors.locations}}>
              {currentConfig.weights.locationsWeight.toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.locations}}>
              {locationsValue.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.frequency}}>
              {(currentConfig.weights.frequencyWeight || 0).toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.frequency}}>
              {frequencyValue.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.craftComplexity}}>
              {(currentConfig.weights.craftComplexityWeight || 0).toFixed(2)}
            </span>
            <span className="text-gray-500 dark:text-gray-400">×</span>
            <span style={{color: componentColors.craftComplexity}}>
              {craftComplexityValue.toFixed(2)}
            </span>
            
            <span className="text-gray-500 dark:text-gray-400">)</span>
          </div>
          
          {/* Вторая строка формулы */}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span>{currentConfig.baseValue}</span>
            <span>×</span>
            <span className="text-gray-500 dark:text-gray-400">(</span>
            
            <span style={{color: componentColors.category}}>
              {categoryComponent.toFixed(2)}
            </span>
            <span>+</span>
            
            <span style={{color: componentColors.tier}}>
              {tierComponent.toFixed(2)}
            </span>
            <span>+</span>
            
            <span style={{color: componentColors.mechanic}}>
              {mechanicComponent.toFixed(2)}
            </span>
            <span>+</span>
            
            <span style={{color: componentColors.modifiers}}>
              {modifiersComponent.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.locations}}>
              {locationsComponent.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.frequency}}>
              {frequencyComponent.toFixed(2)}
            </span>
            
            <span>+</span>
            
            <span style={{color: componentColors.craftComplexity}}>
              {craftComplexityComponent.toFixed(2)}
            </span>
            
            <span className="text-gray-500 dark:text-gray-400">)</span>
            
            {/* Добавляем множитель подтипа, если он отличается от 1.0 */}
            {subTypeValue !== 1.0 && (
              <>
                <span>×</span>
                <span style={{color: componentColors.subType}} title="Множитель подтипа">
                  {subTypeValue.toFixed(2)}
                </span>
              </>
            )}
          </div>
          
          {/* Третья строка формулы (с модификатором подтипа) */}
          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span>{currentConfig.baseValue}</span>
            <span>×</span>
            <span className="font-semibold">
              {totalComponents.toFixed(2)}
            </span>
            
            {/* Добавляем множитель подтипа, если он отличается от 1.0 */}
            {subTypeValue !== 1.0 && (
              <>
                <span>×</span>
                <span style={{color: componentColors.subType}} className="font-semibold">
                  {subTypeValue.toFixed(2)}
                </span>
              </>
            )}
            
            <span>=</span>
            <span className="font-bold text-lg">
              {Math.round(totalValue)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}