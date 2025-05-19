import React, { useState } from 'react';
import { ShopProvider, useShop } from '../../contexts/ShopContext';
import { Link } from 'react-router-dom';

// Импортируем компоненты для вкладок
import CurrencyManager from './CurrencyManager';
import TradingPointManager from './TradingPointManager';
import { ToastProvider } from '../common/Toast';

// Перечисление для вкладок
enum Tab {
  CURRENCIES,
  TRADING_POINTS
}

const ShopBuilderContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>(Tab.CURRENCIES);
  const { exportShopData, importShopData } = useShop();
  
  // Обработчик экспорта данных
  const handleExport = () => {
    const data = exportShopData();
    const jsonStr = JSON.stringify(data, null, 2);
    
    // Создаем Blob
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку и кликаем по ней
    const a = document.createElement('a');
    a.href = url;
    a.download = `shop_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    
    // Чистим
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };
  
  // Обработчик импорта данных
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (!target.files || target.files.length === 0) return;
      
      const file = target.files[0];
      const reader = new FileReader();
      
      reader.onload = (event) => {
        try {
          const content = event.target?.result as string;
          const data = JSON.parse(content);
          
          // Проверяем, что данные в правильном формате
          if (!data.currencies || !data.traders || !data.shops) {
            throw new Error('Некорректный формат данных');
          }
          
          importShopData(data);
          alert('Данные успешно импортированы');
        } catch (err) {
          alert(`Ошибка при импорте: ${err}`);
        }
      };
      
      reader.readAsText(file);
    };
    
    input.click();
  };
  
  return (
    <div className="container mx-auto py-6 px-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-800 dark:text-white">Shop Builder</h1>
          <Link 
            to="/" 
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Вернуться на главную
          </Link>
        </div>
        
        <div className="flex space-x-2">
          <button 
            onClick={handleExport}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
          >
            Экспорт
          </button>
          <button 
            onClick={handleImport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            Импорт
          </button>
        </div>
      </div>
      
      {/* Табы */}
      <div className="flex border-b border-gray-300 dark:border-gray-700 mb-6">
        <button
          className={`px-4 py-2 ${
            activeTab === Tab.CURRENCIES
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => setActiveTab(Tab.CURRENCIES)}
        >
          Валюты
        </button>
        <button
          className={`px-4 py-2 ${
            activeTab === Tab.TRADING_POINTS
              ? 'border-b-2 border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400 font-medium'
              : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'
          }`}
          onClick={() => setActiveTab(Tab.TRADING_POINTS)}
        >
          Торговые точки
        </button>
      </div>
      
      {/* Содержимое вкладок */}
      <div className="mt-4">
        {activeTab === Tab.CURRENCIES && <CurrencyManager />}
        {activeTab === Tab.TRADING_POINTS && <TradingPointManager />}
      </div>
    </div>
  );
};

// Обертка, предоставляющая провайдер контекста
const ShopBuilder: React.FC = () => {
  return (
    <ShopProvider>
      <ToastProvider>
        <ShopBuilderContent />
      </ToastProvider>
    </ShopProvider>
  );
};

export default ShopBuilder;