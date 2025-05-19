import { useState, useMemo } from 'react';
import { useBalance } from '../../../contexts/BalanceContext';
import { ItemData } from '../../../contexts/BalanceContext';
import EChartWrapper from '../../common/EChartWrapper';
import ImageUpload from '../../common/ImageUpload';
import { useAppState } from '../../../contexts/AppStateContext';
import * as echarts from 'echarts';
import { getImageUrl as getImageUrlFromUtils } from '../../../utils/imageUtils';

// Интерфейс для состояния редактирования
interface EditingItemState {
  originalItem: ItemData;
  index: number;
}

// Интерфейс для компонентов стоимости 
interface ItemComponents {
  categoryComponent: number;
  tierComponent: number;
  mechanicComponent: number;
  modifiersComponent: number;
  locationsComponent: number;
  total: number;
}

// Интерфейс для предмета с вычисленными компонентами
interface ItemWithComponents extends ItemData {
  components: ItemComponents;
  cost: number;
}

export default function ItemComparison() {
  const balance = useBalance();
  const { state } = useAppState();
  const { 
    comparisonItems, 
    calculateItemCost, 
    calculateSeasonalItemCost, 
    removeItemFromComparison, 
    addItemToComparison, 
    updateItemInComparison, 
    currentConfig 
  } = balance;
  
  // Состояние для фильтрации и пагинации
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('cost');
  const [sortDirection, setSortDirection] = useState('desc');
  const [filterMechanic, setFilterMechanic] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterTierMin, setFilterTierMin] = useState(1);
  const [filterTierMax, setFilterTierMax] = useState(10);
  const [filterType, setFilterType] = useState('all'); // Новое состояние для фильтрации по типу
  const [filterSubType, setFilterSubType] = useState('all'); // Новое состояние для фильтрации по подтипу
  const [viewMode, setViewMode] = useState('table'); // 'table', 'distribution', 'stacked'

  const [distributionDataType, setDistributionDataType] = useState('base'); // 'base', 'sell', 'buy'
  const [analysisDataType, setAnalysisDataType] = useState('base'); // 'base', 'sell', 'buy'
  const [showSeasonalPrices, setShowSeasonalPrices] = useState(false); // Новое состояние для отображения сезонных цен

  // Состояние для редактирования предметов - правильная типизация
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<EditingItemState | null>(null);
  const [editFormData, setEditFormData] = useState<ItemData>({
    name: '',
    tier: 1,
    mechanic: '',
    selectedCategories: [],
    selectedModifiers: [],
    selectedLocations: [],
    frequencyType: Object.keys(currentConfig.frequencyTypes)[0] || '',
    craftComplexity: Object.keys(currentConfig.craftComplexityTypes)[0] || '',
    imageId: null, // Поле для хранения ID изображения
    
    // Новые поля для урожая
    isHarvest: false,
    growingSeason: [],
    growingTime: 1,
    harvestPerSeason: 1,
    seedCost: 0,
    subType: ''
  });
  
  const getImageUrl = (imageId: string | null | undefined): string | null => {
    if (!imageId) return null;
    
    // Используем общую функцию из imageUtils.ts
    const imageUrl = getImageUrlFromUtils(imageId, state);
    
    // Если изображение найдено, возвращаем его
    if (imageUrl) return imageUrl;
    
    // Если нет, проверяем дополнительный источник
    const comparisonItem = comparisonItems.find(item => item.imageId === imageId);
    if (comparisonItem && comparisonItem.imageUrl) {
      return comparisonItem.imageUrl;
    }
    
    return null;
  };

  // Функция для обработки загрузки изображений
  const handleImageUpload = (imageId: string) => {
    setEditFormData({...editFormData, imageId});
  };

  // Функция для начала редактирования предмета
  const startEditing = (item: ItemData, itemIndex: number) => {
    console.log('Starting edit of item at original index:', itemIndex, item);
    
    // Найдем фактический индекс элемента в массиве comparisonItems
    const actualIndex = comparisonItems.findIndex(i => 
      i.name === item.name && 
      i.tier === item.tier && 
      i.mechanic === item.mechanic &&
      JSON.stringify(i.selectedCategories) === JSON.stringify(item.selectedCategories)
    );
    
    console.log('Actual index in comparisonItems:', actualIndex);
    
    setEditingItem({
      originalItem: item,
      index: actualIndex >= 0 ? actualIndex : itemIndex // Используем фактический индекс или переданный
    });
    
    setEditFormData({
      name: item.name,
      tier: item.tier,
      mechanic: item.mechanic,
      selectedCategories: [...item.selectedCategories],
      selectedModifiers: [...item.selectedModifiers],
      selectedLocations: [...item.selectedLocations],
      frequencyType: item.frequencyType || Object.keys(currentConfig.frequencyTypes)[0] || '',
      craftComplexity: item.craftComplexity || Object.keys(currentConfig.craftComplexityTypes)[0] || '',
      imageId: item.imageId || null, // Сохраняем ID изображения
      subType: item.subType || '',
      
      // Новые поля для урожая
      isHarvest: item.isHarvest || false,
      growingSeason: item.growingSeason ? [...item.growingSeason] : [],
      growingTime: item.growingTime || 1,
      harvestPerSeason: item.harvestPerSeason || 1,
      seedCost: item.seedCost || 0
    });
    
    setIsEditModalOpen(true);
  };

  // Функция для сохранения отредактированного предмета
  const saveEditedItem = () => {
    if (!editingItem) {
      console.error('Invalid editing state: editingItem is null');
      return;
    }
    
    const { index, originalItem } = editingItem;
    
    console.log('About to save item. Original index:', index);
    console.log('Original item:', originalItem);
    console.log('Updated item:', editFormData);
    
    // Проверяем, что индекс корректный
    if (index < 0 || index >= comparisonItems.length) {
      console.error(`Invalid index: ${index}, items length: ${comparisonItems.length}`);
      addItemToComparison(editFormData);
    } else {
      // Элемент существует, используем сохраненный индекс
      updateItemInComparison(index, editFormData);
    }
    
    // Закрываем модальное окно
    setIsEditModalOpen(false);
    setEditingItem(null);
  };
  
  // Расчет цены продажи (со скидкой)
  const calculateSellPrice = (item: ItemData): number => {
    const basePrice = calculateItemCost(item);
    return Math.round(basePrice * (1 - currentConfig.sellDiscount));
  };

  // Расчет цены покупки (с наценкой)
  const calculateBuyPrice = (item: ItemData): number => {
    const basePrice = calculateItemCost(item);
    return Math.round(basePrice * (1 + currentConfig.buyMarkup));
  };
  
  // Собираем уникальные категории, механики и подтипы для фильтрации
  const { uniqueCategories, uniqueMechanics, uniqueSubTypes } = useMemo(() => {
    const categories = new Set<string>();
    const mechanics = new Set<string>();
    const subTypes = new Set<string>();
    
    comparisonItems.forEach(item => {
      item.selectedCategories.forEach(category => {
        categories.add(category);
      });
      mechanics.add(item.mechanic);
      if (item.subType) {
        subTypes.add(item.subType);
      }
    });
    
    return {
      uniqueCategories: ['all', ...Array.from(categories)],
      uniqueMechanics: ['all', ...Array.from(mechanics)],
      uniqueSubTypes: ['all', ...Array.from(subTypes)]
    };
  }, [comparisonItems]);
  
  // Вычисляем компоненты стоимости для предмета
  function getItemComponents(item: ItemData): ItemComponents {
    // Расчет влияния категорий
    const categorySum = item.selectedCategories.reduce((sum: number, cat: string) => {
      return sum + (currentConfig.categories[cat] || 0);
    }, 0);
    
    const categoryValue = item.selectedCategories.length > 0 
      ? categorySum / item.selectedCategories.length 
      : 0;
      
    const tierValue = 1 + (item.tier - 1) * currentConfig.tierMultiplier;
    const mechanicValue = currentConfig.mechanics[item.mechanic] || 1;
    
    const modifiersSum = item.selectedModifiers.reduce((sum: number, mod: string) => {
      return sum + (currentConfig.modifiers[mod] || 0);
    }, 0);

    // Добавляем расчет компонента локаций
    const locationsSum = item.selectedLocations.reduce((sum: number, loc: string) => {
      return sum + (currentConfig.locations[loc] || 0);
    }, 0);
    
    const locationsValue = item.selectedLocations.length > 0 
      ? locationsSum / item.selectedLocations.length 
      : 1;
    
    const modifiersValue = item.selectedModifiers.length > 0 
      ? modifiersSum / item.selectedModifiers.length 
      : 1;
    
    const categoryComponent = Math.round(currentConfig.weights.categoryWeight * categoryValue * currentConfig.baseValue);
    const tierComponent = Math.round(currentConfig.weights.tierWeight * tierValue * currentConfig.baseValue);
    const mechanicComponent = Math.round(currentConfig.weights.mechanicWeight * mechanicValue * currentConfig.baseValue);
    const modifiersComponent = Math.round(currentConfig.weights.modifiersWeight * modifiersValue * currentConfig.baseValue);
    const locationsComponent = Math.round(currentConfig.weights.locationsWeight * locationsValue * currentConfig.baseValue);
    
    return {
      categoryComponent,
      tierComponent,
      mechanicComponent,
      modifiersComponent,
      locationsComponent,
      total: calculateItemCost(item)
    };
  }
  
  // Подготовка вычисленных данных с компонентами стоимости
  const itemsWithComponents = useMemo(() => {
    return comparisonItems.map(item => {
      const components = getItemComponents(item);
      return {
        ...item,
        components,
        cost: components.total
      } as ItemWithComponents;
    });
  }, [comparisonItems, currentConfig]);
  
  // Фильтрация и сортировка элементов
  const filteredItems = useMemo(() => {
    let filtered = [...itemsWithComponents];
    
    // Применяем фильтры
    if (filterMechanic !== 'all') {
      filtered = filtered.filter(item => item.mechanic === filterMechanic);
    }
    
    if (filterCategory !== 'all') {
      filtered = filtered.filter(item => item.selectedCategories.includes(filterCategory));
    }
    
    if (filterType !== 'all') {
      filtered = filtered.filter(item => 
        (filterType === 'harvest' && item.isHarvest) || 
        (filterType === 'regular' && !item.isHarvest)
      );
    }
    
    if (filterSubType !== 'all') {
      filtered = filtered.filter(item => item.subType === filterSubType);
    }
    
    filtered = filtered.filter(item => item.tier >= filterTierMin && item.tier <= filterTierMax);
    
    // Сортировка
    filtered.sort((a, b) => {
      let compareA: string | number;
      let compareB: string | number;
      
      switch (sortField) {
        case 'name':
          compareA = a.name;
          compareB = b.name;
          break;
        case 'tier':
          compareA = a.tier;
          compareB = b.tier;
          break;
        case 'cost':
          compareA = a.cost;
          compareB = b.cost;
          break;
        case 'categoryValue':
          compareA = a.components.categoryComponent;
          compareB = b.components.categoryComponent;
          break;
        case 'tierValue':
          compareA = a.components.tierComponent;
          compareB = b.components.tierComponent;
          break;
        case 'mechanicValue':
          compareA = a.components.mechanicComponent;
          compareB = b.components.mechanicComponent;
          break;
        case 'growingTime':
          compareA = a.growingTime || 0;
          compareB = b.growingTime || 0;
          break;
        case 'profitability':
          // Расчет доходности для урожая
          const profitA = a.isHarvest ? (a.cost - (a.seedCost || 0)) / (a.growingTime || 1) : 0;
          const profitB = b.isHarvest ? (b.cost - (b.seedCost || 0)) / (b.growingTime || 1) : 0;
          compareA = profitA;
          compareB = profitB;
          break;
        default:
          compareA = a.cost;
          compareB = b.cost;
      }
      
      if (typeof compareA === 'string' && typeof compareB === 'string') {
        return sortDirection === 'asc' 
          ? compareA.localeCompare(compareB) 
          : compareB.localeCompare(compareA);
      }
      
      if (typeof compareA === 'number' && typeof compareB === 'number') {
        return sortDirection === 'asc' 
          ? compareA - compareB 
          : compareB - compareA;
      }
      
      // Fallback для смешанных типов
      return 0;
    });
    
    return filtered;
  }, [itemsWithComponents, filterMechanic, filterCategory, filterTierMin, filterTierMax, filterType, filterSubType, sortField, sortDirection]);
  
  // Пагинация
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredItems, currentPage, itemsPerPage]);
  
  // Общая статистика для всех предметов
  const statistics = useMemo(() => {
    if (filteredItems.length === 0) return null;
    
    const costs = filteredItems.map(item => item.cost);
    const tiers = filteredItems.map(item => item.tier);
    const sellPrices = filteredItems.map(item => calculateSellPrice(item));
    const buyPrices = filteredItems.map(item => calculateBuyPrice(item));
    
    // Статистика только для урожайных предметов
    const harvestItems = filteredItems.filter(item => item.isHarvest);
    const harvestProfits = harvestItems.map(item => {
      const cost = item.cost;
      const seedCost = item.seedCost || 0;
      const growingTime = item.growingTime || 1;
      return (cost - seedCost) / growingTime;
    });
    
    return {
      count: filteredItems.length,
      costMin: Math.min(...costs),
      costMax: Math.max(...costs),
      costAvg: Math.round(costs.reduce((sum, cost) => sum + cost, 0) / costs.length),
      costMedian: getMedian(costs),
      tierAvg: (tiers.reduce((sum, tier) => sum + tier, 0) / tiers.length).toFixed(1),
      
      // Статистика по ценам продажи и покупки
      sellMin: Math.min(...sellPrices),
      sellMax: Math.max(...sellPrices),
      sellAvg: Math.round(sellPrices.reduce((sum, price) => sum + price, 0) / sellPrices.length),
      buyMin: Math.min(...buyPrices),
      buyMax: Math.max(...buyPrices),
      buyAvg: Math.round(buyPrices.reduce((sum, price) => sum + price, 0) / buyPrices.length),
      
      // Компоненты стоимости
      categoryAvg: Math.round(filteredItems.reduce((sum, item) => sum + item.components.categoryComponent, 0) / filteredItems.length),
      tierAvgValue: Math.round(filteredItems.reduce((sum, item) => sum + item.components.tierComponent, 0) / filteredItems.length),
      mechanicAvg: Math.round(filteredItems.reduce((sum, item) => sum + item.components.mechanicComponent, 0) / filteredItems.length),
      modifiersAvg: Math.round(filteredItems.reduce((sum, item) => sum + item.components.modifiersComponent, 0) / filteredItems.length),
      locationsAvg: Math.round(filteredItems.reduce((sum, item) => sum + (item.components.locationsComponent || 0), 0) / filteredItems.length),
      
      // Статистика урожая
      harvestCount: harvestItems.length,
      harvestAvgProfit: harvestProfits.length > 0 
        ? Math.round(harvestProfits.reduce((sum, profit) => sum + profit, 0) / harvestProfits.length * 10) / 10
        : 0,
      harvestMinProfit: harvestProfits.length > 0 ? Math.min(...harvestProfits) : 0,
      harvestMaxProfit: harvestProfits.length > 0 ? Math.max(...harvestProfits) : 0
    };
  }, [filteredItems, calculateSellPrice, calculateBuyPrice]);
  
  // Получение медианы из массива чисел
  function getMedian(values: number[]): number {
    if (values.length === 0) return 0;
    
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  }
  
  // Форматирование сезонов для отображения
  const formatSeasons = (seasons?: string[]): string => {
    if (!seasons || seasons.length === 0) return 'Не указано';
    return seasons.join(', ');
  };
  
  // Расчет доходности для урожая
  const calculateProfitability = (item: ItemData): number => {
    if (!item.isHarvest) return 0;
    
    const cost = calculateItemCost(item);
    const seedCost = item.seedCost || 0;
    const growingTime = item.growingTime || 1;
    
    return (cost - seedCost) / growingTime;
  };
  
  // Опции для графика распределения стоимости (ECharts)
  const distributionChartOptions = useMemo((): echarts.EChartsOption => {
    if (filteredItems.length === 0) {
      return {
        title: {
          text: 'Нет данных для отображения',
          left: 'center' as const,
          top: 'middle' as const,
          textStyle: {
            color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333'
          }
        }
      };
    }
    
    // Выбираем данные в зависимости от типа распределения
    let values: number[];
    let chartTitle: string;
    let valueLabel: string;
    
    switch (distributionDataType) {
      case 'sell':
        values = filteredItems.map(item => calculateSellPrice(item));
        chartTitle = 'Распределение цены продажи';
        valueLabel = 'Диапазон цен продажи';
        break;
      case 'buy':
        values = filteredItems.map(item => calculateBuyPrice(item));
        chartTitle = 'Распределение цены покупки';
        valueLabel = 'Диапазон цен покупки';
        break;
      default: // 'base'
        values = filteredItems.map(item => item.cost);
        chartTitle = 'Распределение базовой ценности';
        valueLabel = 'Диапазон базовой ценности';
    }
    
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    
    // Значительно сокращаем количество групп для лучшей читаемости
    const numBuckets = Math.min(8, Math.ceil(Math.sqrt(filteredItems.length)));
    const bucketSize = range / numBuckets;
    
    // Создаем гистограмму
    const buckets: number[] = Array(numBuckets).fill(0);
    
    values.forEach(value => {
      const bucketIndex = Math.min(
        numBuckets - 1,
        Math.floor((value - min) / bucketSize)
      );
      buckets[bucketIndex]++;
    });
    
    // Создаем метки с диапазонами стоимости и форматируем их
    const labels = buckets.map((_, i) => {
      const start = Math.round(min + i * bucketSize);
      const end = Math.round(min + (i + 1) * bucketSize);
      
      // Форматируем числа для компактности
      const formatNum = (num: number) => {
        if (num >= 10000) {
          return (num / 1000).toFixed(0) + 'k';
        }
        return num.toString();
      };
      
      return `${formatNum(start)}-${formatNum(end)}`;
    });
    
    // Настраиваем цвета в зависимости от текущей темы и типа данных
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    // Выбираем цвет гистограммы в зависимости от типа данных
    let barColor: string;
    
    switch (distributionDataType) {
      case 'sell':
        barColor = 'rgba(239, 68, 68, 0.7)'; // red-500 с прозрачностью
        break;
      case 'buy':
        barColor = 'rgba(34, 197, 94, 0.7)'; // green-500 с прозрачностью
        break;
      default: // 'base'
        barColor = 'rgba(93, 92, 222, 0.7)'; // primary с прозрачностью
    }
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: chartTitle,
        left: 'center' as const,
        textStyle: {
          color: textColor,
          fontWeight: 'bold' as const,
          fontSize: 16
        }
      },
      tooltip: {
        trigger: 'item' as const,
        formatter: function(params: any) {
          const value = typeof params.value === 'number' ? params.value : 0;
          const percent = (value / filteredItems.length * 100).toFixed(1);
          
          // Получаем границы диапазона из метки
          const range = params.name.split('-');
          const rangeText = range.length === 2 
            ? `${range[0]} - ${range[1]}`
            : params.name;
          
          return `${valueLabel}: ${rangeText}<br/>Предметов: ${value} (${percent}%)`;
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
        bottom: '18%',    // Значительно увеличен отступ снизу
        top: '60px',
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: labels,
        axisLabel: {
          color: textColor,
          rotate: 45,      // Умеренный угол наклона
          fontSize: 11,    // Чуть больший размер для читаемости
          interval: 0,     // Показывать все метки
          hideOverlap: true, // Скрывать перекрывающиеся
          margin: 14,      // Увеличенный отступ от оси
          align: 'right' as const  // Выравнивание текста
        },
        axisLine: {
          lineStyle: {
            color: gridColor
          }
        },
        name: valueLabel,
        nameLocation: 'middle' as const,
        nameGap: 50,       // Большой отступ для названия оси
        nameTextStyle: {
          color: textColor,
          fontSize: 12,
          padding: [30, 0, 0, 0]  // Значительный отступ сверху
        }
      },
      yAxis: {
        type: 'value' as const,
        name: 'Количество предметов',
        nameLocation: 'middle' as const,
        nameGap: 50,
        nameTextStyle: {
          color: textColor,
          fontSize: 12
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
      series: [
        {
          data: buckets,
          type: 'bar' as const,
          itemStyle: {
            color: barColor,
            borderRadius: [3, 3, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: barColor.replace('0.7', '0.9')
            }
          },
          barMaxWidth: '60%',    // Уменьшаем ширину столбцов
          barCategoryGap: '30%'  // Увеличиваем промежуток между столбцами
        }
      ]
    };
  }, [filteredItems, distributionDataType, calculateSellPrice, calculateBuyPrice]);
  
  // Опции для нормализованной столбчатой диаграммы с вариациями
  const stackedBarChartOptions = useMemo((): echarts.EChartsOption => {
    if (filteredItems.length === 0) {
      return {
        title: {
          text: 'Нет данных для отображения',
          left: 'center' as const,
          top: 'middle' as const,
          textStyle: {
            color: document.documentElement.classList.contains('dark') ? '#ccc' : '#333'
          }
        }
      };
    }
    
    // Выбираем заголовок для графика
    let chartTitle: string;
    
    switch (analysisDataType) {
      case 'sell':
        chartTitle = 'Распределение цены продажи по тирам и механикам';
        break;
      case 'buy':
        chartTitle = 'Распределение цены покупки по тирам и механикам';
        break;
      default: // 'base'
        chartTitle = 'Распределение базовой ценности по тирам и механикам';
    }
    
    // Сначала подготовим данные
    // Определяем все уникальные тиры и механики в данных
    const tierValues = Array.from(new Set(filteredItems.map(item => item.tier))).sort((a, b) => a - b);
    const mechanicTypes = Array.from(new Set(filteredItems.map(item => item.mechanic)));
    
    // Рассчитываем ценность для каждого предмета
    const itemsWithValues = filteredItems.map(item => {
      let value: number;
      switch (analysisDataType) {
        case 'sell':
          value = calculateSellPrice(item);
          break;
        case 'buy':
          value = calculateBuyPrice(item);
          break;
        default: // 'base'
          value = item.cost;
          break;
      }
      
      return {
        ...item,
        value
      };
    });
    
    // Группируем по тирам и механикам и рассчитываем суммы и средние значения
    const dataByTierAndMechanic: Record<number, Record<string, { sum: number; count: number; avg: number }>> = {};
    
    // Инициализация структуры данных
    tierValues.forEach(tier => {
      dataByTierAndMechanic[tier] = {};
      mechanicTypes.forEach(mechanic => {
        dataByTierAndMechanic[tier][mechanic] = { sum: 0, count: 0, avg: 0 };
      });
    });
    
    // Заполнение данными
    itemsWithValues.forEach(item => {
      if (dataByTierAndMechanic[item.tier] && dataByTierAndMechanic[item.tier][item.mechanic]) {
        dataByTierAndMechanic[item.tier][item.mechanic].sum += item.value;
        dataByTierAndMechanic[item.tier][item.mechanic].count++;
      }
    });
    
    // Расчет средних значений - округляем результат до целых чисел
    tierValues.forEach(tier => {
      mechanicTypes.forEach(mechanic => {
        if (dataByTierAndMechanic[tier][mechanic].count > 0) {
          // Округляем до целых значений сразу при подсчете среднего
          dataByTierAndMechanic[tier][mechanic].avg = 
            Math.round(dataByTierAndMechanic[tier][mechanic].sum / dataByTierAndMechanic[tier][mechanic].count);
        }
      });
    });
    
    // Подготовка серий данных
    const series = mechanicTypes.map(mechanic => {
      const data = tierValues.map(tier => {
        // Берем среднее значение или 0, если нет данных (уже округлено)
        return dataByTierAndMechanic[tier][mechanic].avg || 0;
      });
      
      return {
        name: mechanic,
        type: 'bar' as const,
        stack: 'total',
        emphasis: {
          focus: 'series' as const
        },
        label: {
          show: true,
          formatter: function(params: any) {
            const value = typeof params.value === 'number' ? params.value : 0;
            if (value < 1000) return ''; // Не показываем маленькие значения
            return value >= 10000 
              ? (value / 1000).toFixed(1) + 'k' // Одна цифра после запятой для тысяч
              : value.toString(); // Целые числа
          },
          position: 'inside' as const,
          color: '#fff',
          fontSize: 11,
          textShadowColor: 'rgba(0, 0, 0, 0.5)',
          textShadowBlur: 3
        },
        data: data
      };
    });
    
    // Цветовая схема для механик
    const colors = [
      '#3B82F6', // blue-500
      '#EF4444', // red-500
      '#F59E0B', // amber-500
      '#10B981', // green-500
      '#8B5CF6', // violet-500
      '#EC4899', // pink-500
      '#6B7280'  // gray-500
    ];
    
    // Настраиваем цвета в зависимости от текущей темы
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    
    return {
      backgroundColor: 'transparent',
      title: {
        text: chartTitle,
        left: 'center' as const,
        top: 15,
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
          if (!params) return '';
          
          const paramArray = Array.isArray(params) ? params : [params];
          if (paramArray.length === 0) return '';
          
          const tier = paramArray[0].axisValue;
          let total = 0;
          let result = `<div style="font-weight:bold;margin-bottom:5px">Тир ${tier}</div>`;
          
          // Сначала считаем общую сумму для этого тира
          paramArray.forEach((param) => {
            const value = typeof param.value === 'number' ? param.value : 0;
            if (value > 0) {
              total += value;
            }
          });
          
          // Округляем общую сумму до целого числа
          total = Math.round(total);
          
          // Теперь создаем строки для каждой механики
          paramArray.forEach((param) => {
            const value = typeof param.value === 'number' ? param.value : 0;
            if (value > 0) {
              // Округляем процент до целых чисел
              const percent = Math.round((value / total) * 100);
              
              // Форматируем значение
              const roundedValue = Math.round(value); // Округляем до целого числа
              const formattedValue = roundedValue >= 10000 
                ? (roundedValue / 1000).toFixed(1) + ' тыс.' // Только 1 знак после запятой
                : roundedValue;
              
              result += `<div style="display:flex;justify-content:space-between;margin:3px 0">
                <div>
                  <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background-color:${param.color};margin-right:8px"></span>
                  <span>${param.seriesName}</span>
                </div>
                <div style="margin-left:20px;font-weight:bold">
                  ${formattedValue} (${percent}%)
                </div>
              </div>`;
            }
          });
          
          // Добавляем общую сумму (округленную)
          const formattedTotal = total >= 10000 
            ? (total / 1000).toFixed(1) + ' тыс.' // Только 1 знак после запятой
            : total;
          
          result += `<div style="margin-top:5px;padding-top:5px;border-top:1px solid ${isDark ? '#555' : '#ddd'}">
            <div style="display:flex;justify-content:space-between">
              <span>Всего:</span>
              <span style="font-weight:bold;margin-left:20px">${formattedTotal}</span>
            </div>
          </div>`;
          
          return result;
        },
        backgroundColor: isDark ? 'rgba(30, 30, 30, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        borderColor: isDark ? '#555' : '#ddd',
        textStyle: {
          color: isDark ? '#fff' : '#333'
        }
      },
      legend: {
        data: mechanicTypes,
        orient: 'horizontal' as const,
        left: 'center' as const,
        bottom: 10,
        textStyle: {
          color: textColor,
          fontSize: 12
        },
        itemWidth: 12,
        itemHeight: 12,
        itemGap: 20,
        selectedMode: true    // Позволяет выбирать/скрывать механики
      },
      color: colors,
      grid: {
        left: 60,
        right: 20,
        bottom: 70,
        top: 60,
        containLabel: true
      },
      xAxis: {
        type: 'category' as const,
        data: tierValues.map(tier => `Тир ${tier}`),
        name: 'Тир предмета',
        nameLocation: 'middle' as const,
        nameGap: 35,
        nameTextStyle: {
          color: textColor,
          fontSize: 12,
          padding: [10, 0, 0, 0]
        },
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
        name: analysisDataType === 'sell' ? 'Цена продажи' : 
               analysisDataType === 'buy' ? 'Цена покупки' : 'Базовая ценность',
        nameLocation: 'middle' as const,
        nameGap: 50,
        nameTextStyle: {
          color: textColor,
          fontSize: 12
        },
        axisLabel: {
          color: textColor,
          formatter: function(value: number): string {
            if (value >= 10000) {
              return (value / 1000) + 'k';
            }
            return value.toString();
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
        }
      },
      series: series
    };
  }, [filteredItems, analysisDataType, calculateSellPrice, calculateBuyPrice]);
  
  // Модальное окно редактирования предмета
  const renderEditModal = () => {
    if (!isEditModalOpen) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <h2 className="text-xl font-semibold mb-4">Edit Item</h2>
          
          <div className="space-y-4">
            {/* Добавляем компонент загрузки изображения */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Item Image</label>
              <ImageUpload 
                onUpload={handleImageUpload}
                currentImageId={editFormData.imageId}
                size="lg"
              />
            </div>
            
            {/* Форма редактирования */}
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input 
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData({...editFormData, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Tier</label>
              <input 
                type="number"
                min="1"
                max="10"
                value={editFormData.tier}
                onChange={(e) => setEditFormData({...editFormData, tier: parseInt(e.target.value) || 1})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              />
            </div>
            
            {/* Выпадающий список механик */}
            <div className="relative z-30">
              <label className="block text-sm font-medium mb-1">Mechanic</label>
              <select
                value={editFormData.mechanic}
                onChange={(e) => setEditFormData({...editFormData, mechanic: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {Object.entries(currentConfig.mechanics).map(([mechanic, value]) => (
                  <option key={mechanic} value={mechanic}>
                    {mechanic} (×{value})
                  </option>
                ))}
              </select>
            </div>
  
            {/* Выпадающий список встречаемости - меньший z-index */}
            <div className="relative z-20">
              <label className="block text-sm font-medium mb-1">Встречаемость объекта</label>
              <select
                value={editFormData.frequencyType}
                onChange={(e) => setEditFormData({...editFormData, frequencyType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {Object.entries(currentConfig.frequencyTypes).map(([type, value]) => (
                  <option key={type} value={type}>
                    {type} (×{value})
                  </option>
                ))}
              </select>
            </div>
  
            {/* Выпадающий список сложности крафта */}
            <div className="relative z-10">
              <label className="block text-sm font-medium mb-1">Сложность крафта</label>
              <select
                value={editFormData.craftComplexity}
                onChange={(e) => setEditFormData({...editFormData, craftComplexity: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {Object.entries(currentConfig.craftComplexityTypes).map(([type, value]) => (
                  <option key={type} value={type}>
                    {type} (×{value})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Подтип предмета */}
            <div className="relative z-9">
              <label className="block text-sm font-medium mb-1">Подтип</label>
              <select
                value={editFormData.subType || ''}
                onChange={(e) => setEditFormData({...editFormData, subType: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                <option value="">Не указан</option>
                {Object.keys(currentConfig.subTypeModifiers || {}).map(subType => (
                  <option key={subType} value={subType}>
                    {subType} (×{currentConfig.subTypeModifiers[subType] || 1})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Переключатель типа предмета (обычный/урожай) */}
            <div className="relative z-8">
              <label className="flex items-center space-x-2">
                <input 
                  type="checkbox"
                  checked={editFormData.isHarvest}
                  onChange={(e) => setEditFormData({...editFormData, isHarvest: e.target.checked})}
                  className="form-checkbox h-5 w-5 text-primary rounded"
                />
                <span className="text-sm font-medium">Это предмет урожая</span>
              </label>
            </div>
            
            {/* Дополнительные поля для урожая */}
            {editFormData.isHarvest && (
              <div className="space-y-4 p-4 border border-green-300 dark:border-green-700 rounded-md bg-green-50 dark:bg-green-900/20">
                <h3 className="font-medium text-green-800 dark:text-green-300">Настройки урожая</h3>
                
                {/* Сезоны роста */}
                <div>
                  <label className="block text-sm font-medium mb-1">Сезоны роста</label>
                  <div className="flex flex-wrap gap-2">
                    {(currentConfig.seasons || ['Весна', 'Лето', 'Осень', 'Зима']).map(season => (
                      <label key={season} className="flex items-center space-x-2 p-2 border border-gray-300 dark:border-gray-600 rounded-md">
                        <input 
                          type="checkbox"
                          checked={editFormData.growingSeason?.includes(season) || false}
                          onChange={(e) => {
                            const newSeasons = e.target.checked
                              ? [...(editFormData.growingSeason || []), season]
                              : (editFormData.growingSeason || []).filter(s => s !== season);
                            setEditFormData({...editFormData, growingSeason: newSeasons});
                          }}
                          className="form-checkbox h-4 w-4 text-primary rounded"
                        />
                        <span className="text-sm">{season}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                {/* Время роста */}
                <div>
                  <label className="block text-sm font-medium mb-1">Время роста (дней)</label>
                  <input 
                    type="number"
                    min="1"
                    value={editFormData.growingTime || 1}
                    onChange={(e) => setEditFormData({...editFormData, growingTime: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                {/* Количество за сезон */}
                <div>
                  <label className="block text-sm font-medium mb-1">Количество за сезон</label>
                  <input 
                    type="number"
                    min="1"
                    value={editFormData.harvestPerSeason || 1}
                    onChange={(e) => setEditFormData({...editFormData, harvestPerSeason: parseInt(e.target.value) || 1})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                {/* Стоимость семян */}
                <div>
                  <label className="block text-sm font-medium mb-1">Стоимость семян</label>
                  <input 
                    type="number"
                    min="0"
                    value={editFormData.seedCost || 0}
                    onChange={(e) => setEditFormData({...editFormData, seedCost: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              </div>
            )}
            
            {/* Категории - возвращаем секцию с чекбоксами */}
            <div>
              <label className="block text-sm font-medium mb-1">Categories</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-gray-300 dark:border-gray-700 p-3 rounded-md max-h-52 overflow-y-auto">
                {Object.keys(currentConfig.categories).map(category => (
                  <label key={category} className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={editFormData.selectedCategories.includes(category)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...editFormData.selectedCategories, category]
                          : editFormData.selectedCategories.filter(c => c !== category);
                        setEditFormData({...editFormData, selectedCategories: newCategories});
                      }}
                      className="form-checkbox h-4 w-4 text-primary rounded"
                    />
                    <span>{category}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Модификаторы - возвращаем секцию с чекбоксами */}
            <div>
              <label className="block text-sm font-medium mb-1">Modifiers</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-gray-300 dark:border-gray-700 p-3 rounded-md max-h-52 overflow-y-auto">
                {Object.keys(currentConfig.modifiers).map(modifier => (
                  <label key={modifier} className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={editFormData.selectedModifiers.includes(modifier)}
                      onChange={(e) => {
                        const newModifiers = e.target.checked
                          ? [...editFormData.selectedModifiers, modifier]
                          : editFormData.selectedModifiers.filter(m => m !== modifier);
                        setEditFormData({...editFormData, selectedModifiers: newModifiers});
                      }}
                      className="form-checkbox h-4 w-4 text-primary rounded"
                    />
                    <span>{modifier}</span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Локации - возвращаем секцию с чекбоксами */}
            <div>
              <label className="block text-sm font-medium mb-1">Locations</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 border border-gray-300 dark:border-gray-700 p-3 rounded-md max-h-52 overflow-y-auto">
                {Object.keys(currentConfig.locations).map(location => (
                  <label key={location} className="flex items-center space-x-2">
                    <input 
                      type="checkbox"
                      checked={editFormData.selectedLocations.includes(location)}
                      onChange={(e) => {
                        const newLocations = e.target.checked
                          ? [...editFormData.selectedLocations, location]
                          : editFormData.selectedLocations.filter(l => l !== location);
                        setEditFormData({...editFormData, selectedLocations: newLocations});
                      }}
                      className="form-checkbox h-4 w-4 text-primary rounded"
                    />
                    <span>{location}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingItem(null);
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={saveEditedItem}
              className="px-4 py-2 bg-primary text-white rounded-md"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    );
  };
  
  if (comparisonItems.length === 0) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg text-center">
        <p className="text-gray-500 dark:text-gray-400">
          No items to compare yet. Add items from the Item Calculator.
        </p>
      </div>
    );
  }
  
  // Рендер фильтров и сортировки
  const renderControls = () => (
    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg mb-4">
      <div className="flex flex-wrap gap-4 items-end">
        {/* Фильтры */}
        <div>
          <label className="block text-sm font-medium mb-1">Mechanic</label>
          <select 
            value={filterMechanic}
            onChange={(e) => setFilterMechanic(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            {uniqueMechanics.map((mechanic: string) => (
              <option key={mechanic} value={mechanic}>
                {mechanic === 'all' ? 'All Mechanics' : mechanic}
              </option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Category</label>
          <select 
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            {uniqueCategories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
        
        {/* Новый фильтр по типу предмета */}
        <div>
          <label className="block text-sm font-medium mb-1">Тип предмета</label>
          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
          >
            <option value="all">Все типы</option>
            <option value="regular">Обычные предметы</option>
            <option value="harvest">Урожай</option>
          </select>
        </div>
        
        {/* Новый фильтр по подтипу */}
        {uniqueSubTypes.length > 1 && (
          <div>
            <label className="block text-sm font-medium mb-1">Подтип</label>
            <select 
              value={filterSubType}
              onChange={(e) => setFilterSubType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
            >
              {uniqueSubTypes.map(subType => (
                <option key={subType} value={subType}>
                  {subType === 'all' ? 'Все подтипы' : subType}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">Tier Range</label>
          <div className="flex items-center space-x-2">
            <input 
              type="number" 
              min="1" 
              max="10"
              value={filterTierMin}
              onChange={(e) => setFilterTierMin(Math.min(parseInt(e.target.value) || 1, filterTierMax))}
              className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
            />
            <span>to</span>
            <input 
              type="number" 
              min="1" 
              max="10"
              value={filterTierMax}
              onChange={(e) => setFilterTierMax(Math.max(parseInt(e.target.value) || 1, filterTierMin))}
              className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
            />
          </div>
        </div>
        
        {/* Сортировка */}
        <div>
          <label className="block text-sm font-medium mb-1">Sort By</label>
          <div className="flex items-center space-x-2">
            <select 
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-sm"
            >
              <option value="name">Name</option>
              <option value="tier">Tier</option>
              <option value="cost">Total Cost</option>
              <option value="categoryValue">Category Value</option>
              <option value="tierValue">Tier Value</option>
              <option value="mechanicValue">Mechanic Value</option>
              <option value="growingTime">Время роста</option>
              <option value="profitability">Доходность</option>
            </select>
            
            <button
              onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-gray-200 dark:bg-gray-600 rounded-md"
            >
              {sortDirection === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>
        
        {/* Переключатель отображения сезонных цен */}
        {filterType === 'harvest' || filterType === 'all' ? (
          <div>
            <button
              onClick={() => setShowSeasonalPrices(!showSeasonalPrices)}
              className={`px-3 py-2 rounded-md text-sm ${
                showSeasonalPrices
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              {showSeasonalPrices ? 'Скрыть сезонные цены' : 'Показать сезонные цены'}
            </button>
          </div>
        ) : null}
        
        {/* Кнопки переключения режима просмотра */}
        <div className="ml-auto">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-2 rounded-md text-sm ${
                viewMode === 'table' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              Table View
            </button>
            
            <button
              onClick={() => setViewMode('distribution')}
              className={`px-3 py-2 rounded-md text-sm ${
                viewMode === 'distribution' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              Distribution
            </button>

            <button
              onClick={() => setViewMode('stacked')}
              className={`px-3 py-2 rounded-md text-sm ${
                viewMode === 'stacked' 
                  ? 'bg-primary text-white' 
                  : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              Stacked
            </button>
          </div>
        </div>
      </div>
    </div>
  );
  
  // Рендер статистики
  const renderStatistics = () => {
    if (!statistics) return null;
    
    return (
      <div className="space-y-4 mb-6">
        {/* Основная статистика */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Items</div>
            <div className="text-2xl font-bold">{statistics.count}</div>
          </div>
          
          {/* Базовая стоимость */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Avg Cost</div>
            <div className="text-2xl font-bold">{statistics.costAvg}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-gray-500 dark:text-gray-400 text-sm">Range</div>
            <div className="text-xl font-bold">{statistics.costMin} - {statistics.costMax}</div>
          </div>
          
          {/* Цена продажи */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-red-500 dark:text-red-400 text-sm">Avg Sell</div>
            <div className="text-2xl font-bold text-red-500 dark:text-red-400">{statistics.sellAvg}</div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-red-500 dark:text-red-400 text-sm">Sell Range</div>
            <div className="text-xl font-bold text-red-500 dark:text-red-400">{statistics.sellMin} - {statistics.sellMax}</div>
          </div>
          
          {/* Цена покупки */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
            <div className="text-green-500 dark:text-green-400 text-sm">Avg Buy</div>
            <div className="text-2xl font-bold text-green-500 dark:text-green-400">{statistics.buyAvg}</div>
          </div>
        </div>
        
        {/* Статистика урожая - отображается только если есть урожайные предметы */}
        {statistics.harvestCount > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
              <div className="text-green-600 dark:text-green-400 text-sm">Предметов урожая</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.harvestCount}</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
              <div className="text-green-600 dark:text-green-400 text-sm">Средняя доходность</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.harvestAvgProfit} в день</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
              <div className="text-green-600 dark:text-green-400 text-sm">Мин. доходность</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.harvestMinProfit.toFixed(1)}</div>
            </div>
            
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg shadow-sm border border-green-200 dark:border-green-800">
              <div className="text-green-600 dark:text-green-400 text-sm">Макс. доходность</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{statistics.harvestMaxProfit.toFixed(1)}</div>
            </div>
          </div>
        )}
      </div>
    );
  };
  
  // Функция для создания таблицы сезонных цен
  const renderSeasonalPrices = (item: ItemData) => {
    if (!showSeasonalPrices || !item.isHarvest) return null;
    
    const seasons = currentConfig.seasons || ['Весна', 'Лето', 'Осень', 'Зима'];
    
    return (
      <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700 rounded-md">
        <h4 className="text-xs font-medium mb-1">Сезонные цены:</h4>
        <div className="grid grid-cols-2 gap-1">
          {seasons.map(season => {
            const price = calculateSeasonalItemCost(item, season);
            const isGrowingSeason = item.growingSeason?.includes(season);
            
            return (
              <div key={season} className="flex justify-between items-center">
                <span className={`text-xs ${isGrowingSeason ? 'font-medium text-green-600 dark:text-green-400' : ''}`}>
                  {season}:
                </span>
                <span className={`text-xs ${isGrowingSeason ? 'font-medium text-green-600 dark:text-green-400' : ''}`}>
                  {price}
                </span>
              </div>
            );
          })}
        </div>
        
        {/* Доходность */}
        <div className="mt-2 border-t border-gray-200 dark:border-gray-600 pt-1">
          <div className="flex justify-between">
            <span className="text-xs font-medium">Доходность:</span>
            <span className="text-xs font-medium">{calculateProfitability(item).toFixed(1)} в день</span>
          </div>
        </div>
      </div>
    );
  };
  
  // Рендер таблицы предметов
  const renderTable = () => (
    <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-700">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-12">Image</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Tier</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Mechanic</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-blue-500 dark:text-blue-400 uppercase tracking-wider">Cat</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-green-500 dark:text-green-400 uppercase tracking-wider">Tier</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-purple-500 dark:text-purple-400 uppercase tracking-wider">Mech</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-yellow-500 dark:text-yellow-400 uppercase tracking-wider">Mod</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">Loc</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Base</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-red-500 dark:text-red-400 uppercase tracking-wider">Sell</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-green-500 dark:text-green-400 uppercase tracking-wider">Buy</th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
          {paginatedItems.map((item, index) => {
            // Находим реальный индекс в массиве comparisonItems
            const actualIndex = comparisonItems.findIndex(i => 
              i.name === item.name && 
              i.tier === item.tier && 
              i.mechanic === item.mechanic
            );
            
            // Получаем URL изображения
            const imageUrl = getImageUrl(item.imageId);
            
            return (
              <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-600">
                <td className="px-4 py-3 text-sm">
                  {imageUrl ? (
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 dark:bg-gray-700 flex-shrink-0">
                      <img 
                        src={imageUrl} 
                        alt={item.name} 
                        className="w-full h-full object-cover" 
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center flex-shrink-0">
                      {item.imageId ? (
                        <span className="text-gray-400 text-xs" title={`Image ID: ${item.imageId}`}>ID</span>
                      ) : (
                        <span className="text-gray-400 text-xs">No img</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-sm font-medium">{item.name}</div>
                  {item.subType && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">{item.subType}</div>
                  )}
                  {/* Показываем сезонные цены для урожайных предметов */}
                  {renderSeasonalPrices(item)}
                </td>
                <td className="px-4 py-3 text-sm">{item.tier}</td>
                <td className="px-4 py-3 text-sm">
                  {item.isHarvest ? (
                    <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                      Урожай
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300 rounded-full">
                      Обычный
                    </span>
                  )}
                  {item.isHarvest && item.growingSeason && (
                    <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Сезоны: {formatSeasons(item.growingSeason)}
                    </div>
                  )}
                  {item.isHarvest && item.growingTime && (
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Время: {item.growingTime} дн.
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm">{item.mechanic}</td>
                <td className="px-4 py-3 text-sm text-blue-500 dark:text-blue-400">
                  +{item.components.categoryComponent}
                </td>
                <td className="px-4 py-3 text-sm text-green-500 dark:text-green-400">
                  +{item.components.tierComponent}
                </td>
                <td className="px-4 py-3 text-sm text-purple-500 dark:text-purple-400">
                  +{item.components.mechanicComponent}
                </td>
                <td className="px-4 py-3 text-sm text-yellow-500 dark:text-yellow-400">
                  +{item.components.modifiersComponent}
                </td>
                <td className="px-4 py-3 text-sm text-red-500 dark:text-red-400">
                  +{item.components.locationsComponent}
                </td>
                <td className="px-4 py-3 text-sm font-bold">{item.cost}</td>
                <td className="px-4 py-3 text-sm font-bold text-red-500 dark:text-red-400">{calculateSellPrice(item)}</td>
                <td className="px-4 py-3 text-sm font-bold text-green-500 dark:text-green-400">{calculateBuyPrice(item)}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => startEditing(item, actualIndex >= 0 ? actualIndex : index)}
                      className="text-blue-500 hover:text-blue-700"
                      title="Edit item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => removeItemFromComparison(actualIndex >= 0 ? actualIndex : index)}
                      className="text-red-500 hover:text-red-700"
                      title="Remove item"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Пагинация */}
      <div className="bg-white dark:bg-gray-800 px-4 py-3 flex items-center justify-between border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center">
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Showing <span className="font-medium">{Math.min((currentPage - 1) * itemsPerPage + 1, filteredItems.length)}</span> to{' '}
            <span className="font-medium">
              {Math.min(currentPage * itemsPerPage, filteredItems.length)}
            </span>{' '}
            of <span className="font-medium">{filteredItems.length}</span> results
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={itemsPerPage}
            onChange={(e) => {
              setItemsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700"
          >
            <option value={10}>10 per page</option>
            <option value={20}>20 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
          
          <button
            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage === 1
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
            }`}
          >
            Previous
          </button>
          
          <span className="text-sm text-gray-700 dark:text-gray-300">
            Page {currentPage} of {Math.max(1, Math.ceil(filteredItems.length / itemsPerPage))}
          </span>
          
          <button
            onClick={() => setCurrentPage(Math.min(Math.ceil(filteredItems.length / itemsPerPage), currentPage + 1))}
            disabled={currentPage >= Math.ceil(filteredItems.length / itemsPerPage)}
            className={`px-3 py-1 rounded-md text-sm ${
              currentPage >= Math.ceil(filteredItems.length / itemsPerPage)
                ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
            }`}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Item Comparison Analysis</h2>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {comparisonItems.length} items
        </div>
      </div>
      
      {renderControls()}
      
      {statistics && renderStatistics()}
      
      {viewMode === 'table' && renderTable()}
      
      {viewMode === 'distribution' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md">
            {/* Переключатели типа данных */}
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => setDistributionDataType('base')}
                className={`px-3 py-1 rounded-md text-sm ${
                  distributionDataType === 'base'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                Базовая ценность
              </button>
              
              <button
                onClick={() => setDistributionDataType('sell')}
                className={`px-3 py-1 rounded-md text-sm ${
                  distributionDataType === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                Цена продажи
              </button>
              
              <button
                onClick={() => setDistributionDataType('buy')}
                className={`px-3 py-1 rounded-md text-sm ${
                  distributionDataType === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                Цена покупки
              </button>
            </div>
            
            <div className="h-96">
              <EChartWrapper options={distributionChartOptions} />
            </div>
          </div>
        </div>
      )}

      {viewMode === 'stacked' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md">
            {/* Переключатели типа данных */}
            <div className="flex justify-center space-x-4 mb-4">
              <button
                onClick={() => setAnalysisDataType('base')}
                className={`px-3 py-1 rounded-md text-sm ${
                  analysisDataType === 'base'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                Базовая ценность
              </button>
              
              <button
                onClick={() => setAnalysisDataType('sell')}
                className={`px-3 py-1 rounded-md text-sm ${
                  analysisDataType === 'sell'
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                Цена продажи
              </button>
              
              <button
                onClick={() => setAnalysisDataType('buy')}
                className={`px-3 py-1 rounded-md text-sm ${
                  analysisDataType === 'buy'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500'
                }`}
              >
                Цена покупки
              </button>
            </div>
            
            <div className="h-96">
              <EChartWrapper options={stackedBarChartOptions} />
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно для редактирования */}
      {renderEditModal()}
    </div>
  );
}