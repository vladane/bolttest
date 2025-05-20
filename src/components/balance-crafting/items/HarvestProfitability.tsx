// src/components/balance-crafting/items/HarvestProfitability.tsx
import { useState, useMemo } from 'react';
import { useBalance } from '../../../contexts/BalanceContext';
import EChartWrapper from '../../common/EChartWrapper';

const HarvestProfitability = () => {
  const { comparisonItems, calculateSeasonalItemCost, getSeasonalProfitability, currentConfig } = useBalance();
  
  // Состояния для фильтрации и сортировки
  const [sortBy, setSortBy] = useState('overall'); // overall, spring, summer, autumn, winter
  const [filterSeason, setFilterSeason] = useState('all');
  const [filterTierMin, setFilterTierMin] = useState(1);
  const [filterTierMax, setFilterTierMax] = useState(5);
  const [chartType, setChartType] = useState<'bar' | 'radar'>('bar');
  
  // Получаем список сезонов
  const seasons = currentConfig.seasons || ['Весна', 'Лето', 'Осень', 'Зима'];
  
  // Фильтруем только урожайные предметы
  const harvestItems = useMemo(() => {
    return comparisonItems.filter(item => item.isHarvest);
  }, [comparisonItems]);
  
  // Применяем дополнительную фильтрацию
  const filteredItems = useMemo(() => {
    return harvestItems.filter(item => {
      // Фильтр по сезону выращивания
      if (filterSeason !== 'all') {
        if (!item.growingSeason || !item.growingSeason.includes(filterSeason)) {
          return false;
        }
      }
      
      // Фильтр по тиру
      if (item.tier < filterTierMin || item.tier > filterTierMax) {
        return false;
      }
      
      return true;
    });
  }, [harvestItems, filterSeason, filterTierMin, filterTierMax]);
  
  // Рассчитываем доходность по сезонам для всех урожайных предметов
  const profitabilityData = useMemo(() => {
    return filteredItems.map(item => {
      const seasonalProfits = getSeasonalProfitability(item);
      const currentSeasonProfit = calculateSeasonalItemCost(item) - (item.seedCost || 0);
      
      // Рассчитываем среднюю доходность по всем сезонам
      let totalProfit = 0;
      let seasons = 0;
      Object.entries(seasonalProfits).forEach(([_season, profit]) => {
        totalProfit += profit;
        seasons++;
      });
      
      const averageProfit = seasons > 0 ? totalProfit / seasons : 0;
      
      return {
        item,
        seasonalProfits,
        currentSeasonProfit,
        averageProfit,
        // Добавляем расчет ROI (Return on Investment)
        roi: item.seedCost ? ((calculateSeasonalItemCost(item) - item.seedCost) / item.seedCost) * 100 : 0,
        // Добавляем расчет доходности в день
        profitPerDay: item.growingTime ? (calculateSeasonalItemCost(item) - (item.seedCost || 0)) / item.growingTime : 0,
        // Время окупаемости - сколько дней нужно для окупаемости инвестиций
        paybackTime: item.seedCost && item.growingTime ? 
          (item.seedCost / ((calculateSeasonalItemCost(item) * (item.harvestPerSeason || 1)) / item.growingTime)) : 0
      };
    });
  }, [filteredItems, getSeasonalProfitability, calculateSeasonalItemCost]);
  
  // Сортируем данные в зависимости от выбранного критерия
  const sortedData = useMemo(() => {
    return [...profitabilityData].sort((a, b) => {
      switch(sortBy) {
        case 'overall':
          return b.averageProfit - a.averageProfit;
        case 'current':
          return b.currentSeasonProfit - a.currentSeasonProfit;
        case 'roi':
          return b.roi - a.roi;
        case 'profitPerDay':
          return b.profitPerDay - a.profitPerDay;
        case 'paybackTime':
          // Для времени окупаемости лучше меньшее значение
          return a.paybackTime - b.paybackTime;
        case 'growingTime':
          return (a.item.growingTime || 0) - (b.item.growingTime || 0);
        default:
          // Если выбран конкретный сезон, сортируем по прибыли в этом сезоне
          if (b.seasonalProfits[sortBy] !== undefined && a.seasonalProfits[sortBy] !== undefined) {
            return b.seasonalProfits[sortBy] - a.seasonalProfits[sortBy];
          }
          return 0;
      }
    });
  }, [profitabilityData, sortBy]);
  
  // Опции для графика
  const chartOptions = useMemo(() => {
    if (sortedData.length === 0) {
      return {
        title: {
          text: 'Нет данных для отображения',
          left: 'center',
          top: 'middle',
          textStyle: {
            color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333'
          }
        }
      };
    }
    
    // Выбираем только топ-8 культур для лучшей читаемости
    const topItems = sortedData.slice(0, 8);
    
    // Настраиваем цвета в зависимости от текущей темы
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Для гистограммы
    if (chartType === 'bar') {
      return {
        backgroundColor: 'transparent',
        title: {
          text: 'Доходность урожая по сезонам',
          left: 'center',
          textStyle: {
            color: textColor,
            fontWeight: 'bold' as const,
            fontSize: 16
          }
        },
        tooltip: {
          trigger: 'axis' as const,
          axisPointer: {
            type: 'shadow' as const
          },
          formatter: function(params: any) {
            let result = `<div style="font-weight:bold;margin-bottom:5px">${params[0].axisValue}</div>`;
            
            // Сортируем серии по убыванию значения
            params.sort((a: any, b: any) => b.value - a.value);
            
            params.forEach((param: any) => {
              const value = typeof param.value === 'number' ? param.value : 0;
              if (value > 0) {
                result += `<div style="display:flex;justify-content:space-between;margin:3px 0">
                  <div>
                    <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${param.color};margin-right:8px"></span>
                    <span>${param.seriesName}</span>
                  </div>
                  <div style="margin-left:20px;font-weight:bold">
                    ${value.toFixed(1)}
                  </div>
                </div>`;
              }
            });
            
            return result;
          },
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? '#555' : '#ddd',
          textStyle: {
            color: isDark ? '#fff' : '#333'
          }
        },
        legend: {
          data: topItems.map(d => d.item.name),
          orient: 'horizontal' as const,
          bottom: 10,
          textStyle: {
            color: textColor
          },
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 10
        },
        grid: {
          left: '3%',
          right: '4%',
          bottom: '15%',
          top: '15%',
          containLabel: true
        },
        xAxis: {
          type: 'category' as const,
          data: seasons,
          axisLabel: {
            color: textColor
          },
          axisLine: {
            lineStyle: {
              color: gridColor
            }
          }
        },
        yAxis: {
          type: 'value' as const,
          name: 'Прибыль в день',
          nameLocation: 'middle' as const,
          nameGap: 40,
          nameTextStyle: {
            color: textColor
          },
          axisLabel: {
            color: textColor
          },
          axisLine: {
            lineStyle: {
              color: gridColor
            }
          },
          splitLine: {
            lineStyle: {
              color: gridColor
            }
          }
        },
        series: topItems.map((data) => ({
          name: data.item.name,
          type: 'bar' as const,
          stack: 'total',
          emphasis: {
            focus: 'series' as const
          },
          data: seasons.map(season => {
            // Если культура не растет в этом сезоне, показываем 0
            if (data.item.growingSeason && !data.item.growingSeason.includes(season)) {
              return 0;
            }
            return data.seasonalProfits[season] || 0;
          })
        }))
      };
    } 
    // Для радарной диаграммы
    else {
      return {
        backgroundColor: 'transparent',
        title: {
          text: 'Сравнение доходности урожая',
          left: 'center',
          textStyle: {
            color: textColor,
            fontWeight: 'bold' as const,
            fontSize: 16
          }
        },
        tooltip: {
          trigger: 'item' as const,
          formatter: function(params: any) {
            const seriesName = params.seriesName;
            let result = `<div style="font-weight:bold;margin-bottom:5px">${seriesName}</div>`;
            
            // Получаем данные для всех сезонов
            const data = params.value;
            const indicators = (params.indicator || []).map((ind: any) => ind.name);
            
            indicators.forEach((season: string, index: number) => {
              const value = data[index];
              result += `<div style="display:flex;justify-content:space-between;margin:3px 0">
                <span>${season}</span>
                <span style="margin-left:20px;font-weight:bold">${value.toFixed(1)}</span>
              </div>`;
            });
            
            return result;
          },
          backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
          borderColor: isDark ? '#555' : '#ddd',
          textStyle: {
            color: isDark ? '#fff' : '#333'
          }
        },
        legend: {
          data: topItems.map(d => d.item.name),
          orient: 'horizontal' as const,
          bottom: 10,
          textStyle: {
            color: textColor
          },
          itemWidth: 12,
          itemHeight: 12,
          itemGap: 10
        },
        radar: {
          indicator: seasons.map(season => {
            // Находим максимальное значение для этого сезона
            const maxValue = Math.max(...topItems.map(data => 
              data.seasonalProfits[season] || 0
            ));
            return {
              name: season,
              max: maxValue * 1.2 // Увеличиваем максимум на 20% для лучшего отображения
            };
          }),
          center: ['50%', '50%'],
          radius: '65%',
          shape: 'circle' as const,
          splitArea: {
            areaStyle: {
              color: isDark 
                ? ['rgba(50, 50, 50, 0.3)', 'rgba(60, 60, 60, 0.3)']
                : ['rgba(250, 250, 250, 0.3)', 'rgba(240, 240, 240, 0.3)']
            }
          },
          axisLine: {
            lineStyle: {
              color: gridColor
            }
          },
          splitLine: {
            lineStyle: {
              color: gridColor
            }
          },
          axisName: {
            color: textColor,
            fontSize: 12
          }
        },
        series: [{
          type: 'radar' as const,
          emphasis: {
            lineStyle: {
              width: 4
            }
          },
          data: topItems.map(data => ({
            value: seasons.map(season => data.seasonalProfits[season] || 0),
            name: data.item.name,
            areaStyle: {
              opacity: 0.1
            }
          }))
        }]
      };
    }
  }, [sortedData, seasons, chartType]);
  
  // Форматирование числа для отображения
  const formatNumber = (num: number) => {
    if (isNaN(num)) return 'N/A';
    return num.toFixed(1);
  };
  
  // Создаем сводную статистику
  const summaryStats = useMemo(() => {
    if (filteredItems.length === 0) return null;
    
    // Находим лучшую культуру для каждого сезона
    const bestBySeason: Record<string, {name: string; profit: number}> = {};
    
    seasons.forEach(season => {
      let bestProfit = -Infinity;
      let bestName = '';
      
      sortedData.forEach(data => {
        const profit = data.seasonalProfits[season] || 0;
        if (profit > bestProfit) {
          bestProfit = profit;
          bestName = data.item.name;
        }
      });
      
      bestBySeason[season] = {
        name: bestName,
        profit: bestProfit
      };
    });
    
    // Находим культуру с наибольшей средней доходностью
    const bestOverall = sortedData.length > 0 ? {
      name: sortedData[0].item.name,
      profit: sortedData[0].averageProfit
    } : null;
    
    // Находим культуру с лучшим ROI
    const bestROI = [...sortedData].sort((a, b) => b.roi - a.roi)[0];
    
    // Находим культуру с лучшей окупаемостью
    const bestPayback = [...sortedData].sort((a, b) => a.paybackTime - b.paybackTime)[0];
    
    return {
      totalCrops: filteredItems.length,
      bestBySeason,
      bestOverall,
      bestROI: bestROI ? {
        name: bestROI.item.name,
        roi: bestROI.roi
      } : null,
      bestPayback: bestPayback ? {
        name: bestPayback.item.name,
        days: bestPayback.paybackTime
      } : null
    };
  }, [filteredItems, sortedData, seasons]);
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h2 className="text-xl font-semibold">Анализ доходности урожая</h2>
        
        <div className="flex items-center">
          <span className="mr-2">Текущий сезон:</span>
          <div className="px-3 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-md font-medium">
            {currentConfig.currentSeason || 'Не выбран'}
          </div>
        </div>
      </div>
      
      {/* Сводка статистики */}
      {summaryStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium mb-2">Сезонные рекомендации</h3>
            <div className="space-y-1">
              {seasons.map(season => (
                <div key={season} className="flex justify-between">
                  <span className={`${season === currentConfig.currentSeason ? 'font-medium text-primary' : ''}`}>
                    {season}:
                  </span>
                  <span className="font-medium">
                    {summaryStats.bestBySeason[season]?.name || 'Нет данных'}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium mb-2">Оптимальные культуры</h3>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span>Наиболее прибыльная:</span>
                <span className="font-medium">{summaryStats.bestOverall?.name || 'Нет данных'}</span>
              </div>
              <div className="flex justify-between">
                <span>Лучший ROI:</span>
                <span className="font-medium">
                  {summaryStats.bestROI ? `${summaryStats.bestROI.name} (${summaryStats.bestROI.roi.toFixed(1)}%)` : 'Нет данных'}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Быстрая окупаемость:</span>
                <span className="font-medium">
                  {summaryStats.bestPayback ? `${summaryStats.bestPayback.name} (${summaryStats.bestPayback.days.toFixed(1)} дн.)` : 'Нет данных'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <h3 className="text-sm font-medium mb-2">Текущий сезон {currentConfig.currentSeason}</h3>
            {currentConfig.currentSeason ? (
              <div>
                <div className="text-lg font-bold mb-1">
                  {summaryStats.bestBySeason[currentConfig.currentSeason]?.name || 'Нет рекомендаций'}
                </div>
                <div className="text-sm text-green-600 dark:text-green-400">
                  {summaryStats.bestBySeason[currentConfig.currentSeason] ? 
                    `${summaryStats.bestBySeason[currentConfig.currentSeason].profit.toFixed(1)} прибыли в день` : ''}
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Не выбран текущий сезон
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Фильтры и сортировка */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Сортировать по:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              <option value="overall">Средняя доходность</option>
              <option value="current">Текущий сезон</option>
              <option value="roi">ROI (Возврат инвестиций)</option>
              <option value="profitPerDay">Прибыль в день</option>
              <option value="paybackTime">Время окупаемости</option>
              <option value="growingTime">Время роста</option>
              {seasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Фильтр по сезону:</label>
            <select
              value={filterSeason}
              onChange={(e) => setFilterSeason(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            >
              <option value="all">Все сезоны</option>
              {seasons.map(season => (
                <option key={season} value={season}>{season}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Диапазон тиров:</label>
            <div className="flex items-center space-x-2">
              <input 
                type="number" 
                min="1" 
                max="5"
                value={filterTierMin}
                onChange={(e) => setFilterTierMin(Math.min(parseInt(e.target.value) || 1, filterTierMax))}
                className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              />
              <span>до</span>
              <input 
                type="number" 
                min="1" 
                max="5"
                value={filterTierMax}
                onChange={(e) => setFilterTierMax(Math.max(parseInt(e.target.value) || 1, filterTierMin))}
                className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Тип графика:</label>
            <div className="flex space-x-2">
              <button
                onClick={() => setChartType('bar')}
                className={`px-3 py-2 rounded ${chartType === 'bar' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                Гистограмма
              </button>
              <button
                onClick={() => setChartType('radar')}
                className={`px-3 py-2 rounded ${chartType === 'radar' ? 'bg-primary text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
              >
                Радар
              </button>
            </div>
          </div>
        </div>
        
        <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Найдено урожайных предметов: {filteredItems.length} из {harvestItems.length}
        </div>
      </div>
      
      {/* График доходности */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <div className="h-80">
          <EChartWrapper options={chartOptions} />
        </div>
      </div>
      
      {/* Таблица с данными */}
      {sortedData.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Тир
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Сезоны
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Время роста
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Семена
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    За сезон
                  </th>
                  {seasons.map(season => (
                    <th key={season} className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      {season} (день)
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ROI (%)
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Окупаемость
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {sortedData.map(data => (
                  <tr key={data.item.name} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{data.item.name}</div>
                      {data.item.subType && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{data.item.subType}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {data.item.tier}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {data.item.growingSeason?.map(season => (
                          <span key={season} className={`px-2 py-0.5 text-xs rounded-full ${
                            currentConfig.currentSeason === season 
                              ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' 
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                          }`}>
                            {season}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {data.item.growingTime} дней
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {data.item.seedCost}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                      {data.item.harvestPerSeason || 1}
                    </td>
                    {seasons.map(season => {
                      const canGrow = data.item.growingSeason?.includes(season);
                      const profit = data.seasonalProfits[season] || 0;
                      
                      let colorClass = '';
                      if (!canGrow) {
                        colorClass = 'text-gray-400 dark:text-gray-600';
                      } else if (profit > 10) {
                        colorClass = 'text-green-600 dark:text-green-400 font-medium';
                      } else if (profit > 0) {
                        colorClass = 'text-blue-600 dark:text-blue-400';
                      } else if (profit < 0) {
                        colorClass = 'text-red-600 dark:text-red-400';
                      }
                      
                      return (
                        <td key={season} className="px-4 py-3 whitespace-nowrap text-center">
                          <span className={`text-sm ${colorClass}`}>
                            {canGrow ? formatNumber(profit) : '-'}
                          </span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`text-sm font-medium ${
                        data.roi > 100 ? 'text-green-600 dark:text-green-400' :
                        data.roi > 50 ? 'text-blue-600 dark:text-blue-400' :
                        data.roi > 0 ? 'text-gray-600 dark:text-gray-400' :
                        'text-red-600 dark:text-red-400'
                      }`}>
                        {formatNumber(data.roi)}%
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`text-sm ${
                        data.paybackTime <= 10 ? 'text-green-600 dark:text-green-400 font-medium' :
                        data.paybackTime <= 20 ? 'text-blue-600 dark:text-blue-400' :
                        'text-gray-600 dark:text-gray-400'
                      }`}>
                        {data.paybackTime > 100 || data.paybackTime <= 0 ? '∞' : `${formatNumber(data.paybackTime)} дн.`}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-white dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">
            Нет урожайных предметов для анализа. Создайте предметы с типом "Урожай" в редакторе предметов.
          </p>
        </div>
      )}
    </div>
  );
};

export default HarvestProfitability;