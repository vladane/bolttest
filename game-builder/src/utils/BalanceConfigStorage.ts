// BalanceConfigStorage.ts - сохраните этот файл в папке utils
import { BalanceConfig } from '../contexts/BalanceContext';

// Префикс для всех ключей в localStorage
const STORAGE_PREFIX = 'game_builder_balance_config_';

// Сохранение конфигурации в localStorage
export function storeConfig(config: BalanceConfig): BalanceConfig {
  // Генерируем временную метку, если это новая конфигурация
  if (config.id === 'default') {
    config = {
      ...config,
      id: `config_${Date.now()}`,
      createdAt: new Date().toISOString()
    };
  }
  
  try {
    localStorage.setItem(`${STORAGE_PREFIX}${config.id}`, JSON.stringify(config));
    console.log(`Сохранена конфигурация: ${config.name} (ID: ${config.id})`);
    
    // Обновляем список всех конфигураций
    const allKeys = getAllConfigKeys();
    if (!allKeys.includes(config.id)) {
      allKeys.push(config.id);
      localStorage.setItem(`${STORAGE_PREFIX}all_keys`, JSON.stringify(allKeys));
    }
  } catch (err) {
    console.error('Ошибка при сохранении конфигурации:', err);
  }
  
  return config;
}

// Получение всех ID сохраненных конфигураций
export function getAllConfigKeys(): string[] {
  try {
    const keys = localStorage.getItem(`${STORAGE_PREFIX}all_keys`);
    return keys ? JSON.parse(keys) : ['default'];
  } catch (err) {
    console.error('Ошибка при получении списка конфигураций:', err);
    return ['default'];
  }
}

// Получение конфигурации по ID
export function getConfig(configId: string): BalanceConfig | null {
  try {
    const data = localStorage.getItem(`${STORAGE_PREFIX}${configId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Ошибка при получении конфигурации ${configId}:`, err);
    return null;
  }
}

// Получение всех сохраненных конфигураций
export function getAllConfigs(): BalanceConfig[] {
  const keys = getAllConfigKeys();
  return keys.map(key => {
    const config = getConfig(key);
    return config || getDefaultConfig();
  }).filter(Boolean) as BalanceConfig[];
}

// Удаление конфигурации
export function deleteConfig(configId: string): void {
  if (configId === 'default') {
    console.error('Невозможно удалить дефолтную конфигурацию');
    return;
  }
  
  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${configId}`);
    
    // Обновляем список всех конфигураций
    const allKeys = getAllConfigKeys().filter(key => key !== configId);
    localStorage.setItem(`${STORAGE_PREFIX}all_keys`, JSON.stringify(allKeys));
    
    console.log(`Удалена конфигурация с ID: ${configId}`);
  } catch (err) {
    console.error(`Ошибка при удалении конфигурации ${configId}:`, err);
  }
}

// Получение дефолтной конфигурации (если что-то пошло не так)
export function getDefaultConfig(): BalanceConfig {
  return {
    id: 'default',
    name: 'Default Configuration',
    baseValue: 100,
    weights: {
      categoryWeight: 0.3,
      tierWeight: 0.25,
      mechanicWeight: 0.2,
      modifiersWeight: 0.1,
      locationsWeight: 0.15,
      frequencyWeight: 0.2,
      craftComplexityWeight: 0.15
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
    },
    mechanics: {
      'Найти в мире': 0.7,
      'Можной купить': 0.8,
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
    locations: {
      'Поместье': 1.2,
      'Лес': 1.4,
      'Город': 0.2,
      'Горы': 1.3
    },
    subTypeModifiers: {}, 
    currentSeason: 'Весна',
    seasons: ['Весна', 'Лето', 'Осень', 'Зима'],
    seasonalCategoryModifiers: {},
    seasonalSubTypeModifiers: {},
    growthDayMultiplier: 5.0,
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
    craftBaseMultiplier: 1.2,
    craftComplexityMultiplier: 0.1,
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
}