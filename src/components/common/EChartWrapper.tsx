import React, { useEffect, useRef, useState } from 'react';
import * as echarts from 'echarts';
import ErrorBoundary from './ErrorBoundary';

// Обновляем интерфейс EChartWrapperProps, добавляя свойство onChartInit
interface EChartWrapperProps {
  options: echarts.EChartsOption;
  style?: React.CSSProperties;
  className?: string;
  theme?: string;
  onEvents?: Record<string, Function>;
  onChartInit?: (chart: echarts.ECharts) => void; // Добавляем поддержку callback при инициализации
}

/**
 * Функция для проверки и исправления опций ECharts
 */
function validateOptions(options: echarts.EChartsOption): echarts.EChartsOption {
  try {
    // Создаем копию опций, чтобы не изменять оригинал
    const validOptions: echarts.EChartsOption = { ...options };
    
    // Проверяем series - самый частый источник ошибок
    if (validOptions.series) {
      // Если series не массив, делаем его массивом
      if (!Array.isArray(validOptions.series)) {
        validOptions.series = [validOptions.series];
      }
      
      // Проверяем каждую серию на наличие необходимых свойств
      validOptions.series = validOptions.series.map((series) => {
        if (!series) {
          return { type: 'line', data: [] };
        }
        
        const seriesObj = series as any;
        
        // Проверяем наличие обязательного свойства type
        if (!seriesObj.type) {
          console.warn('Series missing type, defaulting to line');
          seriesObj.type = 'line';
        }
        
        // Проверяем data для разных типов диаграмм
        if (['line', 'bar', 'scatter', 'pie'].includes(seriesObj.type) && !seriesObj.data) {
          seriesObj.data = [];
        }
        
        // Для радарной диаграммы проверяем наличие data и value
        if (seriesObj.type === 'radar') {
          if (!seriesObj.data) {
            seriesObj.data = [{ value: [0], name: 'No data' }];
          } else if (Array.isArray(seriesObj.data)) {
            seriesObj.data = seriesObj.data.map((item: any) => {
              if (!item) return { value: [0], name: 'No data' };
              if (!item.value) item.value = [0];
              return item;
            });
          }
        }
        
        return seriesObj;
      });
    }
    
    // Проверяем radar конфигурацию, если есть радарная диаграмма
    const hasRadarChart = validOptions.series && Array.isArray(validOptions.series) &&
      validOptions.series.some((s: any) => s.type === 'radar');
    
    // Безопасно проверяем и устанавливаем индикаторы для радарной диаграммы
    if (hasRadarChart) {
      const radarOpt = validOptions.radar as any;
      if (!radarOpt || !radarOpt.indicator || !Array.isArray(radarOpt.indicator) || radarOpt.indicator.length === 0) {
        validOptions.radar = {
          ...(validOptions.radar || {}),
          indicator: [{ name: 'Default', max: 10 }]
        };
      }
    }
    
    return validOptions;
  } catch (error) {
    console.error('Error validating options:', error);
    // Возвращаем простые безопасные опции в случае ошибки
    return {
      series: [{ type: 'line', data: [] }]
    };
  }
}

const EChartWrapperInternal: React.FC<EChartWrapperProps> = ({
  options,
  style = { height: '300px', width: '100%' },
  className = '',
  theme,
  onEvents = {},
  onChartInit, // Добавляем обработку нового пропса
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  // Инициализация графика
  useEffect(() => {
    if (!chartRef.current) return;
    
    try {
      // Получаем текущую тему
      const isDarkMode = document.documentElement.classList.contains('dark');
      const themeToUse = theme || (isDarkMode ? 'dark' : 'light');
      
      // Если график уже существует, удаляем его перед пересозданием
      if (chartInstance.current) {
        chartInstance.current.dispose();
      }
      
      // Создаем новый экземпляр с правильной темой и дополнительными опциями
      chartInstance.current = echarts.init(chartRef.current, themeToUse, {
        renderer: 'canvas', // canvas обычно лучше работает с событиями мыши
        useDirtyRect: false // отключаем оптимизацию для более надежной обработки событий
      });
      
      // Вызываем callback при инициализации, если он передан
      if (onChartInit && chartInstance.current) {
        onChartInit(chartInstance.current);
      }
      
      // Применяем базовые настройки темы
      const baseOptions: echarts.EChartsOption = {
        backgroundColor: 'transparent',
        textStyle: { 
          color: isDarkMode ? '#e5e7eb' : '#1f2937' 
        },
        legend: { 
          textStyle: { color: isDarkMode ? '#e5e7eb' : '#1f2937' } 
        },
        xAxis: { 
          axisLine: { lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' } },
          splitLine: { lineStyle: { color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } }
        },
        yAxis: { 
          axisLine: { lineStyle: { color: isDarkMode ? '#4b5563' : '#d1d5db' } },
          splitLine: { lineStyle: { color: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' } }
        },
        // Улучшенные настройки tooltip для всех типов графиков
        tooltip: {
          show: true, // Явно включаем показ подсказок
          trigger: 'item', // По умолчанию для радарных и круговых диаграмм
          confine: true, // Ограничиваем подсказку в контейнере графика
          enterable: true, // Позволяем наводить курсор на подсказку
          backgroundColor: isDarkMode ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDarkMode ? '#555' : '#ddd',
          borderWidth: 1,
          padding: 8,
          textStyle: {
            color: isDarkMode ? '#fff' : '#333',
            fontSize: 12
          },
          extraCssText: 'box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3); z-index: 100;' // Повышаем z-index
        }
      };
      
      // Валидируем пользовательские опции перед использованием
      const validatedOptions = validateOptions(options);
      
      // Определяем, содержит ли options радарную диаграмму
      const hasRadarChart = validatedOptions.series && Array.isArray(validatedOptions.series) &&
        validatedOptions.series.some((s: any) => s.type === 'radar');
      
      // Специальные настройки для радарных диаграмм
      if (hasRadarChart) {
        // Расширяем базовые опции специфичными настройками для радара
        const radarBaseOptions: echarts.EChartsOption = {
          radar: {
            // Более явные настройки для радара, используя корректные свойства
            shape: 'polygon',
            splitNumber: 5,
            axisLine: {
              lineStyle: {
                color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
              }
            },
            // Настройки для улучшения отображения линий и областей
            splitLine: {
              show: true,
              lineStyle: {
                color: isDarkMode ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)'
              }
            },
            splitArea: {
              show: true,
              areaStyle: {
                color: isDarkMode ? ['rgba(255,255,255,0.03)', 'rgba(255,255,255,0.06)'] 
                               : ['rgba(0,0,0,0.02)', 'rgba(0,0,0,0.04)']
              }
            }
          }
        };
        
        Object.assign(baseOptions, radarBaseOptions);
        
        // Если у радарной диаграммы нет специфичных настроек tooltip,
        // устанавливаем явные настройки для радарного tooltip
        if (!validatedOptions.tooltip || (validatedOptions.tooltip && !(validatedOptions.tooltip as any).formatter)) {
          const tooltipOptions = {
            ...baseOptions.tooltip as any,
            formatter: function(params: any) {
              if (!params) return '';
              
              // Если передан массив параметров (например, при trigger: axis)
              let param: any;
              if (Array.isArray(params)) {
                param = params[0];
              } else {
                param = params;
              }
              
              if (!param || param.value === undefined) return '';
              
              const { name, value, dimensionNames } = param;
              let html = `<div style="font-weight:bold;margin-bottom:4px">${name || 'Параметры'}</div>`;
              
              // Если значение - массив (что чаще всего для радара)
              if (Array.isArray(value)) {
                const radarOption = (validatedOptions.radar as any) || {};
                const indicators = radarOption.indicator || [];
                
                // Проходим по всем значениям и добавляем их в подсказку
                value.forEach((val: number, idx: number) => {
                  const indicator = indicators[idx] || { name: `Параметр ${idx + 1}` };
                  const indicatorName = indicator.name || dimensionNames?.[idx] || `Параметр ${idx + 1}`;
                  const max = indicator.max || 0;
                  const percent = max > 0 ? Math.round((val / max) * 100) : 0;
                  
                  html += `<div style="display:flex;justify-content:space-between;margin:2px 0">
                    <span>${indicatorName}:</span>
                    <span style="font-weight:bold;margin-left:8px">${val.toFixed(2)}${max ? ` (${percent}%)` : ''}</span>
                  </div>`;
                });
              } else if (typeof value === 'number') {
                // Если значение - одиночное число
                html += `<div>${value}</div>`;
              } else {
                // Для других типов значений (объекты, строки)
                html += `<div>${JSON.stringify(value)}</div>`;
              }
              
              return html;
            }
          };
          
          baseOptions.tooltip = tooltipOptions;
        }
      }
      
      // Объединяем базовые настройки с пользовательскими опциями
      // Используем не deep merge, так как это может привести к неожиданным результатам с настройками tooltip
      const mergedOptions: echarts.EChartsOption = {
        ...baseOptions,
        ...validatedOptions
      };
      
      // Для радарных диаграмм делаем дополнительные меры предосторожности
      if (hasRadarChart) {
        // Обеспечиваем, что tooltip включен
        if (mergedOptions.tooltip) {
          (mergedOptions.tooltip as any).show = true;
        }
        
        // Обеспечиваем, что точки на радаре имеют достаточный размер
        if (mergedOptions.series) {
          (mergedOptions.series as any[]).forEach(series => {
            if (series.type === 'radar' && !series.symbolSize) {
              series.symbolSize = 8; // Устанавливаем минимальный размер точек
            }
          });
        }
      }
      
      // Устанавливаем объединенные опции
      chartInstance.current.setOption(mergedOptions, true);
      
      // Добавляем явный обработчик событий для подсказок
      chartInstance.current.on('mouseover', (params: any) => {
        console.log('Chart mouseover:', params);
      });
      
      // Регистрация пользовательских событий
      Object.entries(onEvents).forEach(([eventName, callback]) => {
        if (chartInstance.current) {
          chartInstance.current.on(eventName, (params: any) => {
            (callback as Function)(params);
          });
        }
      });
      
      // Обработчик изменения темы через системные настройки
      const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleSystemThemeChange = (e: MediaQueryListEvent) => {
        const newIsDark = e.matches;
        const currentIsDark = document.documentElement.classList.contains('dark');
        
        // Только если системное изменение темы совпадает с нашим классом
        if (newIsDark === currentIsDark) {
          // Пересоздаем график с новой темой
          if (chartInstance.current && chartRef.current) {
            chartInstance.current.dispose();
            chartInstance.current = echarts.init(
              chartRef.current, 
              newIsDark ? 'dark' : 'light'
            );
            
            // Обновляем базовые настройки темы
            const newBaseOptions: echarts.EChartsOption = {...baseOptions};
            
            // Безопасное обновление цветов с проверкой существования объектов
            if (newBaseOptions.textStyle) {
              newBaseOptions.textStyle.color = newIsDark ? '#e5e7eb' : '#1f2937';
            }
            
            if (newBaseOptions.legend && typeof newBaseOptions.legend === 'object') {
              const legendOpt = newBaseOptions.legend as echarts.LegendComponentOption;
              if (legendOpt.textStyle) {
                legendOpt.textStyle.color = newIsDark ? '#e5e7eb' : '#1f2937';
              }
            }
            
            if (newBaseOptions.xAxis) {
              const xAxisConfig = Array.isArray(newBaseOptions.xAxis) 
                ? newBaseOptions.xAxis[0] 
                : newBaseOptions.xAxis;
                
              if (xAxisConfig && xAxisConfig.axisLine && xAxisConfig.axisLine.lineStyle) {
                xAxisConfig.axisLine.lineStyle.color = newIsDark ? '#4b5563' : '#d1d5db';
              }
            }
            
            if (newBaseOptions.yAxis) {
              const yAxisConfig = Array.isArray(newBaseOptions.yAxis) 
                ? newBaseOptions.yAxis[0] 
                : newBaseOptions.yAxis;
                
              if (yAxisConfig && yAxisConfig.axisLine && yAxisConfig.axisLine.lineStyle) {
                yAxisConfig.axisLine.lineStyle.color = newIsDark ? '#4b5563' : '#d1d5db';
              }
            }
            
            // Объединяем обновленные базовые настройки с проверенными пользовательскими опциями
            const newValidatedOptions = validateOptions(options);
            const newMergedOptions = {
              ...newBaseOptions,
              ...newValidatedOptions
            };
            
            // Устанавливаем объединенные опции
            chartInstance.current.setOption(newMergedOptions, true);
            
            // Вызываем callback после переинициализации, если он передан
            if (onChartInit && chartInstance.current) {
              onChartInit(chartInstance.current);
            }
            
            // Перерегистрация событий
            Object.entries(onEvents).forEach(([eventName, callback]) => {
              if (chartInstance.current) {
                chartInstance.current.on(eventName, (params: any) => {
                  (callback as Function)(params);
                });
              }
            });
          }
        }
      };
      
      if (darkModeMediaQuery.addEventListener) {
        darkModeMediaQuery.addEventListener('change', handleSystemThemeChange);
      }
      
      // Создаем ResizeObserver для отслеживания изменений размера контейнера
      const resizeObserver = new ResizeObserver(() => {
        if (chartInstance.current) {
          chartInstance.current.resize();
        }
      });
      
      // Начинаем отслеживать изменения размера контейнера
      if (chartRef.current) {
        resizeObserver.observe(chartRef.current);
      }
      
      // Очистка при размонтировании
      return () => {
        if (chartInstance.current) {
          chartInstance.current.dispose();
        }
        chartInstance.current = null;
        if (darkModeMediaQuery.removeEventListener) {
          darkModeMediaQuery.removeEventListener('change', handleSystemThemeChange);
        }
        resizeObserver.disconnect();
      };
    } catch (error: unknown) {
      console.error('Error initializing chart:', error);
      setError(error instanceof Error ? error : new Error(String(error)));
    }
  }, [theme, options, onChartInit, onEvents]); // Добавляем onChartInit в зависимости

  // Обновление опций при изменении
  useEffect(() => {
    if (chartInstance.current && options) {
      try {
        // Валидируем опции перед обновлением
        const validatedOptions = validateOptions(options);
        
        // Используем notMerge: true для полной замены опций
        chartInstance.current.setOption(validatedOptions, { 
          notMerge: true,
          lazyUpdate: false,
          replaceMerge: ['tooltip', 'series', 'radar'] // Явная замена этих компонентов
        });
        
        // Принудительное обновление для гарантии отрисовки
        chartInstance.current.resize();
      } catch (err: unknown) {
        console.error('Error updating chart:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }, [options]);

  // Обработка изменения размера окна
  useEffect(() => {
    const handleResize = () => {
      if (chartInstance.current) {
        chartInstance.current.resize();
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
        <h3 className="font-medium mb-1">Проблема с отображением диаграммы</h3>
        <p className="text-xs">Ошибка: {error.message}</p>
      </div>
    );
  }

  return (
    <div
      ref={chartRef}
      className={`echarts-wrapper ${className}`}
      style={{
        ...style,
        position: 'relative', // Добавляем позиционирование для корректного размещения tooltip
        overflow: 'visible'   // Позволяем tooltip выходить за границы контейнера
      }}
    />
  );
};

// Оборачиваем компонент в ErrorBoundary
function EChartWrapper(props: EChartWrapperProps) {
  return (
    <ErrorBoundary fallback={
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-600 dark:text-red-400">
        <h3 className="font-medium mb-1">Проблема с отображением диаграммы</h3>
        <p className="text-xs">Произошла ошибка при рендеринге графика</p>
      </div>
    }>
      <EChartWrapperInternal {...props} />
    </ErrorBoundary>
  );
}

export default EChartWrapper;