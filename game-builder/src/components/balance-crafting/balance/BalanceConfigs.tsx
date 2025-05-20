import { useState, useMemo } from 'react';
import * as echarts from 'echarts';
import { useBalance, BalanceConfig } from '../../../contexts/BalanceContext';
import { useAppState } from '../../../contexts/AppStateContext';
import EChartWrapper from '../../common/EChartWrapper';

export default function BalanceConfigs() {
  const balance = useBalance();
  const { state, updateState } = useAppState();
  const { savedConfigs, loadConfig, deleteConfig, currentConfig } = balance;
  const [newConfigName, setNewConfigName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [selectedConfigIds, setSelectedConfigIds] = useState<string[]>([]);
  const [compareView, setCompareView] = useState<'weights' | 'categories' | 'mechanics' | 'modifiers'>('weights');
  
  // Мемоизированные выбранные конфигурации для сравнения
  const selectedConfigs = useMemo(() => {
    // Если ничего не выбрано, показываем текущую конфигурацию
    if (selectedConfigIds.length === 0) {
      return [currentConfig];
    }
    
    return selectedConfigIds.map(id => 
      savedConfigs.find(config => config.id === id) || currentConfig
    );
  }, [selectedConfigIds, savedConfigs, currentConfig]);
  
  // Создаем опции для графика сравнения весов
  const weightsChartOptions = useMemo((): echarts.EChartsOption => {
    const isDark = document.documentElement.classList.contains('dark');
    
    const allWeightKeys = [
      'categoryWeight', 'tierWeight', 'mechanicWeight', 'modifiersWeight', 
      'locationsWeight', 'frequencyWeight', 'craftComplexityWeight'
    ];
    
    const weightNames: Record<string, string> = {
      categoryWeight: 'Категория',
      tierWeight: 'Тир',
      mechanicWeight: 'Механика',
      modifiersWeight: 'Модификаторы',
      locationsWeight: 'Локации',
      frequencyWeight: 'Частота',
      craftComplexityWeight: 'Сложность Крафта'
    };
    
    // Генерируем цвета для конфигураций с лучшей контрастностью
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // green-500
      '#EC4899', // pink-500
      '#F59E0B', // amber-500
      '#8B5CF6'  // purple-500
    ];
    
    // Создаем массив для патернов заполнения (чтобы различать столбцы даже в ч/б режиме)
    const patterns = [
      {},
      { type: 'line' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
      { type: 'crosshatch' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' }
    ];
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Сравнение весовых коэффициентов',
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
        data: selectedConfigs.map(config => config.name),
        top: 'bottom' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '20%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: allWeightKeys.map(key => weightNames[key] || key),
        axisLabel: {
          color: isDark ? '#ccc' : '#333',
          rotate: allWeightKeys.length > 6 ? 45 : 0,
          fontSize: 12,
          interval: 0
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      yAxis: {
        type: 'value' as const,
        name: 'Значение веса',
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
      series: selectedConfigs.map((config, index) => ({
        name: config.name,
        type: 'bar' as const,
        barMaxWidth: 50,
        barGap: '10%',
        data: allWeightKeys.map(key => {
          const value = config.weights[key as keyof typeof config.weights] || 0;
          return {
            value: value,
            // Применяем разные стили для различения столбцов
            itemStyle: {
              color: colors[index % colors.length],
              // Добавляем дополнительный узор для вторых и третьих конфигураций
              decal: index > 0 ? patterns[index % patterns.length] : undefined
            }
          };
        }),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: true,
          position: 'top' as const,
          formatter: '{c}',
          color: isDark ? '#ccc' : '#333',
          fontSize: 10
        }
      }))
    };
  }, [selectedConfigs]);

  // Создаем опции для графика сравнения значений категорий
  const categoriesChartOptions = useMemo((): echarts.EChartsOption => {
    if (selectedConfigs.length === 0) return {};
    
    const isDark = document.documentElement.classList.contains('dark');
    
    // Получаем все уникальные категории из всех конфигураций
    const allCategories = new Set<string>();
    selectedConfigs.forEach(config => {
      Object.keys(config.categories || {}).forEach(cat => allCategories.add(cat));
    });
    
    const categoryList = Array.from(allCategories).sort();
    
    // Генерируем цвета для конфигураций
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // green-500
      '#EC4899', // pink-500
      '#F59E0B', // amber-500
      '#8B5CF6'  // purple-500
    ];
    
    // Создаем массив для патернов заполнения
    const patterns = [
      {},
      { type: 'line' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
      { type: 'crosshatch' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' }
    ];
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Сравнение значений категорий',
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
        data: selectedConfigs.map(config => config.name),
        top: 'bottom' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      dataZoom: categoryList.length > 8 ? [
        {
          type: 'slider' as const,
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: Math.min(100, 8 / categoryList.length * 100),
          textStyle: {
            color: isDark ? '#ccc' : '#333'
          }
        }
      ] : [],
      grid: {
        left: '3%',
        right: '4%',
        bottom: categoryList.length > 8 ? '25%' : '20%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: categoryList,
        axisLabel: {
          interval: 0,
          rotate: 45,
          fontSize: 10,
          color: isDark ? '#ccc' : '#333'
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      yAxis: {
        type: 'value' as const,
        name: 'Множитель категории',
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
      series: selectedConfigs.map((config, index) => ({
        name: config.name,
        type: 'bar' as const,
        barMaxWidth: 40,
        barGap: '10%',
        data: categoryList.map(cat => {
          const value = config.categories[cat] || 0;
          return {
            value: value,
            itemStyle: {
              color: colors[index % colors.length],
              decal: index > 0 ? patterns[index % patterns.length] : undefined
            }
          };
        }),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: false, // Не показываем метки, чтобы избежать загромождения
          position: 'top' as const,
          formatter: '{c}',
          color: isDark ? '#ccc' : '#333'
        }
      }))
    };
  }, [selectedConfigs, compareView]);

  // Создаем опции для графика сравнения значений механик
  const mechanicsChartOptions = useMemo((): echarts.EChartsOption => {
    if (selectedConfigs.length === 0) return {};
    
    const isDark = document.documentElement.classList.contains('dark');
    
    // Получаем все уникальные механики из всех конфигураций
    const allMechanics = new Set<string>();
    selectedConfigs.forEach(config => {
      Object.keys(config.mechanics || {}).forEach(mech => allMechanics.add(mech));
    });
    
    const mechanicsList = Array.from(allMechanics).sort();
    
    // Генерируем цвета для конфигураций
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // green-500
      '#EC4899', // pink-500
      '#F59E0B', // amber-500
      '#8B5CF6'  // purple-500
    ];
    
    // Создаем массив для патернов заполнения
    const patterns = [
      {},
      { type: 'line' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
      { type: 'crosshatch' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' }
    ];
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Сравнение значений механик',
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
        data: selectedConfigs.map(config => config.name),
        top: 'bottom' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      dataZoom: mechanicsList.length > 8 ? [
        {
          type: 'slider' as const,
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: Math.min(100, 8 / mechanicsList.length * 100),
          textStyle: {
            color: isDark ? '#ccc' : '#333'
          }
        }
      ] : [],
      grid: {
        left: '3%',
        right: '4%',
        bottom: mechanicsList.length > 8 ? '25%' : '20%', 
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: mechanicsList,
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 10,
          color: isDark ? '#ccc' : '#333'
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      yAxis: {
        type: 'value' as const,
        name: 'Множитель механики',
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
      series: selectedConfigs.map((config, index) => ({
        name: config.name,
        type: 'bar' as const,
        barMaxWidth: 40,
        barGap: '10%',
        data: mechanicsList.map(mech => {
          const value = config.mechanics[mech] || 0;
          return {
            value: value,
            itemStyle: {
              color: colors[index % colors.length],
              decal: index > 0 ? patterns[index % patterns.length] : undefined
            }
          };
        }),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: false,
          position: 'top' as const,
          formatter: '{c}',
          color: isDark ? '#ccc' : '#333'
        }
      }))
    };
  }, [selectedConfigs, compareView]);

  // Создаем опции для графика сравнения значений модификаторов
  const modifiersChartOptions = useMemo((): echarts.EChartsOption => {
    if (selectedConfigs.length === 0) return {};
    
    const isDark = document.documentElement.classList.contains('dark');
    
    // Получаем все уникальные модификаторы из всех конфигураций
    const allModifiers = new Set<string>();
    selectedConfigs.forEach(config => {
      Object.keys(config.modifiers || {}).forEach(mod => allModifiers.add(mod));
    });
    
    const modifiersList = Array.from(allModifiers).sort();
    
    // Генерируем цвета для конфигураций
    const colors = [
      '#3B82F6', // blue-500
      '#10B981', // green-500
      '#EC4899', // pink-500
      '#F59E0B', // amber-500
      '#8B5CF6'  // purple-500
    ];
    
    // Создаем массив для патернов заполнения
    const patterns = [
      {},
      { type: 'line' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' },
      { type: 'crosshatch' as const, backgroundColor: 'rgba(0, 0, 0, 0.1)' }
    ];
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: 'Сравнение значений модификаторов',
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
        data: selectedConfigs.map(config => config.name),
        top: 'bottom' as const,
        textStyle: {
          color: isDark ? '#ccc' : '#333'
        }
      },
      dataZoom: modifiersList.length > 8 ? [
        {
          type: 'slider' as const,
          show: true,
          xAxisIndex: [0],
          start: 0,
          end: Math.min(100, 8 / modifiersList.length * 100),
          textStyle: {
            color: isDark ? '#ccc' : '#333'
          }
        }
      ] : [],
      grid: {
        left: '3%',
        right: '4%',
        bottom: modifiersList.length > 8 ? '25%' : '20%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: modifiersList,
        axisLabel: {
          interval: 0,
          rotate: 30,
          fontSize: 10,
          color: isDark ? '#ccc' : '#333'
        },
        axisLine: {
          lineStyle: {
            color: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.2)'
          }
        }
      },
      yAxis: {
        type: 'value' as const,
        name: 'Множитель модификатора',
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
      series: selectedConfigs.map((config, index) => ({
        name: config.name,
        type: 'bar' as const,
        barMaxWidth: 50,
        barGap: '10%',
        data: modifiersList.map(mod => {
          const value = config.modifiers[mod] || 0;
          return {
            value: value,
            itemStyle: {
              color: colors[index % colors.length],
              decal: index > 0 ? patterns[index % patterns.length] : undefined
            }
          };
        }),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        },
        label: {
          show: false,
          position: 'top' as const,
          formatter: '{c}',
          color: isDark ? '#ccc' : '#333'
        }
      }))
    };
  }, [selectedConfigs, compareView]);
  
  // Остальной код компонента остается без изменений
  
  // Функция для прямого создания новой конфигурации
  const createNewConfigDirect = () => {
    if (!newConfigName.trim()) {
      alert('Please enter a name for the new configuration');
      return;
    }
    
    console.log("Создаем новую конфигурацию:", newConfigName);
    
    // 1. Генерируем уникальный ID
    const newId = `config-${Date.now()}`;
    
    // 2. Создаем полную копию текущей конфигурации
    const newConfig = JSON.parse(JSON.stringify(currentConfig));
    
    // 3. Устанавливаем новые значения
    newConfig.id = newId;
    newConfig.name = newConfigName;
    newConfig.createdAt = new Date().toISOString();
    
    console.log("Новая конфигурация:", newConfig);
    
    // 4. Добавляем в список сохраненных конфигураций
    const newSavedConfigs = [...savedConfigs, newConfig];
    
    try {
      // 5. Обновляем state одним вызовом для большей атомарности
      updateState('balance', {
        currentConfig: newConfig, 
        savedConfigs: newSavedConfigs,
        comparisonItems: state.balance.comparisonItems
      });
      
      console.log("Состояние обновлено. Новая текущая конфигурация:", newConfig.id);
      
      // Очищаем форму
      setNewConfigName('');
      setIsCreatingNew(false);
    } catch (error) {
      console.error("Ошибка при обновлении состояния:", error);
      alert(`Ошибка: ${error}`);
    }
  };
  
  // Функция для переключения выбора конфигурации для сравнения
  const toggleConfigSelection = (configId: string) => {
    setSelectedConfigIds(prev => {
      if (prev.includes(configId)) {
        return prev.filter(id => id !== configId);
      } else {
        // Ограничиваем выбор до 3 конфигураций
        return [...prev, configId].slice(-3);
      }
    });
  };
  
  // Отладочная функция
  const logConfigs = () => {
    console.log("Текущие конфигурации:", {
      current: currentConfig,
      saved: savedConfigs
    });
  };
  
  // Функция для диагностики системы крафта
  const diagnoseCraftSystem = () => {
    console.log("Диагностика Crafting System:");
    console.log(`Всего рецептов: ${state.craftSystem.recipes.length}`);
    console.log(`nextRecipeId: ${state.craftSystem.nextRecipeId}`);
    console.log(`nextVariantId: ${state.craftSystem.nextVariantId}`);
    
    const recipeIds = state.craftSystem.recipes.map(r => r.id);
    console.log("ID всех рецептов:", recipeIds);
    
    const uniqueIds = new Set(recipeIds);
    if (uniqueIds.size !== recipeIds.length) {
      console.error("ВНИМАНИЕ: Обнаружены дублирующиеся ID рецептов!");
    }
    
    // Получаем список вариантов
    const allVariants = state.craftSystem.recipes.flatMap(r => r.variants);
    console.log(`Всего вариантов: ${allVariants.length}`);
    
    // Проверяем, есть ли рецепты без вариантов
    const recipesWithoutVariants = state.craftSystem.recipes.filter(r => !r.variants || r.variants.length === 0);
    if (recipesWithoutVariants.length > 0) {
      console.error(`ВНИМАНИЕ: ${recipesWithoutVariants.length} рецептов без вариантов!`);
    }
  };
  
  if (savedConfigs.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
        <p className="text-gray-500 dark:text-gray-400">
          Пока нет сохраненных конфигураций. Сохраните конфигурацию на вкладке Параметры баланса.
        </p>
      </div>
    );
  }
  
  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }).format(date);
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <div className="space-y-6">
      {/* Графики сравнения конфигураций */}
      {selectedConfigIds.length > 0 && (
        <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Configuration Comparison</h2>
            
            <div className="flex space-x-2">
              <button
                onClick={() => setCompareView('weights')}
                className={`px-3 py-1 rounded text-sm ${
                  compareView === 'weights' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Weights
              </button>
              <button
                onClick={() => setCompareView('categories')}
                className={`px-3 py-1 rounded text-sm ${
                  compareView === 'categories' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Categories
              </button>
              <button
                onClick={() => setCompareView('mechanics')}
                className={`px-3 py-1 rounded text-sm ${
                  compareView === 'mechanics' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Mechanics
              </button>
              <button
                onClick={() => setCompareView('modifiers')}
                className={`px-3 py-1 rounded text-sm ${
                  compareView === 'modifiers' 
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Modifiers
              </button>
            </div>
          </div>
          
          <div className="h-80">
            {compareView === 'weights' && <EChartWrapper options={weightsChartOptions} />}
            {compareView === 'categories' && <EChartWrapper options={categoriesChartOptions} />}
            {compareView === 'mechanics' && <EChartWrapper options={mechanicsChartOptions} />}
            {compareView === 'modifiers' && <EChartWrapper options={modifiersChartOptions} />}
          </div>
          
          <div className="mt-2 text-sm text-center text-gray-500 dark:text-gray-400">
            Select up to 3 configurations to compare their parameters
          </div>
        </div>
      )}
      
      {/* Остальной JSX код остается без изменений */}
      
      {/* Отладочная информация */}
      <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 text-xs font-mono overflow-auto">
        <div>Current Config ID: <span className="font-bold">{currentConfig.id}</span></div>
        <div>Current Config Name: <span className="font-bold">{currentConfig.name}</span></div>
        <div>Saved Configs: <span className="font-bold">{savedConfigs.length}</span></div>
        <div>Saved Config IDs: <span className="font-bold">{savedConfigs.map(c => c.id).join(', ')}</span></div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Сохраненные конфигурации</h2>
          
          {isCreatingNew ? (
            <div className="flex space-x-2">
              <input
                type="text"
                value={newConfigName}
                onChange={(e) => setNewConfigName(e.target.value)}
                placeholder="New config name"
                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-800"
              />
              <button
                onClick={createNewConfigDirect}
                className="px-3 py-1 bg-green-500 text-white rounded-md text-sm hover:bg-green-600"
              >
                Save
              </button>
              <button
                onClick={() => setIsCreatingNew(false)}
                className="px-3 py-1 bg-gray-300 dark:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-md text-sm"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsCreatingNew(true)}
              className="px-3 py-1 bg-primary text-white rounded-md text-sm hover:bg-opacity-90"
            >
              Create New Config
            </button>
          )}
        </div>
        
        {/* Отладочные кнопки */}
        <div className="flex space-x-2 mb-4">
          <button 
            onClick={logConfigs}
            className="px-2 py-1 bg-gray-200 dark:bg-gray-700 text-xs rounded"
          >
            Debug: Log configs
          </button>
          
          <button 
            onClick={() => window.location.reload()}
            className="px-2 py-1 bg-blue-200 dark:bg-blue-700 text-xs rounded"
          >
            Refresh Page
          </button>
          
          <button 
            onClick={diagnoseCraftSystem}
            className="px-2 py-1 bg-yellow-200 dark:bg-yellow-700 text-xs rounded"
          >
            Debug: Craft System
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="text-sm text-gray-500 mb-2">
            Showing {savedConfigs.length} configurations
            {selectedConfigIds.length > 0 && ` (${selectedConfigIds.length} selected for comparison)`}
          </div>
          
          {savedConfigs.map((config: BalanceConfig) => (
            <div 
              key={config.id}
              className={`p-4 rounded-lg border ${
                currentConfig.id === config.id
                  ? 'border-primary bg-primary bg-opacity-10'
                  : selectedConfigIds.includes(config.id)
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex gap-2 items-start">
                  {/* Чекбокс для выбора сравнения */}
                  <div>
                    <input
                      type="checkbox"
                      id={`compare-${config.id}`}
                      checked={selectedConfigIds.includes(config.id)}
                      onChange={() => toggleConfigSelection(config.id)}
                      className="h-4 w-4 text-blue-500 focus:ring-blue-400"
                    />
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-lg mb-1">{config.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ID: {config.id} • Version: {config.version} • Created: {formatDate(config.createdAt)}
                    </p>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadConfig(config.id)}
                    className={`px-3 py-1 rounded-md text-sm ${
                      currentConfig.id === config.id
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 cursor-default'
                        : 'bg-primary text-white hover:bg-opacity-90'
                    }`}
                    disabled={currentConfig.id === config.id}
                  >
                    {currentConfig.id === config.id ? 'Current' : 'Load'}
                  </button>
                  
                  {config.id !== 'default' && (
                    <button
                      onClick={() => deleteConfig(config.id)}
                      className="px-3 py-1 bg-red-500 text-white rounded-md text-sm hover:bg-red-600"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Базовая ценность</div>
                  <div>{config.baseValue}</div>
                </div>
                
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Множитель Тира</div>
                  <div>{(config.tierMultiplier * 100).toFixed(0)}%</div>
                </div>
                
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Вес Категории</div>
                  <div>{config.weights.categoryWeight.toFixed(2)}</div>
                </div>
                
                <div>
                  <div className="text-gray-500 dark:text-gray-400">Вес Тира</div>
                  <div>{config.weights.tierWeight.toFixed(2)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}