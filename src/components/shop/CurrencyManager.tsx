import React, { useState } from 'react';
import { useShop, Currency } from '../../contexts/ShopContext';
import ImageUpload from '../common/ImageUpload';

const CurrencyManager: React.FC = () => {
  const { 
    currencies, 
    addCurrency, 
    updateCurrency, 
    deleteCurrency, 
    setDefaultCurrency
    // Удалено неиспользуемое getDefaultCurrency
  } = useShop();
  
  const [isEditing, setIsEditing] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  
  // Состояние для новой валюты
  const [newCurrency, setNewCurrency] = useState<Currency>({
    id: '',
    name: '',
    description: '',
    icon: null,
    exchangeRate: 1,
    isDefault: false
  });
  
  // Дефолтные валюты с обновленными названиями
  const defaultCurrencies: Currency[] = [
    {
      id: 'Soft_currency',
      name: 'Луны',
      description: 'Основная игровая валюта',
      icon: null,
      exchangeRate: 1,
      isDefault: true
    },
    {
      id: 'Medium_currency',
      name: 'Солы',
      description: 'Переходящая валюта',
      icon: null,
      exchangeRate: 0.1, // 10 Солов = 100 Лунов
      isDefault: false
    },
    {
      id: 'Hard_currency',
      name: 'Алетит',
      description: 'Премиальная валюта',
      icon: null,
      exchangeRate: 0.01, // 10 Алетит = 100 Солов = 1000 Лунов
      isDefault: false
    }
  ];
  
  // Изменения в форме валюты
  const handleCurrencyChange = (field: keyof Currency, value: any) => {
    if (isEditing && editingCurrency) {
      setEditingCurrency({ ...editingCurrency, [field]: value });
    } else {
      setNewCurrency({ ...newCurrency, [field]: value });
    }
  };
  
  // Обработчик изменения иконки
  const handleIconChange = (iconId: string | null) => {
    if (isEditing && editingCurrency) {
      setEditingCurrency({ ...editingCurrency, icon: iconId });
    } else {
      setNewCurrency({ ...newCurrency, icon: iconId });
    }
  };
  
  // Сохранение валюты
  const handleSaveChanges = () => {
    if (isEditing && editingCurrency) {
      // Обновление существующей валюты
      updateCurrency(editingCurrency.id, editingCurrency);
      setIsEditing(false);
      setEditingCurrency(null);
    } else {
      // Проверка на обязательные поля
      if (!newCurrency.id || !newCurrency.name) {
        alert('Заполните обязательные поля: ID и Название');
        return;
      }
      
      // Проверка на уникальность ID
      if (currencies.some(c => c.id === newCurrency.id)) {
        alert('Валюта с таким ID уже существует');
        return;
      }
      
      // Добавление новой валюты
      addCurrency(newCurrency);
      
      // Сброс формы
      setNewCurrency({
        id: '',
        name: '',
        description: '',
        icon: null,
        exchangeRate: 1,
        isDefault: false
      });
    }
  };
  
  // Отмена редактирования
  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingCurrency(null);
  };
  
  // Редактирование валюты
  const handleEditCurrency = (currency: Currency) => {
    setEditingCurrency({ ...currency });
    setIsEditing(true);
  };
  
  // Удаление валюты
  const handleDeleteCurrency = (id: string) => {
    if (window.confirm('Вы уверены, что хотите удалить эту валюту?')) {
      deleteCurrency(id);
    }
  };
  
  // Установка дефолтной валюты
  const handleSetDefaultCurrency = (id: string) => {
    setDefaultCurrency(id);
  };
  
  // Добавление дефолтных валют
  const handleAddDefaultCurrencies = () => {
    // Массив обновлений для существующих валют
    const updates = [
      { oldId: 'Soft_currency', newName: 'Луны', newDesc: 'Основная игровая валюта', rate: 1, isDefault: true },
      // Проверяем оба возможных ID для второй валюты
      { oldId: 'Medium_currency', newName: 'Солы', newDesc: 'Переходящая валюта', rate: 0.1 },
      { oldId: 'Premium_currency', newName: 'Солы', newDesc: 'Переходящая валюта', rate: 0.1 },
      // Проверяем оба возможных ID для третьей валюты  
      { oldId: 'Hard_currency', newName: 'Алетит', newDesc: 'Премиальная валюта', rate: 0.01 },
      { oldId: 'Special_currency', newName: 'Алетит', newDesc: 'Премиальная валюта', rate: 0.01 }
    ];
    
    // Обновляем существующие валюты с новыми названиями
    let updatesApplied = false;
      updates.forEach(update => {
        const currency = currencies.find(c => c.id === update.oldId);
        if (currency) {
          updateCurrency(update.oldId, { 
            name: update.newName, 
            description: update.newDesc,
            exchangeRate: update.rate
          });
          
          // Если это валюта по умолчанию, устанавливаем ее
          if (update.isDefault) {
            setDefaultCurrency(update.oldId);
          }
          
          updatesApplied = true;
        }
      });
      
      // Добавляем отсутствующие валюты
      defaultCurrencies.forEach(currency => {
        if (!currencies.some(c => c.id === currency.id)) {
          addCurrency(currency);
          updatesApplied = true;
        }
      });
      
      // Устанавливаем Soft_currency как валюту по умолчанию, если нет валюты по умолчанию
      if (!currencies.some(c => c.isDefault)) {
        setDefaultCurrency('Soft_currency');
      }
      
      if (!updatesApplied) {
        alert('Все стандартные валюты уже добавлены');
      }
  };
  
  // Функция для отображения соотношения обмена в понятном виде
  const formatExchangeRate = (currency: Currency): string => {
    if (currency.id === 'Soft_currency') {
      return 'Базовая валюта';
    } else if (currency.id === 'Medium_currency') {
      return '10 Солов = 100 Лунов';
    } else if (currency.id === 'Hard_currency') {
      return '10 Алетит = 100 Солов = 1000 Лунов';
    } else {
      // Для других валют показываем стандартное соотношение
      const rate = 1 / (currency.exchangeRate || 1);
      return `1 = ${rate} Лунов`;
    }
  };
  
  return (
    <div className="space-y-8">
      {/* Форма для добавления/редактирования валюты */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">
          {isEditing ? 'Редактирование валюты' : 'Добавление новой валюты'}
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">ID валюты*</label>
            <input 
              type="text" 
              value={isEditing ? editingCurrency?.id || '' : newCurrency.id}
              onChange={(e) => handleCurrencyChange('id', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              readOnly={isEditing} // Нельзя изменять ID существующей валюты
              placeholder="например: gold_coins"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Название*</label>
            <input 
              type="text" 
              value={isEditing ? editingCurrency?.name || '' : newCurrency.name}
              onChange={(e) => handleCurrencyChange('name', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="например: Луны"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Иконка валюты</label>
            <ImageUpload onUpload={handleIconChange} />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Курс обмена</label>
            <input 
              type="number" 
              min="0.001" 
              step="0.001"
              value={isEditing ? editingCurrency?.exchangeRate || 1 : newCurrency.exchangeRate}
              onChange={(e) => handleCurrencyChange('exchangeRate', parseFloat(e.target.value) || 1)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="относительно Лунов"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Значение относительно базовой валюты (Луны). Например, 0.1 означает: 1 единица этой валюты = 10 Лунов.
            </p>
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Описание</label>
            <textarea 
              value={isEditing ? editingCurrency?.description || '' : newCurrency.description}
              onChange={(e) => handleCurrencyChange('description', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              rows={2}
            />
          </div>
          
          {!isEditing && (
            <div className="md:col-span-2">
              <label className="flex items-center">
                <input 
                  type="checkbox" 
                  checked={newCurrency.isDefault || false}
                  onChange={(e) => handleCurrencyChange('isDefault', e.target.checked)}
                  className="h-4 w-4 text-blue-600 rounded"
                />
                <span className="ml-2 text-gray-700 dark:text-gray-300">Установить как валюту по умолчанию</span>
              </label>
              <p className="text-xs text-red-500 mt-1">
                Внимание: Рекомендуется использовать Луны (Soft_currency) как валюту по умолчанию.
              </p>
            </div>
          )}
        </div>
        
        <div className="flex justify-between space-x-2">
          <button
            onClick={handleAddDefaultCurrencies}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
          >
            Добавить стандартные валюты
          </button>
          
          <div className="flex space-x-2">
            {isEditing && (
              <button 
                onClick={handleCancelEdit}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Отмена
              </button>
            )}
            <button 
              onClick={handleSaveChanges}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Сохранить изменения' : 'Добавить валюту'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Список существующих валют */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-white">Список валют</h2>
        
        {currencies.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">Нет добавленных валют</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Название
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Иконка
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Курс обмена
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    По умолчанию
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currencies.map((currency) => (
                  <tr key={currency.id} className="hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {currency.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {currency.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currency.icon ? (
                        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <img 
                            src={`/api/image/${currency.icon}`} 
                            alt={currency.name} 
                            className="h-full w-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMzIiIHZpZXdCb3g9IjAgMCAzMiAzMiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48Y2lyY2xlIGN4PSIxNiIgY3k9IjE2IiByPSIxNiIgZmlsbD0iIzY0NzQ4QiIvPjx0ZXh0IHg9IjEyIiB5PSIyMCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSI+JDwvdGV4dD48L3N2Zz4=';
                            }}
                          />
                        </div>
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-600 flex items-center justify-center text-white">
                          $
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {formatExchangeRate(currency)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currency.isDefault ? (
                        <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full">
                          По умолчанию
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultCurrency(currency.id)}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Сделать по умолчанию
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleEditCurrency(currency)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 mr-3"
                      >
                        Изменить
                      </button>
                      {!currency.isDefault && (
                        <button
                          onClick={() => handleDeleteCurrency(currency.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900"
                        >
                          Удалить
                        </button>
                      )}
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

export default CurrencyManager;