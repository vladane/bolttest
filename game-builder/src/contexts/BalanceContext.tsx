import { createContext, useContext, ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAppState } from './AppStateContext';
import { calculateCraftResultValue } from '../utils/priceCalculation';
import { ItemData } from './AppStateContext';

// Переэкспортируем ItemData для обратной совместимости
export type { ItemData };

// Определение типа для сравнения объектов
type ComparableObject = Record<string, any>;

// Определение типа BalanceConfig с добавлением сезонных модификаторов
export interface BalanceConfig {
  id: string;
  name: string;
  baseValue: number;
  weights: {
    categoryWeight: number;
    tierWeight: number;
    mechanicWeight: number;
    modifiersWeight: number;
    locationsWeight: number;
    frequencyWeight: number;
    craftComplexityWeight: number;
  };
  categories: Record<string, number>;
  mechanics: Record<string, number>;
  tierMultiplier: number;
  modifiers: Record<string, number>;
  locations: Record<string, number>;
  frequencyTypes: Record<string, number>;
  craftComplexityTypes: Record<string, number>;
  subTypeModifiers: Record<string, number>; // Модификаторы подтипов
  
  // Сезонные настройки
  currentSeason: string; // Текущий выбранный сезон
  seasons: string[]; // Список всех доступных сезонов
  seasonalCategoryModifiers: Record<string, Record<string, number>>; // Сезонные модификаторы для категорий
  seasonalSubTypeModifiers: Record<string, Record<string, number>>; // Сезонные модификаторы для подтипов
  growthDayMultiplier: number; // Множитель стоимости дня роста урожая
  
  sellDiscount: number;
  buyMarkup: number;
  craftBaseMultiplier: number;
  craftComplexityMultiplier: number;
  version: string;
  createdAt: string;
  craftTimeConfig?: {
    baseTimesByComplexity: {
      'Очень легко': number;
      'Легко': number;
      'Средне': number;
      'Сложно': number;
      'Очень сложно': number;
    };
    ingredientBaseTime: number;
    ingredientScalingFactor: number;
    levelMultiplier: number;
    categoryTimeMultipliers: Record<string, number>;
    version?: number;
  };
}

export interface BalanceContextType {
  currentConfig: BalanceConfig;
  savedConfigs: BalanceConfig[];
  comparisonItems: ItemData[];
  updateConfig: (config: Partial<BalanceConfig>) => void;
  saveCurrentConfig: (name?: string) => void;
  createNewConfig: (name: string) => void;
  loadConfig: (configId: string) => void;
  deleteConfig: (configId: string) => void;
  addItemToComparison: (item: ItemData) => void;
  removeItemFromComparison: (index: number) => void;
  calculateItemCost: (item: ItemData) => number;
  calculateSeasonalItemCost: (item: ItemData, season?: string) => number; // Новая функция
  updateItemInComparison: (index: number, updatedItem: ItemData) => void;
  updateCraftValuesForAllItems: () => void;
  setCurrentSeason: (season: string) => void; // Новая функция
  getSeasonalProfitability: (item: ItemData) => Record<string, number>; // Новая функция
}

const BalanceContext = createContext<BalanceContextType | null>(null);

export function useBalance(): BalanceContextType {
  const context = useContext(BalanceContext);
  
  if (context === null) {
    throw new Error('useBalance must be used within a BalanceProvider');
  }
  
  return context;
}

// Стандартные сезоны
export const DEFAULT_SEASONS = ['Весна', 'Лето', 'Осень', 'Зима'];

export function BalanceProvider({ children }: { children: ReactNode }) {
  const { state, updateState } = useAppState();
  const currentConfig = state.balance.currentConfig;
  const savedConfigs = state.balance.savedConfigs;
  const comparisonItems = state.balance.comparisonItems;
  
  // Создаем кэш для результатов расчетов стоимости
  const priceCacheRef = useRef<Map<string, number>>(new Map());
  
  // Состояние обновления craftValue с дебаунсингом
  const craftValueUpdateRef = useRef<{
    timer: ReturnType<typeof setTimeout> | null;
    lastUpdateTime: number;
    isUpdating: boolean;
    pendingUpdate: boolean;
    lastCallId?: string;      // Новое: идентификатор последнего вызова
    lastCallIdTime?: number;  // Новое: время последнего вызова 
    hasInitialUpdate?: boolean; // Новое: флаг первого обновления
  }>({
    timer: null,
    lastUpdateTime: 0,
    isUpdating: false,
    pendingUpdate: false,
    hasInitialUpdate: false   // Начальное значение
  });
  
  // Функция для глубокого сравнения объектов
  const deepEqual = (obj1: ComparableObject, obj2: ComparableObject): boolean => {
    if (obj1 === obj2) return true;
    if (obj1 === null || obj2 === null) return false;
    if (typeof obj1 !== 'object' || typeof obj2 !== 'object') return obj1 === obj2;
    
    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);
    
    if (keys1.length !== keys2.length) return false;
    
    for (const key of keys1) {
      if (key === 'version') continue; // Игнорируем версию при сравнении
      if (!deepEqual(obj1[key], obj2[key])) return false;
    }
    
    return true;
  };
  
  // Состояние последнего обновления для предотвращения циклических обновлений
  const lastUpdateRef = useRef<{ 
    config: Partial<BalanceConfig> | null, 
    timestamp: number 
  }>({ config: null, timestamp: 0 });
  
  // Обновление конфигурации баланса с оптимизацией
  const updateConfig = useCallback((config: Partial<BalanceConfig>) => {
    // Проверяем, прошло ли достаточно времени с последнего обновления
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateRef.current.timestamp;
    
    // Если обновление слишком частое (менее 200мс), игнорируем
    if (timeSinceLastUpdate < 200 && lastUpdateRef.current.config) {
      // Но пропускаем если это обновление craftTimeConfig.version
      const isOnlyVersionUpdate = 
        config.craftTimeConfig && 
        Object.keys(config).length === 1 && 
        Object.keys(config.craftTimeConfig).length === 1 &&
        'version' in config.craftTimeConfig;
      
      if (!isOnlyVersionUpdate) {
        console.log("🚫 Обновление пропущено - слишком частое");
        return;
      }
    }
    
    // Проверка на реальные изменения для craftTimeConfig
    if (config.craftTimeConfig && currentConfig.craftTimeConfig) {
      // Если меняется только версия и нет других изменений, пропускаем проверку
      const onlyVersionChanged = 
        Object.keys(config.craftTimeConfig).length === 1 && 
        'version' in config.craftTimeConfig;
      
      if (!onlyVersionChanged) {
        // Выполняем глубокое сравнение для проверки реальных изменений
        const configWithoutVersion = { ...config.craftTimeConfig };
        delete configWithoutVersion.version;
        
        const currentWithoutVersion = { ...currentConfig.craftTimeConfig };
        delete currentWithoutVersion.version;
        
        if (deepEqual(configWithoutVersion as ComparableObject, currentWithoutVersion as ComparableObject) && Object.keys(config).length === 1) {
          console.log("🚫 Обновление пропущено - нет реальных изменений в craftTimeConfig");
          return;
        }
      }
    }
    
    // Обновляем состояние последнего обновления
    lastUpdateRef.current = { config, timestamp: now };
    
    // Создаем копию объекта конфигурации с новыми значениями
    const updatedConfig = { ...currentConfig, ...config };
    
    // Очищаем кэш цен при существенных изменениях конфигурации
    if (
      config.baseValue !== undefined || 
      config.tierMultiplier !== undefined ||
      config.weights !== undefined ||
      config.categories !== undefined ||
      config.mechanics !== undefined ||
      config.craftBaseMultiplier !== undefined ||
      config.craftComplexityMultiplier !== undefined ||
      config.subTypeModifiers !== undefined ||
      config.currentSeason !== undefined ||
      config.seasonalCategoryModifiers !== undefined ||
      config.seasonalSubTypeModifiers !== undefined ||
      config.growthDayMultiplier !== undefined
    ) {
      console.log("🧹 Очистка кэша расчета цен из-за изменения параметров");
      priceCacheRef.current.clear();
    }
    
    // Обновляем состояние
    console.log("✅ Конфигурация баланса обновлена:", config);
    updateState('balance.currentConfig', updatedConfig);
  }, [currentConfig, updateState]);
  
  // Функция для выполнения обновления craftValue
  const executeCraftValuesUpdate = useCallback(() => {
    const updateStateRef = craftValueUpdateRef.current;
    updateStateRef.isUpdating = true;
    
    console.log("🔄 Выполняется обновление craftValue...");
    
    // Используем setTimeout для предотвращения блокировки UI
    setTimeout(() => {
      try {
        if (!state.craftSystem.recipes || state.craftSystem.recipes.length === 0) {
          console.log("Нет рецептов для обновления craftValue");
          updateStateRef.isUpdating = false;
          return;
        }
        
        // Копия списка предметов для обновления
        const updatedItems = [...comparisonItems];
        let hasChanges = false;
        let changesCount = 0;
        
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
          imageId: item.imageId || null // Добавляем поле imageId для совместимости с ItemData
        }));
        
        // Объединяем с предметами из сравнения для расчетов
        const allItems = [...updatedItems, ...resourceItems];
        
        // Создаем Set с именами предметов, для которых есть рецепты
        const recipeItemNames = new Set(state.craftSystem.recipes.map(r => r.resultItemName));
        
        // Для каждого предмета в списке проверяем, нужно ли обновить craftValue
        updatedItems.forEach((item, index) => {
          const hasRecipe = recipeItemNames.has(item.name);
          
          // Если у предмета есть рецепт, но не установлен флаг hasCraftRecipe или отсутствует craftValue
          // ИЛИ у предмета установлен флаг hasCraftRecipe, но для него нет рецепта
          if ((hasRecipe && (!item.hasCraftRecipe || item.craftValue === undefined)) ||
              (!hasRecipe && item.hasCraftRecipe)) {
            
            if (hasRecipe) {
              // Находим соответствующий рецепт
              const recipe = state.craftSystem.recipes.find(r => r.resultItemName === item.name);
              if (recipe) {
                try {
                  // Рассчитываем новое значение craftValue
                  const newCraftValue = calculateCraftResultValue(recipe, allItems, currentConfig);
                  
                  // Обновляем предмет
                  updatedItems[index] = {
                    ...updatedItems[index],
                    hasCraftRecipe: true,
                    craftValue: newCraftValue
                  };
                  
                  hasChanges = true;
                  changesCount++;
                } catch (error) {
                  console.error(`Ошибка при расчете craftValue для ${recipe.resultItemName}:`, error);
                }
              }
            } else {
              // Если у предмета нет рецепта, но есть флаг hasCraftRecipe - убираем его
              updatedItems[index] = {
                ...updatedItems[index],
                hasCraftRecipe: false,
                craftValue: undefined
              };
              
              hasChanges = true;
              changesCount++;
            }
          }
        });
        
        // Обновляем состояние только если были изменения
        if (hasChanges) {
          console.log(`✅ Сохраняем обновленные значения craftValue (${changesCount} изменений)`);
          updateState('balance.comparisonItems', updatedItems);
        } else {
          console.log("🚫 Нет изменений в craftValue - обновление не требуется");
        }
        
        // Обновляем время последнего обновления
        updateStateRef.lastUpdateTime = Date.now();
        
        // Сбрасываем флаг обновления после небольшой задержки
        setTimeout(() => {
          updateStateRef.isUpdating = false;
          
          // Если есть отложенное обновление, запускаем его
          if (updateStateRef.pendingUpdate) {
            updateStateRef.pendingUpdate = false;
            updateCraftValuesForAllItems();
          }
        }, 300);
        
      } catch (error) {
        console.error("Ошибка при обновлении craftValue:", error);
        updateStateRef.isUpdating = false;
      }
    }, 0);
  }, [state.craftSystem.recipes, comparisonItems, currentConfig, state.resources.items, updateState]);
  
  // Оптимизированная функция обновления craftValue с дебаунсингом
  const updateCraftValuesForAllItems = useCallback(() => {
    const updateStateRef = craftValueUpdateRef.current;
    const now = Date.now();
    const MIN_UPDATE_INTERVAL = 2500; // Увеличиваем до 2.5 сек для надежности
    
    // Новый идентификатор для этого вызова 
    const callId = now.toString();
    
    // Защита от повторных вызовов из-за StrictMode (интервал менее 100мс)
    if (updateStateRef.lastCallId && (now - (updateStateRef.lastCallIdTime || 0) < 100)) {
      // Тихо пропускаем повторный вызов из StrictMode без логирования
      return;
    }
    
    // Сохраняем данные о текущем вызове
    updateStateRef.lastCallId = callId;
    updateStateRef.lastCallIdTime = now;
    
    // Проверка наличия первого обновления (избегаем ненужных начальных обновлений)
    if (!updateStateRef.hasInitialUpdate) {
      // Устанавливаем флаг первого обновления
      updateStateRef.hasInitialUpdate = true;
      
      // Для первого обновления выполняем немедленно, но ограничиваем будущие обновления
      updateStateRef.lastUpdateTime = now;
      console.log("🔄 Первое обновление craftValue...");
      executeCraftValuesUpdate();
      return;
    }
    
    console.log("🔄 Запланировано обновление craftValue...");
    
    // Если обновление уже выполняется, помечаем, что есть ожидающее обновление
    if (updateStateRef.isUpdating) {
      updateStateRef.pendingUpdate = true;
      console.log("⏳ Обновление craftValue уже выполняется, следующее будет отложено");
      return;
    }
    
    // Проверяем, прошло ли достаточно времени после последнего обновления
    const timeSinceLastUpdate = now - updateStateRef.lastUpdateTime;
    if (timeSinceLastUpdate < MIN_UPDATE_INTERVAL) {
      // Если обновление было недавно, планируем его на будущее
      if (updateStateRef.timer) clearTimeout(updateStateRef.timer);
      
      console.log(`⏳ Отложено обновление craftValue на ${MIN_UPDATE_INTERVAL - timeSinceLastUpdate}мс`);
      
      updateStateRef.timer = setTimeout(() => {
        // Проверяем, что этот вызов все еще актуален
        if (updateStateRef.lastCallId === callId) {
          executeCraftValuesUpdate();
        }
      }, MIN_UPDATE_INTERVAL - timeSinceLastUpdate);
      
      return;
    }
    
    // Если прошло достаточно времени, выполняем обновление немедленно
    executeCraftValuesUpdate();
  }, [executeCraftValuesUpdate]);
  
  // Дебаунсированный эффект для обновления craftValue при изменении конфигурации
  useEffect(() => {
    // Используем таймер для дебаунсинга
    const timer = setTimeout(() => {
      // Проверяем, нужно ли обновлять craftValue
      if (
        currentConfig.craftBaseMultiplier !== undefined || 
        currentConfig.craftComplexityMultiplier !== undefined ||
        currentConfig.baseValue !== undefined ||
        currentConfig.weights !== undefined
      ) {
        updateCraftValuesForAllItems();
      }
    }, 800); // Увеличиваем задержку для лучшей производительности
    
    return () => clearTimeout(timer);
  }, [currentConfig, updateCraftValuesForAllItems]);
  
  // Новая функция - установка текущего сезона
  const setCurrentSeason = useCallback((season: string) => {
    if (!currentConfig.seasons || !currentConfig.seasons.includes(season)) {
      console.error(`Сезон "${season}" не найден в списке сезонов`);
      return;
    }
    
    updateConfig({ currentSeason: season });
    
    // Очищаем кэш, так как изменение сезона влияет на стоимость
    priceCacheRef.current.clear();
  }, [currentConfig.seasons, updateConfig]);
  
  // Сохранение текущей конфигурации
  const saveCurrentConfig = useCallback((name?: string) => {
    const configToSave = {
      ...currentConfig,
      name: name || currentConfig.name,
      createdAt: new Date().toISOString(),
      craftTimeConfig: currentConfig.craftTimeConfig ? {
        ...currentConfig.craftTimeConfig,
        version: Date.now()
      } : currentConfig.craftTimeConfig
    };
    
    const existingIndex = savedConfigs.findIndex(config => config.id === configToSave.id);
    
    if (existingIndex !== -1) {
      const updatedConfigs = [...savedConfigs];
      updatedConfigs[existingIndex] = configToSave;
      updateState('balance.savedConfigs', updatedConfigs);
    } else {
      updateState('balance.savedConfigs', [...savedConfigs, configToSave]);
    }
    
    updateState('balance.currentConfig', configToSave);
  }, [currentConfig, savedConfigs, updateState]);
  
  // Создание новой конфигурации с инициализацией сезонных настроек
  const createNewConfig = useCallback((name: string) => {
    console.log("Создаем новую конфигурацию:", name);
    
    // Генерируем новый уникальный ID
    const newConfigId = `config-${Date.now()}`;
    
    // Инициализируем сезонные настройки, если их нет
    const seasons = currentConfig.seasons || DEFAULT_SEASONS;
    const currentSeason = currentConfig.currentSeason || seasons[0];
    
    // Инициализируем сезонные модификаторы для категорий, если их нет
    let seasonalCategoryModifiers = currentConfig.seasonalCategoryModifiers || {};
    if (!seasonalCategoryModifiers || Object.keys(seasonalCategoryModifiers).length === 0) {
      seasonalCategoryModifiers = {};
      // Инициализируем для каждой категории с нейтральными модификаторами для всех сезонов
      Object.keys(currentConfig.categories).forEach(category => {
        seasonalCategoryModifiers[category] = {};
        seasons.forEach(season => {
          seasonalCategoryModifiers[category][season] = 1.0; // Нейтральный модификатор
        });
      });
    }
    
    // Инициализируем сезонные модификаторы для подтипов, если их нет
    let seasonalSubTypeModifiers = currentConfig.seasonalSubTypeModifiers || {};
    if (!seasonalSubTypeModifiers || Object.keys(seasonalSubTypeModifiers).length === 0) {
      seasonalSubTypeModifiers = {};
      // Инициализируем для каждого подтипа, если они есть
      if (currentConfig.subTypeModifiers) {
        Object.keys(currentConfig.subTypeModifiers).forEach(subType => {
          seasonalSubTypeModifiers[subType] = {};
          seasons.forEach(season => {
            seasonalSubTypeModifiers[subType][season] = 1.0; // Нейтральный модификатор
          });
        });
      }
    }
    
    // Создаем новый объект конфигурации на основе текущего
    const newConfig: BalanceConfig = {
      id: newConfigId,
      name: name,
      baseValue: currentConfig.baseValue,
      weights: { ...currentConfig.weights },
      categories: { ...currentConfig.categories },
      mechanics: { ...currentConfig.mechanics },
      tierMultiplier: currentConfig.tierMultiplier,
      modifiers: { ...currentConfig.modifiers },
      locations: { ...currentConfig.locations },
      frequencyTypes: { ...currentConfig.frequencyTypes },
      craftComplexityTypes: { ...currentConfig.craftComplexityTypes },
      subTypeModifiers: currentConfig.subTypeModifiers ? { ...currentConfig.subTypeModifiers } : {},
      
      // Сезонные настройки
      currentSeason: currentSeason,
      seasons: [...seasons],
      seasonalCategoryModifiers: JSON.parse(JSON.stringify(seasonalCategoryModifiers)),
      seasonalSubTypeModifiers: JSON.parse(JSON.stringify(seasonalSubTypeModifiers)),
      growthDayMultiplier: currentConfig.growthDayMultiplier || 5.0, // По умолчанию 5 валюты за день роста
      
      sellDiscount: currentConfig.sellDiscount,
      buyMarkup: currentConfig.buyMarkup,
      craftBaseMultiplier: currentConfig.craftBaseMultiplier,
      craftComplexityMultiplier: currentConfig.craftComplexityMultiplier,
      craftTimeConfig: currentConfig.craftTimeConfig 
        ? { ...currentConfig.craftTimeConfig,
            categoryTimeMultipliers: { ...currentConfig.craftTimeConfig.categoryTimeMultipliers },
            version: Date.now() // Обновляем версию
          } 
        : {
            baseTimesByComplexity: {
              'Очень легко': 20,
              'Легко': 30,
              'Средне': 45,
              'Сложно': 60,
              'Очень сложно': 90
            },
            ingredientBaseTime: 3,
            ingredientScalingFactor: 0.7,
            levelMultiplier: 0.2,
            categoryTimeMultipliers: { ...currentConfig.categories },
            version: Date.now() // Устанавливаем версию для новой конфигурации
          },
      version: currentConfig.version,
      createdAt: new Date().toISOString()
    };
    
    console.log("Новая конфигурация с ID:", newConfig.id);
    
    // Сохраняем текущую конфигурацию перед переключением
    if (currentConfig.id !== 'default') {
      const currentInSaved = savedConfigs.find(c => c.id === currentConfig.id);
      
      // Если текущий конфиг не сохранен или отличается от сохраненного, сохраняем его
      if (!currentInSaved || !deepEqual(currentInSaved as ComparableObject, currentConfig as ComparableObject)) {
        console.log("Сохраняем текущую конфигурацию перед переключением");
        const updatedSavedConfigs = savedConfigs.filter(c => c.id !== currentConfig.id);
        updatedSavedConfigs.push({ ...currentConfig });
        updateState('balance.savedConfigs', updatedSavedConfigs);
      }
    }
    
    // Теперь добавляем новую конфигурацию и делаем ее текущей
    // Делаем это отдельными операциями с использованием Promise и задержки
    const addNewConfig = async () => {
      // 1. Добавляем новую конфигурацию в savedConfigs
      console.log("Добавляем новую конфигурацию в список");
      updateState('balance.savedConfigs', [...savedConfigs, newConfig]);
      
      // 2. Ждем немного для обновления состояния
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 3. Устанавливаем новую конфигурацию как текущую
      console.log("Устанавливаем новую конфигурацию как текущую");
      updateState('balance.currentConfig', newConfig);
      
      // 4. Очищаем кэш цен при смене конфигурации
      priceCacheRef.current.clear();
    };
    
    // Запускаем асинхронное обновление
    addNewConfig();
  }, [currentConfig, savedConfigs, updateState]);
  
  // Загрузка сохраненной конфигурации
  const loadConfig = useCallback((configId: string) => {
    const config = savedConfigs.find(config => config.id === configId);
    if (config) {
      console.log("📂 Загружаем конфигурацию:", config.name);
      
      // Проверяем и инициализируем сезонные настройки если они отсутствуют
      let configWithSeasons = { ...config };
      
      // Проверка на наличие сезонных настроек
      if (!configWithSeasons.seasons || configWithSeasons.seasons.length === 0) {
        configWithSeasons.seasons = DEFAULT_SEASONS;
      }
      
      if (!configWithSeasons.currentSeason || !configWithSeasons.seasons.includes(configWithSeasons.currentSeason)) {
        configWithSeasons.currentSeason = configWithSeasons.seasons[0];
      }
      
      // Инициализация сезонных модификаторов для категорий
      if (!configWithSeasons.seasonalCategoryModifiers) {
        configWithSeasons.seasonalCategoryModifiers = {};
        // Инициализируем для каждой категории с нейтральными модификаторами
        Object.keys(configWithSeasons.categories).forEach(category => {
          configWithSeasons.seasonalCategoryModifiers[category] = {};
          configWithSeasons.seasons.forEach(season => {
            configWithSeasons.seasonalCategoryModifiers[category][season] = 1.0;
          });
        });
      }
      
      // Инициализация сезонных модификаторов для подтипов
      if (!configWithSeasons.seasonalSubTypeModifiers) {
        configWithSeasons.seasonalSubTypeModifiers = {};
        if (configWithSeasons.subTypeModifiers) {
          Object.keys(configWithSeasons.subTypeModifiers).forEach(subType => {
            configWithSeasons.seasonalSubTypeModifiers[subType] = {};
            configWithSeasons.seasons.forEach(season => {
              configWithSeasons.seasonalSubTypeModifiers[subType][season] = 1.0;
            });
          });
        }
      }
      
      // Установка множителя дней роста, если отсутствует
      if (configWithSeasons.growthDayMultiplier === undefined) {
        configWithSeasons.growthDayMultiplier = 5.0;
      }
      
      // Обновляем версию craftTimeConfig при загрузке конфигурации
      const loadedConfig = { 
        ...configWithSeasons,
        craftTimeConfig: configWithSeasons.craftTimeConfig ? {
          ...configWithSeasons.craftTimeConfig,
          version: Date.now() // Обновляем версию при загрузке конфигурации
        } : configWithSeasons.craftTimeConfig
      };
      
      updateState('balance.currentConfig', loadedConfig);
      
      // Очищаем кэш цен при смене конфигурации
      priceCacheRef.current.clear();
    }
  }, [savedConfigs, updateState]);
  
  // Удаление конфигурации
  const deleteConfig = useCallback((configId: string) => {
    const updatedConfigs = savedConfigs.filter(config => config.id !== configId);
    updateState('balance.savedConfigs', updatedConfigs);
  }, [savedConfigs, updateState]);
  
  // Добавление нового предмета для сравнения
  const addItemToComparison = useCallback((item: ItemData) => {
    // Убедимся, что imageId не undefined перед добавлением
    if (item.imageId === undefined) {
      item.imageId = null;
    }
    
    updateState('balance.comparisonItems', [...comparisonItems, item]);
  }, [comparisonItems, updateState]);
  
  // Удаление предмета из сравнения
  const removeItemFromComparison = useCallback((index: number) => {
    const newItems = [...comparisonItems];
    newItems.splice(index, 1);
    updateState('balance.comparisonItems', newItems);
  }, [comparisonItems, updateState]);
  
  // Обновление существующего предмета
  const updateItemInComparison = useCallback((index: number, updatedItem: ItemData) => {
    if (index < 0 || index >= comparisonItems.length) {
      console.error(`Invalid index: ${index}, items length: ${comparisonItems.length}`);
      return;
    }
    
    const newItems = [...comparisonItems];
    
    // Убедимся, что imageId не undefined перед присваиванием
    if (updatedItem.imageId === undefined) {
      updatedItem.imageId = null;
    }
    
    newItems[index] = updatedItem;
    updateState('balance.comparisonItems', newItems);
  }, [comparisonItems, updateState]);
  
  // Базовая функция расчета стоимости предмета (без учета сезона)
  const calculateBaseItemCost = useCallback((item: ItemData): number => {
    if (!item) return 0;
    
    // Если у предмета есть craftValue и он является крафтовым, используем его
    if (item.craftValue !== undefined && item.craftValue > 0 && item.hasCraftRecipe === true) {
      return item.craftValue;
    }
    
    // Если предмет является урожаем, используем специальную формулу
    if (item.isHarvest) {
      const seedCost = item.seedCost || 0;
      const growingTime = item.growingTime || 0;
      const harvestPerSeason = item.harvestPerSeason || 1;
      const dayMultiplier = currentConfig.growthDayMultiplier || 1.0;
      
      // Формула: (стоимость семян + (время роста * множитель дня)) / количество за сезон
      const harvestCost = (seedCost + (growingTime * dayMultiplier)) / harvestPerSeason;
      
      // Округляем до целого числа
      return Math.round(harvestCost);
    }
    
    // Убедимся, что все числовые значения определены
    const categoryWeight = currentConfig.weights.categoryWeight || 0;
    const tierWeight = currentConfig.weights.tierWeight || 0;
    const mechanicWeight = currentConfig.weights.mechanicWeight || 0;
    const modifiersWeight = currentConfig.weights.modifiersWeight || 0;
    const locationsWeight = currentConfig.weights.locationsWeight || 0;
    const frequencyWeight = currentConfig.weights.frequencyWeight || 0;
    const craftComplexityWeight = currentConfig.weights.craftComplexityWeight || 0;
    const baseValue = currentConfig.baseValue || 0;
    const tierMultiplier = currentConfig.tierMultiplier || 0;
    
    // Расчет влияния категорий
    const categorySum = item.selectedCategories.reduce((sum: number, cat: string) => {
      return sum + (currentConfig.categories[cat] || 0);
    }, 0);
    
    // Компонент категорий
    const categoryComponent = categoryWeight * 
      (item.selectedCategories.length > 0 ? categorySum / item.selectedCategories.length : 0);
    
    // Компонент тира (уровня)
    const tierComponent = tierWeight * 
      (1 + (item.tier - 1) * tierMultiplier);
    
    // Компонент механики
    const mechanicComponent = mechanicWeight * 
      (currentConfig.mechanics[item.mechanic] || 1);
    
    // Компонент модификаторов
    const modifiersSum = item.selectedModifiers.reduce((sum: number, mod: string) => {
      return sum + (currentConfig.modifiers[mod] || 0);
    }, 0);
    
    const modifiersComponent = modifiersWeight * 
      (item.selectedModifiers.length > 0 ? modifiersSum / item.selectedModifiers.length : 1);
      
    // Компонент локаций
    const locationsSum = item.selectedLocations.reduce((sum: number, loc: string) => {
      return sum + (currentConfig.locations[loc] || 0);
    }, 0);
    
    const locationsComponent = locationsWeight * 
      (item.selectedLocations.length > 0 ? locationsSum / item.selectedLocations.length : 1);
    
    // Добавляем расчет для новых модификаторов
    const frequencyComponent = frequencyWeight * 
      (currentConfig.frequencyTypes[item.frequencyType] || 1.0);
    
    const craftComplexityComponent = craftComplexityWeight * 
      (currentConfig.craftComplexityTypes[item.craftComplexity] || 1.0);
    
    // Добавляем расчет для компонента подтипа
    let subTypeMultiplier = 1.0;
    if (item.subType && currentConfig.subTypeModifiers && currentConfig.subTypeModifiers[item.subType]) {
      subTypeMultiplier = currentConfig.subTypeModifiers[item.subType];
    }
    
    // Итоговый расчет с учетом подтипа
    let total = baseValue * 
      (categoryComponent + tierComponent + mechanicComponent + modifiersComponent + 
      locationsComponent + frequencyComponent + craftComplexityComponent);
    
    // Применяем множитель подтипа к общей стоимости
    total *= subTypeMultiplier;
    
    return Math.round(total);
  }, [currentConfig]);
  
  // Расчет сезонного модификатора для предмета
  const calculateSeasonalModifier = useCallback((item: ItemData, season: string): number => {
    if (!season || !currentConfig.seasons || !currentConfig.seasons.includes(season)) {
      return 1.0; // Нейтральный модификатор, если сезон не указан или неверный
    }
    
    let modifier = 1.0;
    
    // Применяем сезонные модификаторы категорий
    if (currentConfig.seasonalCategoryModifiers) {
      item.selectedCategories.forEach(category => {
        const categoryModifiers = currentConfig.seasonalCategoryModifiers[category];
        if (categoryModifiers && categoryModifiers[season]) {
          // Усредняем модификаторы всех категорий
          modifier *= (categoryModifiers[season] || 1.0);
        }
      });
      
      // Нормализуем модификатор, если есть категории
      if (item.selectedCategories.length > 0) {
        modifier = Math.pow(modifier, 1 / item.selectedCategories.length);
      }
    }
    
    // Применяем сезонный модификатор подтипа, если есть
    if (item.subType && currentConfig.seasonalSubTypeModifiers) {
      const subTypeModifiers = currentConfig.seasonalSubTypeModifiers[item.subType];
      if (subTypeModifiers && subTypeModifiers[season]) {
        modifier *= (subTypeModifiers[season] || 1.0);
      }
    }
    
    // Для урожая проверяем, подходит ли сезон для роста
    if (item.isHarvest && item.growingSeason) {
      // Если сезон подходит для роста, стоимость не меняется
      if (item.growingSeason.includes(season)) {
        // Ничего не меняем
      } else {
        // Если сезон не подходит для роста, стоимость возрастает (дефицит)
        modifier *= 1.5; // Увеличиваем на 50%
      }
    }
    
    return modifier;
  }, [currentConfig]);
  
  // Расчет стоимости предмета с учетом сезона
  const calculateSeasonalItemCost = useCallback((item: ItemData, season?: string): number => {
    if (!item) return 0;
    
    // Выбираем сезон - указанный или текущий из конфигурации
    const useSeason = season || currentConfig.currentSeason;
    
    // Создаем ключ для кэша с учетом сезона
    const cacheKey = `${item.name}_${item.tier}_${item.subType || 'none'}_${useSeason}_${currentConfig.id}_${currentConfig.version}_${item.hasCraftRecipe}_${item.craftValue}_${item.selectedCategories.join(',')}_${item.selectedModifiers.join(',')}_${item.selectedLocations.join(',')}_${item.frequencyType || ''}_${item.craftComplexity || ''}`;
    
    // Проверяем, есть ли результат в кэше
    if (priceCacheRef.current.has(cacheKey)) {
      const cachedValue = priceCacheRef.current.get(cacheKey);
      return cachedValue !== undefined ? cachedValue : 0;
    }
    
    // Базовая стоимость
    const baseCost = calculateBaseItemCost(item);
    
    // Сезонный модификатор
    const seasonalModifier = calculateSeasonalModifier(item, useSeason);
    
    // Итоговая стоимость с учетом сезона
    const finalCost = Math.round(baseCost * seasonalModifier);
    
    // Сохраняем результат в кэш
    priceCacheRef.current.set(cacheKey, finalCost);
    
    return finalCost;
  }, [currentConfig, calculateBaseItemCost, calculateSeasonalModifier]);
  
  // Текущий расчет стоимости (использует сезонный расчет с текущим сезоном)
  const calculateItemCost = useCallback((item: ItemData): number => {
    return calculateSeasonalItemCost(item, currentConfig.currentSeason);
  }, [calculateSeasonalItemCost, currentConfig.currentSeason]);
  
  // Функция для получения доходности предмета во всех сезонах
  const getSeasonalProfitability = useCallback((item: ItemData): Record<string, number> => {
    if (!item.isHarvest) {
      return {}; // Возвращаем пустой объект для не-урожайных предметов
    }
    
    const result: Record<string, number> = {};
    const seasons = currentConfig.seasons || DEFAULT_SEASONS;
    
    seasons.forEach(season => {
      const seasonalCost = calculateSeasonalItemCost(item, season);
      const seedCost = item.seedCost || 0;
      const growingTime = item.growingTime || 1;
      
      // Прибыль = (Стоимость - Стоимость семян) / Время роста
      // Это дает ежедневную прибыль от выращивания
      const profitability = (seasonalCost - seedCost) / growingTime;
      
      result[season] = profitability;
    });
    
    return result;
  }, [currentConfig.seasons, calculateSeasonalItemCost]);
  
  // Мемоизируем значение контекста для предотвращения ненужных перерендеров
  const contextValue = useMemo(() => ({
    currentConfig,
    savedConfigs,
    comparisonItems,
    updateConfig,
    saveCurrentConfig,
    createNewConfig,
    loadConfig,
    deleteConfig,
    addItemToComparison,
    removeItemFromComparison,
    calculateItemCost,
    calculateSeasonalItemCost,
    updateItemInComparison,
    updateCraftValuesForAllItems,
    setCurrentSeason,
    getSeasonalProfitability
  }), [
    currentConfig,
    savedConfigs,
    comparisonItems,
    updateConfig,
    saveCurrentConfig,
    createNewConfig,
    loadConfig,
    deleteConfig,
    addItemToComparison,
    removeItemFromComparison,
    calculateItemCost,
    calculateSeasonalItemCost,
    updateItemInComparison,
    updateCraftValuesForAllItems,
    setCurrentSeason,
    getSeasonalProfitability
  ]);
  
  return (
    <BalanceContext.Provider value={contextValue}>
      {children}
    </BalanceContext.Provider>
  );
}