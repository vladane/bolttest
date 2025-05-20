import React, { useState, useEffect, useRef } from 'react';
import { useShop, Shop, Trader } from '../../contexts/ShopContext';
import ShopItemEditor from './ShopItemEditor';
import { useToast } from '../common/Toast';

interface TradingPoint {
  trader: Trader;
  shop: Shop;
}

const TradingPointManager: React.FC = () => {
  const { 
    traders, 
    shops,
    addTrader, 
    updateTrader, 
    deleteTrader,
    addShop,
    updateShop,
    deleteShop,
    // Удаляем неиспользуемое свойство state, которое не существует в типе
  } = useShop();
  
  const { addToast } = useToast();
  
  const [isEditing, setIsEditing] = useState(false);
  const [currentPoint, setCurrentPoint] = useState<TradingPoint | null>(null);
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [currentShopId, setCurrentShopId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Состояние для модальных окон
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
    type: 'info' as 'info' | 'warning' | 'danger'
  });
  
  // Удаляем неиспользуемую переменную isStateReady
  
  // Референс для таймера загрузки
  const loadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  
  useEffect(() => {
    // Проверяем, что необходимые данные загружены
    if (shops && traders) {
      // Если загрузка была запущена, останавливаем ее
      if (isLoading) {
        setIsLoading(false);
        if (loadingTimerRef.current) {
          clearTimeout(loadingTimerRef.current);
          loadingTimerRef.current = null;
        }
      }
    }
  }, [shops, traders, isLoading]);
  
  // Очистка таймера при размонтировании компонента
  useEffect(() => {
    return () => {
      if (loadingTimerRef.current) {
        clearTimeout(loadingTimerRef.current);
      }
    };
  }, []);
  
  // Используем локальные счетчики вместо глобальных
  const [shopIdCounter, setShopIdCounter] = useState<number>(1);
  const [traderIdCounter, setTraderIdCounter] = useState<number>(1);
  
  // Инициализация счетчиков
  useEffect(() => {
    // Находим максимальные ID, чтобы избежать дубликатов
    if (shops && shops.length > 0) {
      const maxShopId = Math.max(...shops
        .map(s => parseInt(s.shopId.replace('Shop_', ''), 10) || 0)
        .filter(id => !isNaN(id))
      );
      setShopIdCounter(maxShopId + 1);
    }
    
    if (traders && traders.length > 0) {
      const maxTraderId = Math.max(...traders
        .map(t => parseInt(t.traderId.replace('Trader_', ''), 10) || 0)
        .filter(id => !isNaN(id))
      );
      setTraderIdCounter(maxTraderId + 1);
    }
  }, [shops, traders]);
  
  // Функции для создания новых ID без обновления глобальных счетчиков
  const createShopId = () => `Shop_${shopIdCounter}`;
  const createTraderId = () => `Trader_${traderIdCounter}`;
  
  // Состояние для новой торговой точки
  const [newPoint, setNewPoint] = useState<TradingPoint>({
    trader: {
      traderId: createTraderId(),
      name: '',
      shopId: createShopId(),
      traderInventoryUIId: 'Trader',
      buyInventoryUIId: 'Buy',
      sellInventoryUIId: 'Sell',
      fillShopWhenTraderHasCreated: true,
      canTrade: true,
      canInteractDirectly: true,
      description: '',
      location: ''
    },
    shop: {
      shopId: createShopId(),
      name: '',
      description: '',
      shopItems: [],
      restockTime: 1440,
      isRandomStock: false
    }
  });
  
  // При инициализации компонента и после добавления новой точки
  // обновляем shopId в объекте trader, чтобы они соответствовали
  useEffect(() => {
    setNewPoint(prev => ({
      ...prev,
      trader: {
        ...prev.trader,
        shopId: prev.shop.shopId
      }
    }));
  }, [newPoint.shop.shopId]);
  
  // Изменения в форме торговой точки
  const handlePointChange = (entity: 'trader' | 'shop', field: string, value: any) => {
    if (isEditing && currentPoint) {
      setCurrentPoint({
        ...currentPoint,
        [entity]: {
          ...currentPoint[entity],
          [field]: value
        }
      });
      
      // Синхронизируем названия магазина и торговца, если пользователь этого хочет
      if (field === 'name' && (document.getElementById('sync-names') as HTMLInputElement)?.checked) {
        const syncField = entity === 'trader' ? 'shop' : 'trader';
        setCurrentPoint(prev => {
          if (!prev) return prev;
          return {
            ...prev,
            [syncField]: {
              ...prev[syncField],
              name: value
            }
          };
        });
      }
    } else {
      setNewPoint({
        ...newPoint,
        [entity]: {
          ...newPoint[entity],
          [field]: value
        }
      });
      
      // Синхронизируем названия магазина и торговца, если пользователь этого хочет
      if (field === 'name' && (document.getElementById('sync-names') as HTMLInputElement)?.checked) {
        const syncField = entity === 'trader' ? 'shop' : 'trader';
        setNewPoint(prev => ({
          ...prev,
          [syncField]: {
            ...prev[syncField],
            name: value
          }
        }));
      }
    }
  };
  
  // Сохранение торговой точки
  const handleSavePoint = () => {
    if (isEditing && currentPoint) {
      // Обновление существующей торговой точки
      updateTrader(currentPoint.trader.traderId, currentPoint.trader);
      updateShop(currentPoint.shop.shopId, currentPoint.shop);
      setIsEditing(false);
      setCurrentPoint(null);
      addToast('Торговая точка успешно обновлена', 'success');
    } else {
      // Проверка на обязательные поля
      if (!newPoint.trader.name || !newPoint.shop.name) {
        addToast('Заполните обязательные поля: Имя торговца и Название магазина', 'error');
        return;
      }
      
      // Создаем новый магазин и торговца с одинаковыми ID
      const shopId = createShopId();
      const traderId = createTraderId();
      
      const shop = {
        ...newPoint.shop,
        shopId
      };
      
      const trader = {
        ...newPoint.trader,
        traderId,
        shopId // Привязываем торговца к магазину
      };
      
      // Добавляем магазин и торговца
      addShop(shop);
      addTrader(trader);
      
      // Увеличиваем локальные счетчики
      setShopIdCounter(prev => prev + 1);
      setTraderIdCounter(prev => prev + 1);
      
      // Сбрасываем форму
      setNewPoint({
        trader: {
          traderId: `Trader_${traderIdCounter + 1}`,
          name: '',
          shopId: `Shop_${shopIdCounter + 1}`,
          traderInventoryUIId: 'Trader',
          buyInventoryUIId: 'Buy',
          sellInventoryUIId: 'Sell',
          fillShopWhenTraderHasCreated: true,
          canTrade: true,
          canInteractDirectly: true,
          description: '',
          location: ''
        },
        shop: {
          shopId: `Shop_${shopIdCounter + 1}`,
          name: '',
          description: '',
          shopItems: [],
          restockTime: 1440,
          isRandomStock: false
        }
      });
      
      addToast('Торговая точка успешно создана', 'success');
    }
  };
  
  // Отмена редактирования
  const handleCancelEdit = () => {
    setIsEditing(false);
    setCurrentPoint(null);
  };
  
  // Редактирование торговой точки
  const handleEditPoint = (traderId: string) => {
    const trader = traders.find(t => t.traderId === traderId);
    if (!trader) {
      addToast('Торговец не найден', 'error');
      return;
    }
    
    const shop = shops.find(s => s.shopId === trader.shopId);
    if (!shop) {
      addToast('Магазин торговца не найден', 'error');
      return;
    }
    
    setCurrentPoint({ trader, shop });
    setIsEditing(true);
  };
  
  // Удаление торговой точки
  const handleDeletePoint = (traderId: string) => {
    const trader = traders.find(t => t.traderId === traderId);
    if (!trader) return;
    
    setConfirmModal({
      isOpen: true,
      title: 'Подтверждение удаления',
      message: `Вы уверены, что хотите удалить торговую точку "${trader.name}"?`,
      onConfirm: () => {
        deleteTrader(traderId);
        deleteShop(trader.shopId);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
        addToast('Торговая точка удалена', 'success');
      },
      type: 'danger'
    });
  };
  
// Открытие редактора предметов магазина
const handleOpenItemEditor = (shopId: string) => {
  console.log("Opening shop editor with ID:", shopId);
  
  // Проверяем наличие самого необходимого - магазина
  const targetShop = shops?.find(s => s.shopId === shopId);
  if (!targetShop) {
    addToast(`Магазин с ID ${shopId} не найден`, 'error');
    console.log("Shop not found:", shopId, "Available shops:", shops?.map(s => s.shopId));
    return;
  }
  
  // Очистка глобального состояния, чтобы предотвратить проблему вечной загрузки
  // @ts-ignore - доступ к глобальной переменной из компонента ShopItemEditor
  if (typeof window !== 'undefined' && window.initializedShopIds) {
    // @ts-ignore
    window.initializedShopIds.clear();
  }
  
  // Принудительно закрываем текущий редактор, если он открыт
  if (showItemEditor) {
    setShowItemEditor(false);
    setCurrentShopId(null);
    
    // Открываем новый с задержкой
    setTimeout(() => {
      console.log("Opening shop editor after previous close:", targetShop.name);
      setCurrentShopId(shopId);
      setShowItemEditor(true);
    }, 100);
    return;
  }
  
  // Если ничего не открыто, просто открываем
  console.log("Shop found, opening editor:", targetShop);
  setCurrentShopId(shopId);
  setShowItemEditor(true);
};
  
  // Закрытие редактора предметов магазина
  const handleCloseItemEditor = () => {
    console.log("Closing shop item editor");
    setShowItemEditor(false);
    setTimeout(() => {
      setCurrentShopId(null);
    }, 100);
  };
  
  // Получаем количество товаров в магазине
  const getShopItemCount = (shopId: string): number => {
    const shop = shops.find(s => s.shopId === shopId);
    return shop ? shop.shopItems.length : 0;
  };
  
  // Создаем список торговых точек, объединяя торговцев и магазины
  const tradingPoints = traders.map(trader => {
    const shop = shops.find(s => s.shopId === trader.shopId) || {
      shopId: trader.shopId,
      name: 'Магазин не найден',
      description: '',
      shopItems: [],
      restockTime: 1440,
      isRandomStock: false
    };
    
    return { trader, shop };
  });
  
  // Состояние для уведомлений
  const [notification, setNotificationState] = useState({
    isVisible: false,
    message: '',
    type: 'info' as 'info' | 'success' | 'warning' | 'error',
    timeout: null as ReturnType<typeof setTimeout> | null
  });
  
  // Очищаем таймер уведомления при размонтировании компонента
  useEffect(() => {
    return () => {
      if (notification.timeout) {
        clearTimeout(notification.timeout);
      }
    };
  }, [notification.timeout]);
  
  return (
    <div className="space-y-8 relative">
      {/* Модальное окно подтверждения */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full shadow-lg">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">{confirmModal.title}</h3>
            <p className="text-gray-500 dark:text-gray-300 mb-6">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Отмена
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Уведомления */}
      {notification.isVisible && (
        <div className={`fixed bottom-4 right-4 z-50 p-4 rounded-md shadow-lg text-white 
          ${notification.type === 'success' ? 'bg-green-500' : 
            notification.type === 'error' ? 'bg-red-500' : 
            notification.type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'}`}
        >
          <div className="flex items-center">
            <div className="flex-1 mr-3">
              <p>{notification.message}</p>
            </div>
            <button 
              onClick={() => setNotificationState(prev => ({ ...prev, isVisible: false }))}
              className="text-white hover:text-gray-200"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      {/* Индикатор загрузки */}
      {isLoading && (
        <div className="fixed inset-0 z-40 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 flex flex-col items-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-700 dark:text-gray-300 text-center">Загрузка данных...</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Это может занять несколько секунд</p>
            <div className="flex space-x-3 mt-4">
              <button 
                onClick={() => {
                  setIsLoading(false);
                  if (loadingTimerRef.current) {
                    clearTimeout(loadingTimerRef.current);
                    loadingTimerRef.current = null;
                  }
                }}
                className="px-4 py-2 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Отменить
              </button>
              <button 
                onClick={() => {
                  if (currentShopId) {
                    setIsLoading(false);
                    setShowItemEditor(true);
                  } else {
                    setIsLoading(false);
                  }
                  if (loadingTimerRef.current) {
                    clearTimeout(loadingTimerRef.current);
                    loadingTimerRef.current = null;
                  }
                }}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Продолжить без ожидания
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Модальное окно для редактора предметов */}
      {showItemEditor && currentShopId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                  Товары в магазине: {shops?.find(s => s.shopId === currentShopId)?.name || currentShopId}
                </h2>
                <button 
                  onClick={handleCloseItemEditor}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <ShopItemEditor
                key={`shop-editor-${currentShopId}-${Date.now()}`} // Всегда создаем новый инстанс
                shopId={currentShopId}
                onClose={handleCloseItemEditor}
              />
            </div>
          </div>
        </div>
      )}
      
      {/* Форма для добавления/редактирования торговой точки */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          {isEditing ? 'Редактирование торговой точки' : 'Создание новой торговой точки'}
        </h2>
        
        <div className="mb-4">
          <label className="flex items-center text-sm">
            <input 
              type="checkbox" 
              id="sync-names"
              defaultChecked
              className="h-4 w-4 text-blue-600 rounded mr-2"
            />
            Синхронизировать имя торговца и название магазина
          </label>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {/* Информация о торговце */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white border-b pb-2">Информация о торговце</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ID торговца</label>
              <input 
                type="text" 
                value={isEditing ? currentPoint?.trader.traderId || '' : newPoint.trader.traderId}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Имя торговца*</label>
              <input 
                type="text" 
                value={isEditing ? currentPoint?.trader.name || '' : newPoint.trader.name}
                onChange={(e) => handlePointChange('trader', 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="например: Кузнец Михаил"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Местоположение</label>
              <input 
                type="text" 
                value={isEditing ? currentPoint?.trader.location || '' : newPoint.trader.location}
                onChange={(e) => handlePointChange('trader', 'location', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="например: Главная площадь"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Описание торговца</label>
              <textarea 
                value={isEditing ? currentPoint?.trader.description || '' : newPoint.trader.description}
                onChange={(e) => handlePointChange('trader', 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={2}
              />
            </div>
            
            <div className="space-y-2">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={isEditing ? currentPoint?.trader.canTrade || false : newPoint.trader.canTrade}
                  onChange={(e) => handlePointChange('trader', 'canTrade', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Может торговать</span>
              </label>
              
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={isEditing ? currentPoint?.trader.canInteractDirectly || false : newPoint.trader.canInteractDirectly}
                  onChange={(e) => handlePointChange('trader', 'canInteractDirectly', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Прямое взаимодействие</span>
              </label>
            </div>
          </div>
          
          {/* Информация о магазине */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 dark:text-white border-b pb-2">Информация о магазине</h3>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ID магазина</label>
              <input 
                type="text" 
                value={isEditing ? currentPoint?.shop.shopId || '' : newPoint.shop.shopId}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-gray-300"
                readOnly
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Название магазина*</label>
              <input 
                type="text" 
                value={isEditing ? currentPoint?.shop.name || '' : newPoint.shop.name}
                onChange={(e) => handlePointChange('shop', 'name', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="например: Кузница Михаила"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Описание магазина</label>
              <textarea 
                value={isEditing ? currentPoint?.shop.description || '' : newPoint.shop.description}
                onChange={(e) => handlePointChange('shop', 'description', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                rows={2}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Время пополнения (минуты)</label>
              <input 
                type="number" 
                min="0"
                value={isEditing ? currentPoint?.shop.restockTime || 1440 : newPoint.shop.restockTime}
                onChange={(e) => handlePointChange('shop', 'restockTime', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Время, через которое обновляется ассортимент (1440 = 24 часа)
              </p>
            </div>
            
            <div>
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={isEditing ? currentPoint?.shop.isRandomStock || false : newPoint.shop.isRandomStock}
                  onChange={(e) => handlePointChange('shop', 'isRandomStock', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Случайный ассортимент при пополнении</span>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end space-x-2">
          {isEditing && (
            <button 
              onClick={handleCancelEdit}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              Отмена
            </button>
          )}
          <button 
            onClick={handleSavePoint}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            {isEditing ? 'Сохранить изменения' : 'Создать торговую точку'}
          </button>
        </div>
      </div>
      
      {/* Список существующих торговых точек */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Список торговых точек</h2>
        
        {tradingPoints.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Нет созданных торговых точек</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Имя торговца
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Название магазина
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Местоположение
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Товары
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {tradingPoints.map(({ trader, shop }) => (
                  <tr key={trader.traderId} className="hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {trader.name}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {trader.traderId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {shop.name}
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        ID: {shop.shopId}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {trader.location || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full mr-2">
                          {getShopItemCount(shop.shopId)} товаров
                        </span>
                        <button
                          onClick={() => handleOpenItemEditor(shop.shopId)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Управление товарами
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {trader.canTrade ? (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                          Активен
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 rounded-full">
                          Неактивен
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditPoint(trader.traderId)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 mr-3"
                      >
                        Изменить
                      </button>
                      <button
                        onClick={() => handleDeletePoint(trader.traderId)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900"
                      >
                        Удалить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TradingPointManager;