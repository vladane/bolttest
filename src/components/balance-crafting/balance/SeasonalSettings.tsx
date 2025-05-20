// src/components/balance-crafting/balance/SeasonalSettings.tsx
import { useState } from 'react';
import { useBalance } from '../../../contexts/BalanceContext';

const SeasonalSettings = () => {
  const { currentConfig, updateConfig, setCurrentSeason } = useBalance();
  const [newSeason, setNewSeason] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingSubType, setEditingSubType] = useState<string | null>(null);
  
  // Получаем массив сезонов из конфигурации или используем значения по умолчанию
  const seasons = currentConfig.seasons || ['Весна', 'Лето', 'Осень', 'Зима'];
  const currentSeason = currentConfig.currentSeason || seasons[0];
  
  // Обработчик добавления нового сезона
  const handleAddSeason = () => {
    if (!newSeason.trim()) return;
    if (seasons.includes(newSeason)) {
      alert(`Сезон "${newSeason}" уже существует`);
      return;
    }
    
    // Создаем копию массива сезонов и добавляем новый
    const updatedSeasons = [...seasons, newSeason];
    
    // Обновляем сезонные модификаторы для категорий
    const updatedCategoryModifiers = { ...currentConfig.seasonalCategoryModifiers || {} };
    Object.keys(currentConfig.categories).forEach(category => {
      if (!updatedCategoryModifiers[category]) {
        updatedCategoryModifiers[category] = {};
      }
      updatedCategoryModifiers[category][newSeason] = 1.0; // Нейтральный модификатор
    });
    
    // Обновляем сезонные модификаторы для подтипов
    const updatedSubTypeModifiers = { ...currentConfig.seasonalSubTypeModifiers || {} };
    if (currentConfig.subTypeModifiers) {
      Object.keys(currentConfig.subTypeModifiers).forEach(subType => {
        if (!updatedSubTypeModifiers[subType]) {
          updatedSubTypeModifiers[subType] = {};
        }
        updatedSubTypeModifiers[subType][newSeason] = 1.0; // Нейтральный модификатор
      });
    }
    
    // Обновляем конфигурацию
    updateConfig({
      seasons: updatedSeasons,
      seasonalCategoryModifiers: updatedCategoryModifiers,
      seasonalSubTypeModifiers: updatedSubTypeModifiers
    });
    
    // Очищаем поле ввода
    setNewSeason('');
  };
  
  // Обработчик удаления сезона
  const handleDeleteSeason = (season: string) => {
    if (seasons.length <= 1) {
      alert('Должен оставаться хотя бы один сезон');
      return;
    }
    
    if (currentSeason === season) {
      alert('Нельзя удалить текущий сезон. Сначала переключитесь на другой сезон.');
      return;
    }
    
    // Создаем копию массива сезонов без удаляемого сезона
    const updatedSeasons = seasons.filter(s => s !== season);
    
    // Обновляем сезонные модификаторы для категорий
    const updatedCategoryModifiers = { ...currentConfig.seasonalCategoryModifiers || {} };
    Object.keys(updatedCategoryModifiers).forEach(category => {
      if (updatedCategoryModifiers[category][season]) {
        const { [season]: removed, ...rest } = updatedCategoryModifiers[category];
        updatedCategoryModifiers[category] = rest;
      }
    });
    
    // Обновляем сезонные модификаторы для подтипов
    const updatedSubTypeModifiers = { ...currentConfig.seasonalSubTypeModifiers || {} };
    Object.keys(updatedSubTypeModifiers).forEach(subType => {
      if (updatedSubTypeModifiers[subType][season]) {
        const { [season]: removed, ...rest } = updatedSubTypeModifiers[subType];
        updatedSubTypeModifiers[subType] = rest;
      }
    });
    
    // Обновляем конфигурацию
    updateConfig({
      seasons: updatedSeasons,
      seasonalCategoryModifiers: updatedCategoryModifiers,
      seasonalSubTypeModifiers: updatedSubTypeModifiers
    });
  };
  
  // Обработчик изменения текущего сезона
  const handleSeasonChange = (selectedSeason: string) => {
    setCurrentSeason(selectedSeason);
  };
  
  // Обработчик изменения модификатора категории для определенного сезона
  const handleCategoryModifierChange = (category: string, season: string, value: number) => {
    // Создаем копию модификаторов
    const updatedModifiers = { ...currentConfig.seasonalCategoryModifiers || {} };
    
    // Инициализируем объект для категории, если его нет
    if (!updatedModifiers[category]) {
      updatedModifiers[category] = {};
    }
    
    // Обновляем модификатор
    updatedModifiers[category][season] = value;
    
    // Обновляем конфигурацию
    updateConfig({ seasonalCategoryModifiers: updatedModifiers });
  };
  
  // Обработчик изменения модификатора подтипа для определенного сезона
  const handleSubTypeModifierChange = (subType: string, season: string, value: number) => {
    // Создаем копию модификаторов
    const updatedModifiers = { ...currentConfig.seasonalSubTypeModifiers || {} };
    
    // Инициализируем объект для подтипа, если его нет
    if (!updatedModifiers[subType]) {
      updatedModifiers[subType] = {};
    }
    
    // Обновляем модификатор
    updatedModifiers[subType][season] = value;
    
    // Обновляем конфигурацию
    updateConfig({ seasonalSubTypeModifiers: updatedModifiers });
  };
  
  // Получаем все категории и подтипы
  const categories = Object.keys(currentConfig.categories || {});
  const subTypes = Object.keys(currentConfig.subTypeModifiers || {});
  
  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Управление сезонами</h2>
        
        {/* Текущий сезон */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Текущий сезон</label>
          <select
            value={currentSeason || ''}
            onChange={(e) => {
              const value = e.target.value;
              handleSeasonChange(value);
            }}
            className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          >
            {seasons.map(season => (
              <option key={season} value={season}>{season}</option>
            ))}
          </select>
        </div>
        
        {/* Добавление нового сезона */}
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Добавить новый сезон</label>
          <div className="flex">
            <input
              type="text"
              value={newSeason}
              onChange={e => setNewSeason(e.target.value)}
              placeholder="Название сезона"
              className="flex-1 px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
            <button
              onClick={handleAddSeason}
              className="px-4 py-2 bg-primary text-white rounded-r-md hover:bg-opacity-90"
            >
              Добавить
            </button>
          </div>
        </div>
        
        {/* Список сезонов */}
        <div>
          <h3 className="text-sm font-medium mb-2">Список сезонов</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {seasons.map(season => (
              <div key={season} className="flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-md p-2">
                <span>{season}</span>
                <button
                  onClick={() => handleDeleteSeason(season)}
                  className="text-red-500 hover:text-red-700"
                  disabled={season === currentSeason}
                  title={season === currentSeason ? "Нельзя удалить текущий сезон" : "Удалить сезон"}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Сезонные модификаторы для категорий */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Сезонные модификаторы категорий</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
            <thead>
              <tr>
                <th className="py-2 text-left">Категория</th>
                {seasons.map(season => (
                  <th key={season} className="py-2 text-center">{season}</th>
                ))}
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {categories.map(category => (
                <tr key={category}>
                  <td className="py-2">{category}</td>
                  {seasons.map(season => {
                    const modifierValue = currentConfig.seasonalCategoryModifiers?.[category]?.[season] || 1.0;
                    
                    return (
                      <td key={season} className="py-2 text-center">
                        {editingCategory === category ? (
                          <input
                            type="number"
                            value={modifierValue}
                            onChange={e => handleCategoryModifierChange(
                              category, 
                              season, 
                              parseFloat(e.target.value)
                            )}
                            step="0.05"
                            min="0.1"
                            max="5"
                            className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                          />
                        ) : (
                          <span className={modifierValue !== 1.0 ? 'font-bold' : ''}>
                            {modifierValue.toFixed(2)}×
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-2 text-right">
                    <button
                      onClick={() => setEditingCategory(
                        editingCategory === category ? null : category
                      )}
                      className={`px-3 py-1 rounded ${
                        editingCategory === category
                          ? 'bg-green-500 text-white'
                          : 'bg-blue-500 text-white'
                      }`}
                    >
                      {editingCategory === category ? 'Готово' : 'Изменить'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Сезонные модификаторы для подтипов */}
      {subTypes.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
          <h2 className="text-lg font-semibold mb-4">Сезонные модификаторы подтипов</h2>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-600">
              <thead>
                <tr>
                  <th className="py-2 text-left">Подтип</th>
                  {seasons.map(season => (
                    <th key={season} className="py-2 text-center">{season}</th>
                  ))}
                  <th className="py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {subTypes.map(subType => (
                  <tr key={subType}>
                    <td className="py-2">{subType}</td>
                    {seasons.map(season => {
                      const modifierValue = currentConfig.seasonalSubTypeModifiers?.[subType]?.[season] || 1.0;
                      
                      return (
                        <td key={season} className="py-2 text-center">
                          {editingSubType === subType ? (
                            <input
                              type="number"
                              value={modifierValue}
                              onChange={e => handleSubTypeModifierChange(
                                subType, 
                                season, 
                                parseFloat(e.target.value)
                              )}
                              step="0.05"
                              min="0.1"
                              max="5"
                              className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded"
                            />
                          ) : (
                            <span className={modifierValue !== 1.0 ? 'font-bold' : ''}>
                              {modifierValue.toFixed(2)}×
                            </span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-2 text-right">
                      <button
                        onClick={() => setEditingSubType(
                          editingSubType === subType ? null : subType
                        )}
                        className={`px-3 py-1 rounded ${
                          editingSubType === subType
                            ? 'bg-green-500 text-white'
                            : 'bg-blue-500 text-white'
                        }`}
                      >
                        {editingSubType === subType ? 'Готово' : 'Изменить'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      {/* Настройки множителя дней роста */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
        <h2 className="text-lg font-semibold mb-4">Настройки урожая</h2>
        
        <div>
          <label className="block text-sm font-medium mb-1">Множитель дня роста урожая</label>
          <div className="flex items-center">
            <input
              type="number"
              value={currentConfig.growthDayMultiplier || 5.0}
              onChange={e => updateConfig({ 
                growthDayMultiplier: parseFloat(e.target.value) 
              })}
              step="0.5"
              min="0.5"
              className="w-24 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md"
            />
            <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
              валюты за день роста
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Этот множитель используется при расчете стоимости урожая и определяет, 
            сколько валюты добавляется к стоимости за каждый день роста.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SeasonalSettings;