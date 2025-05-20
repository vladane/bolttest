import { createContext, useContext, ReactNode, useCallback, useEffect } from 'react';
import { useAppState } from './AppStateContext';
import { ItemData } from './BalanceContext';

// Определение типов данных

// Тип для валюты
export interface Currency {
  id: string;
  name: string;
  description?: string;
  icon?: string | null;
  color?: string;
  exchangeRate?: number; // Курс обмена относительно базовой валюты
  isDefault?: boolean;    // Флаг базовой валюты
}

// Тип для диапазона стоимости
export interface CostRange {
  costType: number; // 0 - фиксированная, 1 - диапазон, 2 - процент от стоимости предмета
  from: number;
  to: number;
}

// Тип для товара в магазине
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

// Тип для магазина
export interface Shop {
  shopId: string;
  name: string;
  description?: string;
  shopItems: ShopItem[];
  restockTime?: number;     // Время пополнения ассортимента (в минутах)
  isRandomStock?: boolean;  // Случайный ассортимент при пополнении
}

// Тип для торговца
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

// Тип для состояния магазинов
interface ShopState {
  currencies: Currency[];
  traders: Trader[];
  shops: Shop[];
  nextTraderIdCounter: number;
  nextShopIdCounter: number;
}

// Тип для контекста
interface ShopContextType {
  // Состояние
  currencies: Currency[];
  traders: Trader[];
  shops: Shop[];
  
  // Методы для валют
  addCurrency: (currency: Currency) => void;
  updateCurrency: (id: string, currency: Partial<Currency>) => void;
  deleteCurrency: (id: string) => void;
  setDefaultCurrency: (id: string) => void;
  getDefaultCurrency: () => Currency | undefined;
  
  // Методы для торговцев
  addTrader: (trader: Trader) => void;
  updateTrader: (id: string, trader: Partial<Trader>) => void;
  deleteTrader: (id: string) => void;
  getTraderByShopId: (shopId: string) => Trader | undefined;
  
  // Методы для магазинов
  addShop: (shop: Shop) => void;
  updateShop: (id: string, shop: Partial<Shop>) => void;
  deleteShop: (id: string) => void;
  getShopById: (id: string) => Shop | undefined;
  
  // Методы для предметов в магазине
  addItemToShop: (shopId: string, item: ShopItem) => void;
  updateShopItem: (shopId: string, itemId: string, item: Partial<ShopItem>) => void;
  removeItemFromShop: (shopId: string, itemId: string) => void;
  
  // Вспомогательные методы
  getItemById: (itemId: string) => ItemData | undefined;
  calculateItemPrice: (item: ItemData, currencyId?: string) => number;
  generateNewTraderId: () => string;
  generateNewShopId: () => string;
  
  // Импорт/экспорт
  importShopData: (data: ShopState) => void;
  exportShopData: () => ShopState;
}

// Создание контекста
const ShopContext = createContext<ShopContextType | null>(null);

// Дефолтные значения
const defaultCurrencies: Currency[] = [
  {
    id: 'Soft_currency',
    name: 'Луны',
    description: 'Основная игровая валюта',
    exchangeRate: 1,
    isDefault: true
  },
  {
    id: 'Medium_currency',
    name: 'Солы',
    description: 'Переходящая валюта',
    exchangeRate: 100,
    isDefault: false
  },
  {
    id: 'Hard_currency',
    name: 'Алетит',
    description: 'Премиум валюта',
    exchangeRate: 20,
    isDefault: false
  }
];

// Provider компонент
export function ShopProvider({ children }: { children: ReactNode }) {
  const { state, updateState } = useAppState();
  
  // Инициализация состояния магазинов в AppState, если его еще нет
  useEffect(() => {
    if (!state.shopSystem) {
      updateState('shopSystem', {
        currencies: defaultCurrencies,
        traders: [],
        shops: [],
        nextTraderIdCounter: 1,
        nextShopIdCounter: 1
      });
    }
  }, [state, updateState]);
  
  // Получаем текущее состояние магазинов
  const shopSystem = state.shopSystem || {
    currencies: defaultCurrencies,
    traders: [],
    shops: [],
    nextTraderIdCounter: 1,
    nextShopIdCounter: 1
  };
  
  const currencies = shopSystem.currencies;
  const traders = shopSystem.traders;
  const shops = shopSystem.shops;
  
  // Генераторы новых ID
  const generateNewTraderId = useCallback(() => {
    const id = `Trader_${shopSystem.nextTraderIdCounter}`;
    updateState('shopSystem.nextTraderIdCounter', shopSystem.nextTraderIdCounter + 1);
    return id;
  }, [shopSystem.nextTraderIdCounter, updateState]);
  
  const generateNewShopId = useCallback(() => {
    const id = `Shop_${shopSystem.nextShopIdCounter}`;
    updateState('shopSystem.nextShopIdCounter', shopSystem.nextShopIdCounter + 1);
    return id;
  }, [shopSystem.nextShopIdCounter, updateState]);
  
  // Методы для валют
  const addCurrency = useCallback((currency: Currency) => {
    const newCurrencies = [...currencies, currency];
    updateState('shopSystem.currencies', newCurrencies);
  }, [currencies, updateState]);
  
  const updateCurrency = useCallback((id: string, currencyUpdate: Partial<Currency>) => {
    const currencyIndex = currencies.findIndex(c => c.id === id);
    if (currencyIndex === -1) return;
    
    const updatedCurrencies = [...currencies];
    updatedCurrencies[currencyIndex] = {
      ...updatedCurrencies[currencyIndex],
      ...currencyUpdate
    };
    
    updateState('shopSystem.currencies', updatedCurrencies);
  }, [currencies, updateState]);
  
  const deleteCurrency = useCallback((id: string) => {
    // Нельзя удалить валюту, если она используется в магазинах
    const isUsed = shops.some(shop => 
      shop.shopItems.some(item => item.overrideCurrencyId === id)
    );
    
    if (isUsed) {
      alert(`Валюта используется в магазинах и не может быть удалена`);
      return;
    }
    
    // Проверяем, является ли валюта дефолтной
    const currency = currencies.find(c => c.id === id);
    if (currency?.isDefault) {
      alert(`Нельзя удалить стандартную валюту`);
      return;
    }
    
    const filteredCurrencies = currencies.filter(c => c.id !== id);
    updateState('shopSystem.currencies', filteredCurrencies);
  }, [currencies, shops, updateState]);
  
  const setDefaultCurrency = useCallback((id: string) => {
    const updatedCurrencies = currencies.map(currency => ({
      ...currency,
      isDefault: currency.id === id
    }));
    
    updateState('shopSystem.currencies', updatedCurrencies);
  }, [currencies, updateState]);
  
  const getDefaultCurrency = useCallback(() => {
    return currencies.find(c => c.isDefault);
  }, [currencies]);
  
  // Методы для торговцев
  const addTrader = useCallback((trader: Trader) => {
    const newTraders = [...traders, trader];
    updateState('shopSystem.traders', newTraders);
  }, [traders, updateState]);
  
  const updateTrader = useCallback((id: string, traderUpdate: Partial<Trader>) => {
    const traderIndex = traders.findIndex(t => t.traderId === id);
    if (traderIndex === -1) return;
    
    const updatedTraders = [...traders];
    updatedTraders[traderIndex] = {
      ...updatedTraders[traderIndex],
      ...traderUpdate
    };
    
    updateState('shopSystem.traders', updatedTraders);
  }, [traders, updateState]);
  
  const deleteTrader = useCallback((id: string) => {
    const filteredTraders = traders.filter(t => t.traderId !== id);
    updateState('shopSystem.traders', filteredTraders);
  }, [traders, updateState]);
  
  const getTraderByShopId = useCallback((shopId: string) => {
    return traders.find(trader => trader.shopId === shopId);
  }, [traders]);
  
  // Методы для магазинов
  const addShop = useCallback((shop: Shop) => {
    const newShops = [...shops, shop];
    updateState('shopSystem.shops', newShops);
  }, [shops, updateState]);
  
  const updateShop = useCallback((id: string, shopUpdate: Partial<Shop>) => {
    const shopIndex = shops.findIndex(s => s.shopId === id);
    if (shopIndex === -1) return;
    
    const updatedShops = [...shops];
    updatedShops[shopIndex] = {
      ...updatedShops[shopIndex],
      ...shopUpdate
    };
    
    updateState('shopSystem.shops', updatedShops);
  }, [shops, updateState]);
  
  const deleteShop = useCallback((id: string) => {
    // Проверяем, есть ли торговцы, использующие этот магазин
    const linkedTrader = traders.find(t => t.shopId === id);
    if (linkedTrader) {
      alert(`Магазин используется торговцем "${linkedTrader.name}" и не может быть удален`);
      return;
    }
    
    const filteredShops = shops.filter(s => s.shopId !== id);
    updateState('shopSystem.shops', filteredShops);
  }, [shops, traders, updateState]);
  
  const getShopById = useCallback((id: string) => {
    return shops.find(shop => shop.shopId === id);
  }, [shops]);
  
  // Методы для предметов в магазине
  const addItemToShop = useCallback((shopId: string, item: ShopItem) => {
    const shopIndex = shops.findIndex(s => s.shopId === shopId);
    if (shopIndex === -1) return;
    
    // Проверяем, не существует ли уже такой предмет в магазине
    const existingItemIndex = shops[shopIndex].shopItems.findIndex(i => i.id === item.id);
    if (existingItemIndex !== -1) {
      alert(`Предмет уже существует в магазине`);
      return;
    }
    
    const updatedShop = {
      ...shops[shopIndex],
      shopItems: [...shops[shopIndex].shopItems, item]
    };
    
    const updatedShops = [...shops];
    updatedShops[shopIndex] = updatedShop;
    
    updateState('shopSystem.shops', updatedShops);
  }, [shops, updateState]);
  
  const updateShopItem = useCallback((shopId: string, itemId: string, itemUpdate: Partial<ShopItem>) => {
    const shopIndex = shops.findIndex(s => s.shopId === shopId);
    if (shopIndex === -1) return;
    
    const itemIndex = shops[shopIndex].shopItems.findIndex(i => i.id === itemId);
    if (itemIndex === -1) return;
    
    const updatedShopItems = [...shops[shopIndex].shopItems];
    updatedShopItems[itemIndex] = {
      ...updatedShopItems[itemIndex],
      ...itemUpdate
    };
    
    const updatedShop = {
      ...shops[shopIndex],
      shopItems: updatedShopItems
    };
    
    const updatedShops = [...shops];
    updatedShops[shopIndex] = updatedShop;
    
    updateState('shopSystem.shops', updatedShops);
  }, [shops, updateState]);
  
  const removeItemFromShop = useCallback((shopId: string, itemId: string) => {
    const shopIndex = shops.findIndex(s => s.shopId === shopId);
    if (shopIndex === -1) return;
    
    const updatedShopItems = shops[shopIndex].shopItems.filter(i => i.id !== itemId);
    
    const updatedShop = {
      ...shops[shopIndex],
      shopItems: updatedShopItems
    };
    
    const updatedShops = [...shops];
    updatedShops[shopIndex] = updatedShop;
    
    updateState('shopSystem.shops', updatedShops);
  }, [shops, updateState]);
  
  // Вспомогательные методы
  const getItemById = useCallback((itemId: string) => {
    // Сначала ищем в Balance.comparisonItems
    const balanceItem = state.balance?.comparisonItems?.find(
      (item: ItemData) => item.name === itemId
    );
    if (balanceItem) return balanceItem;
    
    // Затем ищем в Resources
    const resourceItem = state.resources?.items?.find(
      (item: any) => item.name === itemId || item.id === itemId
    );
    if (resourceItem) {
      // Конвертируем в формат ItemData
      return {
        name: resourceItem.name,
        tier: 1,
        mechanic: 'Найти в мире',
        selectedCategories: [resourceItem.category],
        selectedModifiers: [],
        selectedLocations: [],
        frequencyType: 'Часто встречаемый',
        craftComplexity: 'Не крафтиться',
        imageId: resourceItem.imageId
      };
    }
    
    return undefined;
  }, [state.balance?.comparisonItems, state.resources?.items]);
  
  // Расчет цены предмета
  const calculateItemPrice = useCallback((item: ItemData, currencyId?: string) => {
    const defaultCurrency = getDefaultCurrency();
    if (!defaultCurrency) return 0;
    
    // Получаем цену в базовой валюте
    let basePrice = 0;
    
    // Если у предмета есть craftValue и он является крафтовым, используем его
    if (item.craftValue !== undefined && item.craftValue > 0 && item.hasCraftRecipe === true) {
      basePrice = item.craftValue;
    } else {
      // Иначе считаем базовую стоимость на основе характеристик
      const config = state.balance?.currentConfig;
      if (!config) return 0;
      
      // Базовый расчет стоимости (упрощенная версия)
      basePrice = config.baseValue * (1 + (item.tier - 1) * 0.5);
      
      // Применяем модификатор на основе категорий
      if (item.selectedCategories && item.selectedCategories.length > 0) {
        let categoryModifier = 0;
        item.selectedCategories.forEach(cat => {
          categoryModifier += config.categories[cat] || 1;
        });
        categoryModifier /= item.selectedCategories.length;
        basePrice *= categoryModifier;
      }
      
      // Применяем модификатор подтипа, если есть
      if (item.subType && config.subTypeModifiers && config.subTypeModifiers[item.subType]) {
        basePrice *= config.subTypeModifiers[item.subType];
      }
    }
    
    // Применяем торговую наценку (25% по умолчанию)
    const buyMarkup = state.balance?.currentConfig?.buyMarkup || 0.25;
    basePrice *= (1 + buyMarkup);
    
    // Если указана другая валюта, конвертируем
    if (currencyId && currencyId !== defaultCurrency.id) {
      const targetCurrency = currencies.find(c => c.id === currencyId);
      if (targetCurrency && targetCurrency.exchangeRate) {
        return Math.round(basePrice / targetCurrency.exchangeRate);
      }
    }
    
    return Math.round(basePrice);
  }, [state.balance, currencies, getDefaultCurrency]);
  
  // Импорт/экспорт
  const importShopData = useCallback((data: ShopState) => {
    updateState('shopSystem', data);
  }, [updateState]);
  
  const exportShopData = useCallback(() => {
    return {
      currencies: currencies,
      traders: traders,
      shops: shops,
      nextTraderIdCounter: shopSystem.nextTraderIdCounter,
      nextShopIdCounter: shopSystem.nextShopIdCounter
    };
  }, [currencies, traders, shops, shopSystem.nextTraderIdCounter, shopSystem.nextShopIdCounter]);
  
  // Создаем значение контекста
  const contextValue: ShopContextType = {
    currencies,
    traders,
    shops,
    
    addCurrency,
    updateCurrency,
    deleteCurrency,
    setDefaultCurrency,
    getDefaultCurrency,
    
    addTrader,
    updateTrader,
    deleteTrader,
    getTraderByShopId,
    
    addShop,
    updateShop,
    deleteShop,
    getShopById,
    
    addItemToShop,
    updateShopItem,
    removeItemFromShop,
    
    getItemById,
    calculateItemPrice,
    generateNewTraderId,
    generateNewShopId,
    
    importShopData,
    exportShopData
  };
  
  return (
    <ShopContext.Provider value={contextValue}>
      {children}
    </ShopContext.Provider>
  );
}

// Хук для использования контекста
export function useShop() {
  const context = useContext(ShopContext);
  if (!context) {
    throw new Error('useShop must be used within a ShopProvider');
  }
  return context;
}