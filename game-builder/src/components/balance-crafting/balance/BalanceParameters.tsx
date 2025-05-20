import { useState, useEffect } from 'react';
import { useBalance } from '../../../contexts/BalanceContext';
import { useAppState } from '../../../contexts/AppStateContext';
import CraftTimeSettings from './CraftTimeSettings';
import SeasonalSettings from './SeasonalSettings';

export default function BalanceParameters() {
  const balance = useBalance();
  const { state, updateState } = useAppState();
  const { currentConfig, updateConfig } = balance;
  const [configName, setConfigName] = useState('');
  const [activeTab, setActiveTab] = useState('general');

  // Проверяем и инициализируем модификаторы подтипов при монтировании компонента
  useEffect(() => {
    if (!currentConfig.subTypeModifiers || Object.keys(currentConfig.subTypeModifiers || {}).length === 0) {
      // Ищем дефолтную конфигурацию (или первую доступную) для получения модификаторов подтипов
      const defaultConfig = state.balance.savedConfigs.find(c => c.id === 'default') || 
                           (state.balance.savedConfigs.length > 0 ? state.balance.savedConfigs[0] : null);
      
      if (defaultConfig && defaultConfig.subTypeModifiers && 
          Object.keys(defaultConfig.subTypeModifiers).length > 0) {
        // Используем модификаторы из сохраненной конфигурации
        updateConfig({
          subTypeModifiers: { ...defaultConfig.subTypeModifiers }
        });
      }
    }
  }, [currentConfig, state.balance.savedConfigs, updateConfig]);

  // Функция для создания новой конфигурации при сохранении параметров
  const saveAsNewConfig = () => {
    if (!configName.trim()) {
      alert('Please enter a configuration name');
      return;
    }
    
    console.log("Создаем новую конфигурацию из параметров:", configName);
    
    // 1. Генерируем уникальный ID
    const newId = `config-${Date.now()}`;
    
    // 2. Создаем полную копию текущей конфигурации
    const newConfig = JSON.parse(JSON.stringify(currentConfig));
    
    // 3. Устанавливаем новые значения
    newConfig.id = newId;
    newConfig.name = configName;
    newConfig.createdAt = new Date().toISOString();
    
    // 4. Проверяем и добавляем подтипы если их нет
    if (!newConfig.subTypeModifiers || Object.keys(newConfig.subTypeModifiers).length === 0) {
      const defaultConfig = state.balance.savedConfigs.find(c => c.id === 'default');
      if (defaultConfig && defaultConfig.subTypeModifiers) {
        newConfig.subTypeModifiers = { ...defaultConfig.subTypeModifiers };
      }
    }
    
    console.log("Новая конфигурация:", newConfig);
    
    // 5. Добавляем в список сохраненных конфигураций
    const newSavedConfigs = [...state.balance.savedConfigs, newConfig];
    
    // 6. Обновляем state одним вызовом
    updateState('balance', {
      currentConfig: newConfig, 
      savedConfigs: newSavedConfigs,
      comparisonItems: state.balance.comparisonItems
    });
    
    // Очищаем поле ввода
    setConfigName('');
    
    // Сообщаем пользователю об успешном сохранении
    alert(`Configuration "${configName}" has been created`);
  };
  
  // Обработчик изменения базовой стоимости
  const handleBaseValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      updateConfig({ baseValue: value });
    }
  };
  
  // Обработчик изменения весов
  const handleWeightChange = (key: keyof typeof currentConfig.weights, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0 && value <= 1) {
      updateConfig({
        weights: {
          ...currentConfig.weights,
          [key]: value
        }
      });
    }
  };
  
  // Обработчик изменения множителя тира
  const handleTierMultiplierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({ tierMultiplier: value });
    }
  };
  
  // Обработчик изменения множителя категории
  const handleCategoryMultiplierChange = (category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({
        categories: {
          ...currentConfig.categories,
          [category]: value
        }
      });
    }
  };
  
  // Обработчик изменения множителя механики
  const handleMechanicMultiplierChange = (mechanic: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({
        mechanics: {
          ...currentConfig.mechanics,
          [mechanic]: value
        }
      });
    }
  };
  
  // Обработчик изменения множителя модификаторов
  const handleModifierMultiplierChange = (modifier: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({
        modifiers: {
          ...currentConfig.modifiers,
          [modifier]: value
        }
      });
    }
  };
  
  // Обработчик изменения множителя частоты встречаемости
  const handleFrequencyTypeMultiplierChange = (frequencyType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({
        frequencyTypes: {
          ...currentConfig.frequencyTypes,
          [frequencyType]: value
        }
      });
    }
  };
  
  // Обработчик изменения множителя сложности крафта
  const handleCraftComplexityMultiplierChange = (craftComplexity: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({
        craftComplexityTypes: {
          ...currentConfig.craftComplexityTypes,
          [craftComplexity]: value
        }
      });
    }
  };

  // Обработчик изменения множителя подтипа
  const handleSubTypeModifierChange = (subType: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value >= 0) {
      updateConfig({
        subTypeModifiers: {
          ...(currentConfig.subTypeModifiers || {}),
          [subType]: value
        }
      });
    }
  };
  
  // Функция для сброса к дефолтным подтипам
  const resetToDefaultSubTypes = () => {
    // Находим дефолтную конфигурацию
    const defaultConfig = state.balance.savedConfigs.find(c => c.id === 'default');
    
    if (defaultConfig && defaultConfig.subTypeModifiers) {
      updateConfig({
        subTypeModifiers: { ...defaultConfig.subTypeModifiers }
      });
    }
  };

  // Рендер содержимого в зависимости от активной вкладки
  const renderContent = () => {
    switch(activeTab) {
      case 'general':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Базовые параметры</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Базовая ценность</label>
                    <input
                      type="number"
                      value={currentConfig.baseValue}
                      onChange={handleBaseValueChange}
                      min="1"
                      step="1"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Множитель Тира (+% per tier)</label>
                    <input
                      type="number"
                      value={currentConfig.tierMultiplier}
                      onChange={handleTierMultiplierChange}
                      min="0"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                    <p className="text-xs text-gray-500 mt-1">Каждый уровень Тира выше 1, добавляет процент к множителю</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Общий вес Формул</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Для более правильного баланса, сумма весов должна быть равна 1</p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Вес Категории (W1)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.categoryWeight}
                      onChange={(e) => handleWeightChange('categoryWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Вес Тира (W2)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.tierWeight}
                      onChange={(e) => handleWeightChange('tierWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Вес Механики (W3)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.mechanicWeight}
                      onChange={(e) => handleWeightChange('mechanicWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Вес Модификатора (W4)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.modifiersWeight}
                      onChange={(e) => handleWeightChange('modifiersWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">Вес Локации (W5)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.locationsWeight}
                      onChange={(e) => handleWeightChange('locationsWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  {/* Добавляем новые весовые коэффициенты */}
                  <div>
                    <label className="block text-sm font-medium mb-1">Вес частоты появления (W6)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.frequencyWeight || 0.1}
                      onChange={(e) => handleWeightChange('frequencyWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Вес Сложности крафта (W7)</label>
                    <input
                      type="number"
                      value={currentConfig.weights.craftComplexityWeight || 0.1}
                      onChange={(e) => handleWeightChange('craftComplexityWeight', e)}
                      min="0"
                      max="1"
                      step="0.05"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                    />
                  </div>
                  
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-md">
                    <div className="text-sm">
                      Всего: <span className={
                        Math.abs(
                          currentConfig.weights.categoryWeight + 
                          currentConfig.weights.tierWeight + 
                          currentConfig.weights.mechanicWeight + 
                          currentConfig.weights.modifiersWeight +
                          currentConfig.weights.locationsWeight +
                          (currentConfig.weights.frequencyWeight || 0) +
                          (currentConfig.weights.craftComplexityWeight || 0) - 1
                        ) < 0.01 ? 'text-green-500' : 'text-red-500'
                      }>
                        {(
                          currentConfig.weights.categoryWeight + 
                          currentConfig.weights.tierWeight + 
                          currentConfig.weights.mechanicWeight + 
                          currentConfig.weights.modifiersWeight +
                          currentConfig.weights.locationsWeight +
                          (currentConfig.weights.frequencyWeight || 0) +
                          (currentConfig.weights.craftComplexityWeight || 0)
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Секция настройки торговых модификаторов */}
              <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm mb-4">
                <h3 className="text-lg font-medium mb-4">Торговые модификаторы</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Скидка продажи (%)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={Math.round(currentConfig.sellDiscount * 100)}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value)) {
                            updateConfig({ sellDiscount: value / 100 });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        min="0"
                        max="100"
                        step="1"
                      />
                      <span className="ml-2">%</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Скидка, применяемая при продаже предметов торговцам
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Наценка покупки (%)</label>
                    <div className="flex items-center">
                      <input
                        type="number"
                        value={Math.round(currentConfig.buyMarkup * 100)}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          if (!isNaN(value)) {
                            updateConfig({ buyMarkup: value / 100 });
                          }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        min="0"
                        max="100"
                        step="1"
                      />
                      <span className="ml-2">%</span>
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Наценка, применяемая при покупке товаров у продавцов
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Сохранить конфигурацию</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Название конфигурации</label>
                    <input
                    type="text"
                    value={configName}
                    onChange={(e) => setConfigName(e.target.value)}
                    placeholder="Enter configuration name"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                  />
                  </div>
                  
                  <button
                    onClick={saveAsNewConfig}
                    className="w-full px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
                  >
                    Сохранить конфигурацию
                  </button>
                </div>
              </div>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Множитель Категории</h2>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.categories).map(([category, multiplier]: [string, number]) => (
                    <div key={category} className="flex items-center">
                      <label className="w-1/2 text-sm">{category}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => handleCategoryMultiplierChange(category, e)}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Множитель Механики</h2>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.mechanics).map(([mechanic, multiplier]: [string, number]) => (
                    <div key={mechanic} className="flex items-center">
                      <label className="w-1/2 text-sm">{mechanic}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => handleMechanicMultiplierChange(mechanic, e)}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Множитель Модификатора</h2>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.modifiers).map(([modifier, multiplier]: [string, number]) => (
                    <div key={modifier} className="flex items-center">
                      <label className="w-1/2 text-sm">{modifier}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => handleModifierMultiplierChange(modifier, e)}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Множитель Локации</h2>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.locations).map(([location, multiplier]: [string, number]) => (
                    <div key={location} className="flex items-center">
                      <label className="w-1/2 text-sm">{location}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          if (!isNaN(value) && value >= 0) {
                            updateConfig({
                              locations: {
                                ...currentConfig.locations,
                                [location]: value
                              }
                            });
                          }
                        }}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Добавляем новую секцию для Frequency Types */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Множитель частоты появления</h2>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.frequencyTypes || {}).map(([frequencyType, multiplier]: [string, number]) => (
                    <div key={frequencyType} className="flex items-center">
                      <label className="w-1/2 text-sm">{frequencyType}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => handleFrequencyTypeMultiplierChange(frequencyType, e)}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Добавляем новую секцию для Craft Complexity */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <h2 className="text-lg font-semibold mb-4">Множитель Сложности крафта</h2>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.craftComplexityTypes || {}).map(([craftComplexity, multiplier]: [string, number]) => (
                    <div key={craftComplexity} className="flex items-center">
                      <label className="w-1/2 text-sm">{craftComplexity}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => handleCraftComplexityMultiplierChange(craftComplexity, e)}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Секция для модификаторов подтипов */}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-lg font-semibold">Модификаторы подтипов</h2>
                  <button 
                    onClick={resetToDefaultSubTypes}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Сбросить к дефолтным
                  </button>
                </div>
                
                <div className="space-y-3">
                  {Object.entries(currentConfig.subTypeModifiers || {}).map(([subType, multiplier]: [string, number]) => (
                    <div key={subType} className="flex items-center">
                      <label className="w-1/2 text-sm">{subType}</label>
                      <input
                        type="number"
                        value={multiplier}
                        onChange={(e) => handleSubTypeModifierChange(subType, e)}
                        min="0"
                        step="0.1"
                        className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                      />
                    </div>
                  ))}
                </div>
                
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  Множитель определяет, как подтип влияет на базовую стоимость предмета.
                </p>
              </div>
            </div>
          </div>
        );
      case 'craftTime':
        return <CraftTimeSettings />;
      case 'seasonal':
        return <SeasonalSettings />;
      default:
        return null;
    }
  };
  
  return (
    <div className="space-y-4">
      {/* Навигационные вкладки */}
      <div className="flex flex-wrap border-b border-gray-300 dark:border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'general'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('general')}
        >
          Основные настройки
        </button>
        
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'craftTime'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('craftTime')}
        >
          Настройки времени крафта
        </button>
        
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === 'seasonal'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
          onClick={() => setActiveTab('seasonal')}
        >
          Сезонные настройки
        </button>
      </div>
      
      {/* Содержимое выбранной вкладки */}
      {renderContent()}
    </div>
  );
}