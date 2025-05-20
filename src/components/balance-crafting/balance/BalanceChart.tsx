import { useMemo } from 'react';
import * as echarts from 'echarts';
import EChartWrapper from '../../common/EChartWrapper';
import { ItemData } from '../../../contexts/BalanceContext';

interface BalanceChartProps {
  items: ItemData[];
  getItemComponents: (item: ItemData) => any;
}

export default function BalanceChart({ items, getItemComponents }: BalanceChartProps) {
  // Подготавливаем данные для графика с использованием useMemo
  const chartOptions = useMemo((): echarts.EChartsOption => {
    if (items.length === 0) return {};

    // Получаем имена предметов для оси X
    const itemNames = items.map(item => item.name);
    
    // Получаем компоненты стоимости для стекового графика
    const componentData = items.map(item => {
      const components = getItemComponents(item);
      return {
        category: components.categoryComponent || 0,
        tier: components.tierComponent || 0,
        mechanic: components.mechanicComponent || 0,
        modifiers: components.modifiersComponent || 0,
        locations: components.locationsComponent || 0
      };
    });

    // Создаем массивы данных для каждого компонента
    const categoryData = componentData.map(comp => comp.category);
    const tierData = componentData.map(comp => comp.tier);
    const mechanicData = componentData.map(comp => comp.mechanic);
    const modifiersData = componentData.map(comp => comp.modifiers);
    const locationsData = componentData.map(comp => comp.locations);

    // Строим опции для ECharts
    return {
      tooltip: {
        trigger: 'axis' as const,
        axisPointer: {
          type: 'shadow' as const
        }
      },
      legend: {
        data: ['Категории', 'Тиры', 'Механики', 'Модификаторы', 'Локации']
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: itemNames
      },
      yAxis: {
        type: 'value' as const
      },
      series: [
        {
          name: 'Категории',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series' as const
          },
          data: categoryData,
          itemStyle: {
            color: 'rgba(54, 162, 235, 0.7)'
          }
        },
        {
          name: 'Тиры',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series' as const
          },
          data: tierData,
          itemStyle: {
            color: 'rgba(75, 192, 192, 0.7)'
          }
        },
        {
          name: 'Механики',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series' as const
          },
          data: mechanicData,
          itemStyle: {
            color: 'rgba(153, 102, 255, 0.7)'
          }
        },
        {
          name: 'Модификаторы',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series' as const
          },
          data: modifiersData,
          itemStyle: {
            color: 'rgba(255, 206, 86, 0.7)'
          }
        },
        {
          name: 'Локации',
          type: 'bar',
          stack: 'total',
          emphasis: {
            focus: 'series' as const
          },
          data: locationsData,
          itemStyle: {
            color: 'rgba(255, 99, 132, 0.7)'
          }
        }
      ]
    };
  }, [items, getItemComponents]);

  // Если предметов нет, показываем сообщение
  if (items.length === 0) {
    return (
      <div className="relative h-80 w-full">
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Нет предметов для сравнения</p>
        </div>
      </div>
    );
  }

  // Отображаем график через компонент-обертку
  return (
    <div className="relative h-80 w-full">
      <EChartWrapper 
        options={chartOptions} 
        style={{ height: '100%', width: '100%' }} 
      />
    </div>
  );
}