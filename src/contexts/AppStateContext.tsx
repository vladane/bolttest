import { createContext, useContext, useState, ReactNode } from 'react';
import { BalanceConfig } from './BalanceContext';

// Глобальная переменная для хранения информации о конфигурации вне React
let lastBalanceConfig: any = null;
// Глобальная переменная для временного хранения изображений при импорте
let importedImages: {
  units?: Map<string, any>,
  resources?: Map<string, any>
} = {};

// Добавляем перечисление для типов слотов экипировки
export enum EquipmentSlotType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HELMET = 'helmet',
  GLOVES = 'gloves',
  BOOTS = 'boots',
  ACCESSORY = 'accessory'
}

// Определяем типы данных
interface UnitStats {
  health: number;
  physDefense: number;
  magicDefense: number;
  speed: number;
}

interface Unit {
  name: string;
  rarity: string;
  element: string;
  stats: UnitStats;
  imageId: string | null;
  gearRequirements: Record<string, number[]>;
  abilities: number[];
  equipment?: Record<string, number | null>; // Добавляем опциональное свойство equipment
}

export interface Item {
  name: string;
  rarity: string;
  imageId: string | null;
  slotType: EquipmentSlotType | null;
}

interface Ability {
  name: string;
  type: string;
  cooldown: number;
  description: string;
  targetType: string;
  iconId: string | null;
  effects: any[];
}

interface Rarity {
  id: string;
  name: string;
  value: number;
}

interface ImageData {
  data: string;
  type: string;
}

interface Category {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface Resource {
  id: string;
  name: string;
  description: string;
  category: string;
  value: number;
  imageId: string | null;
}

// Определение типов для рецептов
interface RecipeIngredient {
  resourceId: string;
  amount: number;
}

interface RecipeResult {
  resourceId: string;
  amount: number;
  chance: number; // 0-100%
}

interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: RecipeIngredient[];
  results: RecipeResult[];
  craftTime: number; // в секундах
  level: number;
  imageId: string | null;
}

// Обновленная модель для рецептов с поддержкой топлива
export interface CraftRecipe {
  id: string;
  name: string;
  resultItemName: string;
  resultAmount: number;
  category: string;
  level: number;
  imageId: string | null;
  variants: CraftRecipeVariant[];
  // Новые поля для сезонности
  isSeasonDependent?: boolean;
  availableSeasons?: string[];
  seasonalMultipliers?: Record<string, number>;
  // Новое поле для печи
  requiresFuel?: boolean;      // Требуется ли топливо для крафта в печи
}

export interface CraftRecipeVariant {
  id: string;
  name: string; // Название варианта, например "Стандартный", "Экономичный"
  ingredients: CraftIngredient[];
  craftTime?: number; // Расчетное время в игровых единицах
  // Новое поле для топлива
  fuelItems?: Array<{
    itemName: string;          // Название предмета-топлива
    amount: number;            // Необходимое количество
  }>;
}

export interface CraftIngredient {
  itemName: string; // Используем имя вместо ID
  amount: number;
}

// Обновленная модель для ItemData с поддержкой топлива
export interface ItemData {
  name: string;
  tier: number;
  mechanic: string;
  selectedCategories: string[];
  selectedModifiers: string[];
  selectedLocations: string[];
  frequencyType: string;
  craftComplexity: string;
  imageId: string | null | undefined; // Изменено: добавлен undefined для совместимости с BalanceContext
  imageUrl?: string | null; // Добавлено: для совместимости с ItemComparison.tsx
  subType?: string;
  craftValue?: number;
  hasCraftRecipe?: boolean;
  
  // Поля для урожая
  isHarvest?: boolean;
  growingSeason?: string[];
  growingTime?: number;
  harvestPerSeason?: number;
  seedCost?: number;
  
  // Поля для топлива
  isFuel?: boolean;
  fuelEfficiency?: number;
}

// Новые типы для системы смешивания
export interface MixingRecipe {
  id: string;
  name: string;
  ingredients: ItemData[]; // Ингредиенты из Balance & Crafting Center
  result: {
    name: string;
    imageId: string;
    foodType: 'meat' | 'fish' | 'general' | 'other';
    description?: string;
    effects?: string[];
    nutrition?: number;
  };
}

export interface SpoiledFood {
  type: 'meat' | 'fish' | 'general';
  name: string;
  imageId: string;
  description?: string;
}

// Типы данных для системы магазинов
export interface Currency {
  id: string;
  name: string;
  description?: string;
  icon?: string | null;
  color?: string;
  exchangeRate?: number; // Курс обмена относительно базовой валюты
  isDefault?: boolean;    // Флаг базовой валюты
}

export interface CostRange {
  costType: number; // 0 - фиксированная, 1 - диапазон, 2 - процент от стоимости предмета
  from: number;
  to: number;
}

export interface ShopItem {
  shopItemId: string;      // ID товара в магазине (обычно совпадает с ID предмета)
  minAppearanceCount: number; // Минимальное количество при появлении
  maxAppearanceCount: number; // Максимальное количество при появлении
  appearanceChance: number;   // Вероятность появления (от 0 до 1)
  overrideCost: boolean;      // Переопределить стоимость
  overrideCurrencyId: string; // ID используемой валюты
  buyCost: CostRange;         // Стоимость покупки
  sellCost: CostRange;        // Стоимость продажи
  id: string;                 // ID самого предмета
  count: number;              // Количество
}

export interface Shop {
  shopId: string;
  name: string;
  description?: string;
  shopItems: ShopItem[];
  restockTime?: number;     // Время пополнения ассортимента (в минутах)
  isRandomStock?: boolean;  // Случайный ассортимент при пополнении
}

export interface Trader {
  traderId: string;
  name: string;
  shopId: string;
  traderInventoryUIId: string;
  buyInventoryUIId: string;
  sellInventoryUIId: string;
  fillShopWhenTraderHasCreated: boolean;
  canTrade: boolean;
  canInteractDirectly: boolean;
  description?: string;
  avatarId?: string | null;
  location?: string;
}

export interface AppState {
  units: {
    units: Unit[];
    items: Item[];
    abilities: Ability[];
    nextImageId: number;
    imageMap: Map<string, ImageData>;
    sorting: string;
    elementFilter: string;
    itemSorting: string;
    abilitySorting: string;
    rarities: Rarity[];
    currentUnitAbilities: number[];
    currentUnitGearRequirements: Map<string, number[]>;
  };
  resources: {
    items: Resource[];
    categories: Category[];
    imageMap: Map<string, ImageData>;
    nextImageId: number;
  };
  recipes: {
    recipes: Recipe[];
    nextId: number;
  };
  balance: {
    currentConfig: BalanceConfig;
    savedConfigs: BalanceConfig[];
    comparisonItems: ItemData[];
  };
  craftSystem: {
    recipes: CraftRecipe[];
    variants: CraftRecipeVariant[];
    nextRecipeId: number;
    nextVariantId: number;
  };
  // Новая система смешивания
  mixingSystem: {
    recipes: MixingRecipe[];
    spoiledFood: SpoiledFood[];
    nextRecipeId: number;
  };
  // Новая система магазинов
  shopSystem?: {
    currencies: Currency[];
    traders: Trader[];
    shops: Shop[];
    nextTraderIdCounter: number;
    nextShopIdCounter: number;
  };
}

interface AppStateContextType {
  state: AppState;
  updateState: (path: string, value: any) => void;
  setFullState: (newState: AppState) => void;
}

// Дефолтные валюты для системы магазинов
const defaultCurrencies: Currency[] = [
  {
    id: 'Soft_currency',
    name: 'Луны',
    description: 'Основная игровая валюта',
    color: '#FFD700',
    exchangeRate: 1,
    isDefault: true
  },
  {
    id: 'Medium_currency',
    name: 'Солы',
    description: 'Переходящая валюта',
    color: '#00BFFF',
    exchangeRate: 0.1, // 10 Солов = 100 Лунов
    isDefault: false
  },
  {
    id: 'Hard_currency',
    name: 'Алетит',
    description: 'Премиальная валюта',
    color: '#9932CC',
    exchangeRate: 0.01, // 10 Алетит = 100 Солов = 1000 Лунов
    isDefault: false
  }
];

// Дефолтная конфигурация баланса
const defaultBalanceConfig: BalanceConfig = {
  id: 'default',
  name: 'Default Configuration',
  baseValue: 100,
  weights: {
    categoryWeight: 0.35,
    tierWeight: 0.25,
    mechanicWeight: 0.15,
    modifiersWeight: 0.1,
    locationsWeight: 0.05,
    frequencyWeight: 0.05,
    craftComplexityWeight: 0.05
  },
  categories: {
    'Еда': 1.2,
    'Напитки': 1.0,
    'Урожай': 0.7,
    'Материал': 0.6,
    'Инструменты': 1,
    'Мусор': 0.1,
    'Болты': 0.7,
    'Дерево': 0.4,
    'Грибы': 0.4,
    'Балка': 0.5,
    'Веревки': 0.4,
    'Гвозди': 0.6,
    'Детали': 0.9,
    'Корм для животных': 1,
    'Металл': 0.7,
    'Приманка': 0.5,
    'Насекомые': 0.2,
    'Плоды': 0.9,
    'Ингредиент': 0.5,
    'Подарок': 1.3,
    'Провод': 0.6,
    'Ресурсы': 0.3,
    'Руды': 0.4,
    'Минералы': 0.5,
    'Рыба': 1.3,
    'Трава': 0.2,
    'Семена': 0.2,
    'Слиток': 1.1,
    'Сетка': 0.9,
    'Стекло': 0.6,
    'Ткань': 1.2,
    'Удобрения': 0.7,
    'Цветы': 0.3,
    'Топливо': 0.8,  // Добавляем категорию для топлива
  },
  mechanics: {
    'Найти в мире': 0.7,
    'Можно купить': 0.8,
    'Секретный': 1.2,
    'Специальный': 1.5,
    'Квестовая награда': 1.0,
    'Крафтовое': 1.1
  },
  tierMultiplier: 0.15,
  modifiers: {
    'Ивентовое': 1.5,
    'Сезонное': 1.3,
    'В ограниченное время': 1.2,
    'Проклято': 0.8,
    'Сломано': 0.2,
    'Стартовый предмет': 0.1
  },
  subTypeModifiers: {
    'Медный': 1.1,
    'Железный': 1.2,
    'Бронзовый': 1.15,
    'Стальной': 1.25,
    'Титановый': 1.4,
    'Золотой': 1.5,
    'Серебряный': 1.3,
    'Деревянный': 0.9,
    'Дубовый': 1.0,
    'Сосновый': 0.85,
    'Березовый': 0.8,
    'Кукурузный': 1.05,
    'Пшеничный': 0.95,
    'Льняной': 1.1,
    'Каменный': 0.9,
    'Стеклянный': 1.2,
    'Кожаный': 1.15,
    'Тканевый': 1.1,
    'Мясной': 1.3,
    'Рыбный': 1.2,
    'Грибной': 1.05,
    'Ягодный': 1.1,
    'Овощной': 0.9,
    'Фруктовый': 1.0
  },
  locations: {
    'Поместье': 1.2,
    'Лес': 1.4,
    'Город': 0.2,
    'Горы': 1.3
  },
  sellDiscount: 0.35,
  buyMarkup: 0.25,
  frequencyTypes: {
    'Часто встречаемый': 1.0,
    'Редко встречаемый': 1.8,
    'Единичный ресурс': 3.0
  },
  craftComplexityTypes: {
    'Не крафтиться': 1,
    'Очень легко': 1.1,
    'Легко': 1.45,
    'Средне': 1.8,
    'Сложно': 2.1, 
    'Очень сложно': 2.6
  },
  craftBaseMultiplier: 1.2,     // Базовый множитель прибыли (добавляет 20% к стоимости)
  craftComplexityMultiplier: 0.1, // Дополнительный множитель за сложность
  currentSeason: 'Весна', // Добавить текущий сезон
  seasons: ['Весна', 'Лето', 'Осень', 'Зима'], // Добавить сезоны
  seasonalCategoryModifiers: {}, // Добавить пустой объект
  seasonalSubTypeModifiers: {}, // Добавить пустой объект
  growthDayMultiplier: 5.0, // Добавить множитель дня роста
  craftTimeConfig: {
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
    categoryTimeMultipliers: {},
    version: Date.now()
  },
  version: '1.0',
  createdAt: new Date().toISOString()
};

const defaultState: AppState = {
  units: {
    units: [],
    items: [],
    abilities: [],
    nextImageId: 1,
    imageMap: new Map(),
    sorting: 'name-asc',
    elementFilter: 'all',
    itemSorting: 'name-asc',
    abilitySorting: 'name-asc',
    rarities: [
      { id: 'common', name: 'Common', value: 0 },
      { id: 'uncommon', name: 'Uncommon', value: 1 },
      { id: 'rare', name: 'Rare', value: 2 },
      { id: 'exotic', name: 'Exotic', value: 3 },
      { id: 'epic', name: 'Epic', value: 4 },
      { id: 'mythical', name: 'Mythical', value: 5 },
      { id: 'legendary', name: 'Legendary', value: 6 },
      { id: 'relic', name: 'Relic', value: 7 },
      { id: 'immortal', name: 'Immortal', value: 8 },
      { id: 'ancient', name: 'Ancient', value: 9 }
    ],
    currentUnitAbilities: [],
    currentUnitGearRequirements: new Map(),
  },
  resources: {
    items: [],
    categories: [
      { id: 'materials', name: 'Materials', color: '#5D5CDE', description: 'Basic crafting materials' }
    ],
    imageMap: new Map(),
    nextImageId: 1
  },
  recipes: {
    recipes: [],
    nextId: 1
  },
  balance: {
    currentConfig: defaultBalanceConfig,
    savedConfigs: [defaultBalanceConfig],
    comparisonItems: []
  },
  craftSystem: {
    recipes: [],
    variants: [],
    nextRecipeId: 1,
    nextVariantId: 1
  },
  // Добавляем инициализацию для mixingSystem
  mixingSystem: {
    recipes: [],
    spoiledFood: [
      { type: 'meat', name: 'Испорченное мясное блюдо', imageId: '', description: 'Испортившееся мясное блюдо' },
      { type: 'fish', name: 'Испорченное рыбное блюдо', imageId: '', description: 'Испортившееся рыбное блюдо' },
      { type: 'general', name: 'Испорченное блюдо', imageId: '', description: 'Испортившаяся еда' }
    ],
    nextRecipeId: 1
  },
  // Добавляем инициализацию для shopSystem
  shopSystem: {
    currencies: defaultCurrencies,
    traders: [],
    shops: [],
    nextTraderIdCounter: 1,
    nextShopIdCounter: 1
  }
};

const AppStateContext = createContext<AppStateContextType | undefined>(undefined);

// Функция для подготовки состояния к экспорту
export function prepareStateForExport(state: AppState): any {
  // Создаем глубокую копию состояния
  const exportState = JSON.parse(JSON.stringify(state));
  
  // Преобразуем Map объекты в обычные объекты для JSON
  exportState.units.imageMap = Object.fromEntries(
    state.units.imageMap instanceof Map ? state.units.imageMap.entries() : []
  );
  
  exportState.units.currentUnitGearRequirements = Object.fromEntries(
    state.units.currentUnitGearRequirements instanceof Map ? 
      state.units.currentUnitGearRequirements.entries() : []
  );
  
  exportState.resources.imageMap = Object.fromEntries(
    state.resources.imageMap instanceof Map ? state.resources.imageMap.entries() : []
  );
  
  console.log("Состояние подготовлено для экспорта:", exportState);
  return exportState;
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(defaultState);

  // Функция для безопасного обновления состояния
  const updateState = (path: string, value: any) => {
    console.log(`Updating state path: ${path}`, value);
    
    // Специальная обработка для balance и ее свойств
    if (path === 'balance') {
      // Если обновляется весь объект balance, сохраняем ID currentConfig
      if (value && value.currentConfig && value.currentConfig.id && value.currentConfig.id !== 'default') {
        console.log(`Обновление всего объекта balance с currentConfig.id=${value.currentConfig.id}`);
        
        // Сохраняем глобально
        lastBalanceConfig = JSON.parse(JSON.stringify(value.currentConfig));
        
        setState(prev => ({
          ...prev,
          balance: value
        }));
        return;
      }
    }
    
    // Специальная обработка для balance.currentConfig
    if (path === 'balance.currentConfig') {
      // Проверяем, что ID не равен 'default'
      if (value && value.id && value.id !== 'default') {
        console.log(`Обновление balance.currentConfig с id=${value.id}`);
        
        // Создаем глубокую копию для избежания мутаций
        const safeValue = JSON.parse(JSON.stringify(value));
        
        // Сохраняем в глобальной переменной
        lastBalanceConfig = safeValue;
        
        setState(prev => {
          const newState = { 
            ...prev,
            balance: {
              ...prev.balance,
              currentConfig: safeValue
            }
          };
          
          setTimeout(() => {
            console.log("После обновления, currentConfig.id =", newState.balance.currentConfig.id);
          }, 0);
          
          return newState;
        });
        
        return;
      }
    }
    
    setState(prev => {
      // Для обновления корневого пути используем простое слияние
      if (!path.includes('.')) {
        console.log(`Updating root property: ${path}`);
        return { ...prev, [path]: value };
      }
      
      // Для вложенных путей - создаем новый объект с сохранением структуры
      const parts = path.split('.');
      const newState = { ...prev };
      let current: any = newState;
      
      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        if (!current[key]) current[key] = {};
        current[key] = { ...current[key] };
        current = current[key];
      }
      
      current[parts[parts.length - 1]] = value;
      
      // Проверяем, не произошел ли случайный сброс ID конфигурации
      if (parts[0] === 'balance' && parts[1] === 'currentConfig' && 
          newState.balance.currentConfig.id === 'default' && 
          lastBalanceConfig && lastBalanceConfig.id !== 'default') {
        console.log("ВНИМАНИЕ: ID конфигурации был сброшен к 'default', восстанавливаем из резервной копии");
        newState.balance.currentConfig.id = lastBalanceConfig.id;
      }
      
      return newState;
    });
  };

  // Функция миграции данных из старой структуры в новую
  function migrateImportedData(oldData: any): AppState {
    console.log("Начинаем миграцию импортированных данных...");
    
    // ВАЖНО: Сохраняем Map-объекты с изображениями перед миграцией
    const originalUnitsImageMap = oldData.units?.imageMap instanceof Map 
      ? oldData.units.imageMap 
      : (importedImages.units || new Map());
    
    const originalResourcesImageMap = oldData.resources?.imageMap instanceof Map 
      ? oldData.resources.imageMap 
      : (importedImages.resources || new Map());
    
    console.log(`Сохранили оригинальные Map изображений перед миграцией: units=${originalUnitsImageMap.size}, resources=${originalResourcesImageMap.size}`);
    
    // Создаем новое состояние на основе дефолтных значений
    const newState: AppState = JSON.parse(JSON.stringify(defaultState));
    
    try {
      // 1. Копируем базовые части, которые вряд ли изменились между версиями
      if (oldData.units) {
        newState.units.units = oldData.units.units || [];
        newState.units.items = oldData.units.items || [];
        newState.units.abilities = oldData.units.abilities || [];
        newState.units.nextImageId = oldData.units.nextImageId || 1;
        newState.units.sorting = oldData.units.sorting || 'name-asc';
        newState.units.elementFilter = oldData.units.elementFilter || 'all';
        newState.units.itemSorting = oldData.units.itemSorting || 'name-asc';
        newState.units.abilitySorting = oldData.units.abilitySorting || 'name-asc';
        newState.units.rarities = oldData.units.rarities || newState.units.rarities;
        newState.units.currentUnitAbilities = oldData.units.currentUnitAbilities || [];
      }
      
      // 2. Мигрируем ресурсы
      if (oldData.resources) {
        newState.resources.items = oldData.resources.items || [];
        newState.resources.categories = oldData.resources.categories || newState.resources.categories;
        newState.resources.nextImageId = oldData.resources.nextImageId || 1;
      }
      
      // 3. Мигрируем данные рецептов
      if (oldData.recipes) {
        newState.recipes.recipes = oldData.recipes.recipes || [];
        newState.recipes.nextId = oldData.recipes.nextId || 1;
      }
      
      // 4. Мигрируем данные баланса
      if (oldData.balance) {
        // Базовая конфигурация
        if (oldData.balance.currentConfig) {
          newState.balance.currentConfig = {
            ...defaultBalanceConfig, // Используем дефолтную как основу
            ...oldData.balance.currentConfig // Добавляем существующие значения
          };
        }
        
        // Сохраненные конфигурации
        if (oldData.balance.savedConfigs && Array.isArray(oldData.balance.savedConfigs)) {
          newState.balance.savedConfigs = oldData.balance.savedConfigs.map((config: any) => ({
            ...defaultBalanceConfig,
            ...config
          }));
        }
        
        // Предметы для сравнения
        if (oldData.balance.comparisonItems && Array.isArray(oldData.balance.comparisonItems)) {
          newState.balance.comparisonItems = oldData.balance.comparisonItems;
        }
      }
      
      // 5. Мигрируем систему крафта - самая важная часть с изменениями структуры
      if (oldData.craftSystem) {
        console.log("Миграция данных Crafting System:", oldData.craftSystem);
        
        // Создаем полную копию структуры craftSystem
        newState.craftSystem = {
          ...newState.craftSystem, // используем дефолтные значения как основу
          ...oldData.craftSystem,  // копируем все свойства из старого состояния
          recipes: [],             // очистим рецепты, затем заполним их правильно
          variants: []             // очистим варианты, затем заполним их правильно
        };
        
        // Базовые счетчики
        newState.craftSystem.nextRecipeId = oldData.craftSystem.nextRecipeId || 1;
        newState.craftSystem.nextVariantId = oldData.craftSystem.nextVariantId || 1;
        
        // Рецепты - наиболее критичная часть
        if (oldData.craftSystem.recipes && Array.isArray(oldData.craftSystem.recipes)) {
          console.log(`Импортирую ${oldData.craftSystem.recipes.length} рецептов`);
          
          newState.craftSystem.recipes = oldData.craftSystem.recipes.map((recipe: any) => {
            try {
              // Если структура уже новая - создаем глубокую копию
              if (recipe.resultItemName !== undefined) {
                const newRecipe = JSON.parse(JSON.stringify(recipe));
                console.log(`Импортирован рецепт: ${newRecipe.name} (${newRecipe.id})`);
                return newRecipe;
              }
              
              // Иначе - преобразуем старую структуру в новую
              const newRecipe: CraftRecipe = {
                id: recipe.id || `recipe-${newState.craftSystem.nextRecipeId++}`,
                name: recipe.name || "Unknown Recipe",
                resultItemName: "",
                resultAmount: recipe.resultAmount || 1,
                category: recipe.category || "",
                level: recipe.level || 1,
                imageId: recipe.imageId || null,
                variants: []
              };
              
              // Преобразование ID в имя (если в старой версии был ID вместо имени)
              if (recipe.resultItemId) {
                // Ищем соответствующий предмет в ресурсах
                const item = oldData.resources?.items?.find((r: any) => r.id === recipe.resultItemId);
                if (item) {
                  newRecipe.resultItemName = item.name;
                  console.log(`Преобразовано: resultItemId=${recipe.resultItemId} -> resultItemName=${newRecipe.resultItemName}`);
                } else {
                  // Или ищем в предметах баланса
                  const balanceItem = oldData.balance?.comparisonItems?.find((i: any) => i.id === recipe.resultItemId);
                  if (balanceItem) {
                    newRecipe.resultItemName = balanceItem.name;
                    console.log(`Преобразовано из баланса: resultItemId=${recipe.resultItemId} -> resultItemName=${newRecipe.resultItemName}`);
                  } else {
                    // Если не нашли - используем ID как имя
                    newRecipe.resultItemName = recipe.resultItemId;
                    console.log(`Не найден предмет с ID=${recipe.resultItemId}, используем как имя`);
                  }
                }
              }
              
              // Преобразование вариантов
              if (recipe.variants && Array.isArray(recipe.variants)) {
                newRecipe.variants = recipe.variants.map((variant: any) => {
                  const newVariant: CraftRecipeVariant = {
                    id: variant.id || `variant-${newState.craftSystem.nextVariantId++}`,
                    name: variant.name || "Standard",
                    ingredients: [],
                    // Мигрируем fuelItems, если они есть
                    fuelItems: variant.fuelItems ? variant.fuelItems.map((fuel: any) => ({
                      itemName: fuel.itemName,
                      amount: fuel.amount || 1
                    })) : []
                  };
                  
                  // Преобразование ингредиентов
                  if (variant.ingredients && Array.isArray(variant.ingredients)) {
                    newVariant.ingredients = variant.ingredients.map((ingredient: any) => {
                      const newIngredient: CraftIngredient = {
                        itemName: "",
                        amount: ingredient.amount || 1
                      };
                      
                      // Преобразование ID в имя
                      if (ingredient.itemId) {
                        // Ищем в ресурсах
                        const item = oldData.resources?.items?.find((r: any) => r.id === ingredient.itemId);
                        if (item) {
                          newIngredient.itemName = item.name;
                        } else {
                          // Или в предметах баланса
                          const balanceItem = oldData.balance?.comparisonItems?.find((i: any) => i.id === ingredient.itemId);
                          if (balanceItem) {
                            newIngredient.itemName = balanceItem.name;
                          } else {
                            // Если не нашли - используем ID как имя
                            newIngredient.itemName = ingredient.itemId;
                          }
                        }
                      } else if (ingredient.itemName) {
                        newIngredient.itemName = ingredient.itemName;
                      }
                      
                      return newIngredient;
                    });
                  }
                  
                  return newVariant;
                });
              } else {
                // Если вариантов нет - создаем стандартный
                newRecipe.variants = [{
                  id: `variant-${newState.craftSystem.nextVariantId++}`,
                  name: "Standard",
                  ingredients: [],
                  fuelItems: [] // Добавляем пустой массив для топлива
                }];
              }
              
              // Мигрируем requiresFuel, если оно есть
              if (recipe.requiresFuel !== undefined) {
                newRecipe.requiresFuel = recipe.requiresFuel;
              }
              
              console.log(`Преобразован рецепт: ${newRecipe.name} (${newRecipe.id})`);
              return newRecipe;
            } catch (error) {
              console.error("Ошибка при миграции рецепта:", error);
              // В случае ошибки - возвращаем пустой рецепт
              return {
                id: `recipe-${newState.craftSystem.nextRecipeId++}`,
                name: "Error Recipe",
                resultItemName: "Unknown",
                resultAmount: 1,
                category: "",
                level: 1,
                imageId: null,
                variants: [{
                  id: `variant-${newState.craftSystem.nextVariantId++}`,
                  name: "Standard",
                  ingredients: [],
                  fuelItems: [] // Добавляем пустой массив для топлива
                }]
              };
            }
          });
          
          console.log(`Миграция рецептов завершена, импортировано ${newState.craftSystem.recipes.length} рецептов`);
        }
        
        // Проверяем, что счетчики nextRecipeId и nextVariantId корректны
        const maxRecipeId = Math.max(
          0,
          ...newState.craftSystem.recipes.map(r => {
            const idNumber = parseInt(r.id.replace('recipe-', ''), 10);
            return isNaN(idNumber) ? 0 : idNumber;
          })
        );
        
        const maxVariantId = Math.max(
          0,
          ...newState.craftSystem.recipes.flatMap(r => 
            r.variants.map(v => {
              const idNumber = parseInt(v.id.replace('variant-', ''), 10);
              return isNaN(idNumber) ? 0 : idNumber;
            })
          )
        );
        
        // Корректируем счетчики, если нужно
        if (maxRecipeId >= newState.craftSystem.nextRecipeId) {
          newState.craftSystem.nextRecipeId = maxRecipeId + 1;
          console.log(`Скорректирован nextRecipeId: ${newState.craftSystem.nextRecipeId}`);
        }
        
        if (maxVariantId >= newState.craftSystem.nextVariantId) {
          newState.craftSystem.nextVariantId = maxVariantId + 1;
          console.log(`Скорректирован nextVariantId: ${newState.craftSystem.nextVariantId}`);
        }
      }
      
      // 6. Мигрируем систему смешивания (Mixing System)
      if (oldData.mixingSystem) {
        console.log("Миграция данных Mixing System:", oldData.mixingSystem);
        
        // Копируем существующие данные, если они есть
        newState.mixingSystem = {
          recipes: oldData.mixingSystem.recipes || [],
          spoiledFood: oldData.mixingSystem.spoiledFood || newState.mixingSystem.spoiledFood,
          nextRecipeId: oldData.mixingSystem.nextRecipeId || 1
        };
        
        // Проверяем счетчик nextRecipeId
        const maxMixingRecipeId = Math.max(
          0,
          ...newState.mixingSystem.recipes.map(r => {
            const idNumber = parseInt(r.id.replace('mixing-', ''), 10);
            return isNaN(idNumber) ? 0 : idNumber;
          })
        );
        
        // Корректируем счетчик, если нужно
        if (maxMixingRecipeId >= newState.mixingSystem.nextRecipeId) {
          newState.mixingSystem.nextRecipeId = maxMixingRecipeId + 1;
          console.log(`Скорректирован mixingSystem.nextRecipeId: ${newState.mixingSystem.nextRecipeId}`);
        }
      } else {
        // Если нет никаких данных о mixingSystem, оставляем дефолтную инициализацию
        console.log("Данные Mixing System отсутствуют, используются значения по умолчанию");
      }
      
      // 7. Мигрируем систему магазинов (ShopSystem)
      if (oldData.shopSystem) {
        console.log("Миграция данных Shop System:", oldData.shopSystem);
        
        // Копируем существующие данные, если они есть
        newState.shopSystem = {
          currencies: oldData.shopSystem.currencies || defaultCurrencies,
          traders: oldData.shopSystem.traders || [],
          shops: oldData.shopSystem.shops || [],
          nextTraderIdCounter: oldData.shopSystem.nextTraderIdCounter || 1,
          nextShopIdCounter: oldData.shopSystem.nextShopIdCounter || 1
        };
      } else {
        // Если нет никаких данных о shopSystem, оставляем дефолтную инициализацию
        console.log("Данные Shop System отсутствуют, используются значения по умолчанию");
      }
      
      // ВАЖНО: Восстанавливаем изображения после миграции
      newState.units.imageMap = originalUnitsImageMap;
      newState.resources.imageMap = originalResourcesImageMap;
      console.log(`Восстановлены Map изображений: units=${newState.units.imageMap.size}, resources=${newState.resources.imageMap.size}`);
      
      console.log("Миграция данных успешно завершена");
      return newState;
    } catch (error) {
      console.error("Ошибка при миграции данных:", error);
      
      // Даже в случае ошибки восстанавливаем изображения
      const errorState = JSON.parse(JSON.stringify(defaultState));
      errorState.units.imageMap = originalUnitsImageMap;
      errorState.resources.imageMap = originalResourcesImageMap;
      
      return errorState;
    }
  }
  
  // Функция для полного обновления состояния
  const setFullState = async (newState: AppState) => {
    console.log("Setting full application state");
    console.log("Входные данные для импорта:", {
      hasCraftSystem: !!newState.craftSystem,
      craftRecipesCount: newState.craftSystem?.recipes?.length || 0,
      hasMixingSystem: !!newState.mixingSystem,
      mixingRecipesCount: newState.mixingSystem?.recipes?.length || 0,
      hasShopSystem: !!newState.shopSystem,
      shopsCount: newState.shopSystem?.shops?.length || 0
    });
    
    try {
      // Сохраняем оригинальные Map с изображениями в глобальной переменной
      if (newState.units.imageMap instanceof Map && newState.units.imageMap.size > 0) {
        importedImages.units = newState.units.imageMap;
        console.log(`Сохранили ${newState.units.imageMap.size} изображений units в глобальной переменной`);
      }
      
      if (newState.resources.imageMap instanceof Map && newState.resources.imageMap.size > 0) {
        importedImages.resources = newState.resources.imageMap;
        console.log(`Сохранили ${newState.resources.imageMap.size} изображений resources в глобальной переменной`);
      }
      
      // Проверка наличия craftSystem в импортируемых данных
      if (!newState.craftSystem || !Array.isArray(newState.craftSystem.recipes)) {
        console.warn("ВНИМАНИЕ: В импортируемых данных отсутствует craftSystem или рецепты");
        
        // Создаем пустой craftSystem, если он отсутствует
        newState.craftSystem = {
          recipes: [],
          variants: [],
          nextRecipeId: 1,
          nextVariantId: 1
        };
      }
      
      // Проверка наличия mixingSystem в импортируемых данных
      if (!newState.mixingSystem) {
        console.warn("ВНИМАНИЕ: В импортируемых данных отсутствует mixingSystem");
        
        // Создаем пустой mixingSystem, если он отсутствует
        newState.mixingSystem = {
          recipes: [],
          spoiledFood: defaultState.mixingSystem.spoiledFood,
          nextRecipeId: 1
        };
      }
      
      // Проверка наличия shopSystem в импортируемых данных
      if (!newState.shopSystem) {
        console.warn("ВНИМАНИЕ: В импортируемых данных отсутствует shopSystem");
        
        // Создаем пустой shopSystem, если он отсутствует
        newState.shopSystem = {
          currencies: defaultCurrencies,
          traders: [],
          shops: [],
          nextTraderIdCounter: 1,
          nextShopIdCounter: 1
        };
      }
      
      // Проверяем и мигрируем структуру данных
      const migratedState = migrateImportedData(newState);
      console.log("Данные после миграции:", {
        hasCraftSystem: !!migratedState.craftSystem,
        craftRecipesCount: migratedState.craftSystem?.recipes?.length || 0,
        hasMixingSystem: !!migratedState.mixingSystem,
        mixingRecipesCount: migratedState.mixingSystem?.recipes?.length || 0,
        hasShopSystem: !!migratedState.shopSystem,
        shopsCount: migratedState.shopSystem?.shops?.length || 0
      });
      
      // Проверяем, что craftSystem был правильно мигрирован
      if (!migratedState.craftSystem || !Array.isArray(migratedState.craftSystem.recipes)) {
        console.error("ОШИБКА: После миграции craftSystem или рецепты отсутствуют");
        
        // Принудительно воссоздаем craftSystem
        migratedState.craftSystem = {
          recipes: migratedState.craftSystem?.recipes || [],
          variants: migratedState.craftSystem?.variants || [],
          nextRecipeId: migratedState.craftSystem?.nextRecipeId || 1,
          nextVariantId: migratedState.craftSystem?.nextVariantId || 1
        };
      }
      
      // Проверяем, что mixingSystem был правильно мигрирован
      if (!migratedState.mixingSystem) {
        console.error("ОШИБКА: После миграции mixingSystem отсутствует");
        
        // Принудительно воссоздаем mixingSystem
        migratedState.mixingSystem = {
          recipes: [],
          spoiledFood: defaultState.mixingSystem.spoiledFood,
          nextRecipeId: 1
        };
      }
      
      // Проверяем, что shopSystem был правильно мигрирован
      if (!migratedState.shopSystem) {
        console.error("ОШИБКА: После миграции shopSystem отсутствует");
        
        // Принудительно воссоздаем shopSystem
        migratedState.shopSystem = {
          currencies: defaultCurrencies,
          traders: [],
          shops: [],
          nextTraderIdCounter: 1,
          nextShopIdCounter: 1
        };
      }
      
      // Обработка Map объектов после миграции - проверяем, что они уже являются Map
      const processedState: AppState = {
        ...migratedState,
        units: {
          ...migratedState.units,
          imageMap: migratedState.units.imageMap instanceof Map 
            ? migratedState.units.imageMap 
            : new Map(Object.entries(migratedState.units.imageMap || {})),
          currentUnitGearRequirements: migratedState.units.currentUnitGearRequirements instanceof Map
            ? migratedState.units.currentUnitGearRequirements
            : new Map()
        },
        resources: {
          ...migratedState.resources,
          imageMap: migratedState.resources.imageMap instanceof Map 
            ? migratedState.resources.imageMap 
            : new Map(Object.entries(migratedState.resources.imageMap || {}))
        },
        balance: migratedState.balance || defaultState.balance,
        craftSystem: migratedState.craftSystem || defaultState.craftSystem,
        mixingSystem: migratedState.mixingSystem || defaultState.mixingSystem,
        shopSystem: migratedState.shopSystem || defaultState.shopSystem
      };

      console.log("DEBUG - ImageMap после преобразования:", {
        unitsImageMapSize: processedState.units.imageMap.size,
        resourcesImageMapSize: processedState.resources.imageMap.size
      });
      
      // Вывод всех ключей в Map
      console.log("DEBUG - Ключи в units.imageMap:", Array.from(processedState.units.imageMap.keys()));
      console.log("DEBUG - Ключи в resources.imageMap:", Array.from(processedState.resources.imageMap.keys()));
      
      // Если есть balance.comparisonItems, проверим их
      if (processedState.balance && processedState.balance.comparisonItems) {
        const itemsWithImages = processedState.balance.comparisonItems.filter(item => item.imageId);
        console.log(`DEBUG - В comparisonItems найдено ${itemsWithImages.length} элементов с imageId`);
        
        itemsWithImages.forEach(item => {
          const { name, imageId } = item;
          const imageExistsInUnits = imageId && processedState.units.imageMap.has(imageId);
          const imageExistsInResources = imageId && processedState.resources.imageMap.has(imageId);
          
          console.log(`DEBUG - Элемент "${name}" имеет imageId="${imageId}" который ${imageExistsInUnits || imageExistsInResources ? 'существует' : 'НЕ существует'} в imageMap`);
        });
      }
      
      // Убедимся, что craftSystem правильно импортирован - создаем глубокую копию
      if (processedState.craftSystem) {
        // Если рецепты есть, создаем их глубокую копию
        if (Array.isArray(processedState.craftSystem.recipes)) {
          processedState.craftSystem.recipes = JSON.parse(JSON.stringify(processedState.craftSystem.recipes));
        } else {
          // Если рецептов нет, создаем пустой массив
          processedState.craftSystem.recipes = [];
        }
        
        // То же самое для вариантов
        if (Array.isArray(processedState.craftSystem.variants)) {
          processedState.craftSystem.variants = JSON.parse(JSON.stringify(processedState.craftSystem.variants));
        } else {
          processedState.craftSystem.variants = [];
        }
        
        // Проверяем nextRecipeId и nextVariantId
        if (!processedState.craftSystem.nextRecipeId) {
          processedState.craftSystem.nextRecipeId = 1;
        }
        
        if (!processedState.craftSystem.nextVariantId) {
          processedState.craftSystem.nextVariantId = 1;
        }
      }
      
      // Убедимся, что mixingSystem правильно импортирован
      if (processedState.mixingSystem) {
        // Если рецепты есть, создаем их глубокую копию
        if (Array.isArray(processedState.mixingSystem.recipes)) {
          processedState.mixingSystem.recipes = JSON.parse(JSON.stringify(processedState.mixingSystem.recipes));
        } else {
          // Если рецептов нет, создаем пустой массив
          processedState.mixingSystem.recipes = [];
        }
        
        // Проверяем spoiledFood и nextRecipeId
        if (!Array.isArray(processedState.mixingSystem.spoiledFood)) {
          processedState.mixingSystem.spoiledFood = defaultState.mixingSystem.spoiledFood;
        }
        
        if (!processedState.mixingSystem.nextRecipeId) {
          processedState.mixingSystem.nextRecipeId = 1;
        }
      }
      
      // Убедимся, что shopSystem правильно импортирован
      if (processedState.shopSystem) {
        // Если валюты есть, создаем их глубокую копию
        if (Array.isArray(processedState.shopSystem.currencies)) {
          processedState.shopSystem.currencies = JSON.parse(JSON.stringify(processedState.shopSystem.currencies));
        } else {
          // Если валют нет, используем дефолтные
          processedState.shopSystem.currencies = defaultCurrencies;
        }
        
        // Если торговцы есть, создаем их глубокую копию
        if (Array.isArray(processedState.shopSystem.traders)) {
          processedState.shopSystem.traders = JSON.parse(JSON.stringify(processedState.shopSystem.traders));
        } else {
          // Если торговцев нет, создаем пустой массив
          processedState.shopSystem.traders = [];
        }
        
        // Если магазины есть, создаем их глубокую копию
        if (Array.isArray(processedState.shopSystem.shops)) {
          processedState.shopSystem.shops = JSON.parse(JSON.stringify(processedState.shopSystem.shops));
        } else {
          // Если магазинов нет, создаем пустой массив
          processedState.shopSystem.shops = [];
        }
        
        // Проверяем счетчики
        if (!processedState.shopSystem.nextTraderIdCounter) {
          processedState.shopSystem.nextTraderIdCounter = 1;
        }
        
        if (!processedState.shopSystem.nextShopIdCounter) {
          processedState.shopSystem.nextShopIdCounter = 1;
        }
      }
      
      console.log("Финальная проверка перед обновлением:", {
        craftSystem: {
          recipesCount: processedState.craftSystem.recipes.length,
          nextRecipeId: processedState.craftSystem.nextRecipeId,
          nextVariantId: processedState.craftSystem.nextVariantId
        },
        mixingSystem: {
          recipesCount: processedState.mixingSystem.recipes.length,
          spoiledFoodCount: processedState.mixingSystem.spoiledFood.length,
          nextRecipeId: processedState.mixingSystem.nextRecipeId
        },
        shopSystem: {
          currenciesCount: processedState.shopSystem?.currencies.length || 0,
          tradersCount: processedState.shopSystem?.traders.length || 0,
          shopsCount: processedState.shopSystem?.shops.length || 0
        }
      });
      
      // ЭКСТРЕННОЕ исправление для изображений - дополнительный хак
      if (processedState.units.imageMap.size === 0 && importedImages.units && importedImages.units.size > 0) {
        console.log(`ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ: восстанавливаем ${importedImages.units.size} изображений из глобальной переменной`);
        processedState.units.imageMap = importedImages.units;
      }
      
      if (processedState.resources.imageMap.size === 0 && importedImages.resources && importedImages.resources.size > 0) {
        console.log(`ЭКСТРЕННОЕ ВОССТАНОВЛЕНИЕ: восстанавливаем ${importedImages.resources.size} изображений из глобальной переменной`);
        processedState.resources.imageMap = importedImages.resources;
      }
      
      // Обновляем состояние
      setState(processedState);
      console.log("Full state update completed");
      
      // Очищаем временное хранилище после успешного обновления
      setTimeout(() => {
        importedImages = {};
        console.log("Очищено временное хранилище изображений");
      }, 5000);
      
      // Возвращаем промис для возможности ожидания завершения
      return Promise.resolve();
    } catch (error) {
      console.error("Ошибка при импорте данных:", error);
      // В случае ошибки - восстанавливаем стандартное состояние
      setState(defaultState);
      alert("Произошла ошибка при импорте данных. Используются настройки по умолчанию.");
      
      // Возвращаем отклоненный промис для обработки ошибки
      return Promise.reject(error);
    }
  };

  return (
    <AppStateContext.Provider value={{ state, updateState, setFullState }}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);
  if (context === undefined) {
    throw new Error('useAppState must be used within an AppStateProvider');
  }
  return context;
}