// src/components/balance-crafting/BalanceCraftingCenter.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BalanceParameters from './balance/BalanceParameters';
import BalanceConfigs from './balance/BalanceConfigs';
import RecipeList from './crafting/RecipeList';
import RecipeForm from './crafting/RecipeForm';
import RecipeAnalysis from './crafting/RecipeAnalysis';
import CraftingTree from './crafting/CraftingTree';
import ItemList from './items/ItemList';
import ItemEditor from './items/ItemEditor';
import ItemComparison from './items/ItemComparison';
import { ItemData } from '../../contexts/BalanceContext';
import { useAppState } from '../../contexts/AppStateContext';

// Добавим глобальную функцию переключения вкладок для прямого доступа
declare global {
  interface Window {
    switchTabDirectly?: (tab: string, subTab: string, data?: any) => void;
  }
}

const BalanceCraftingCenter: React.FC = () => {
  const { state, updateState } = useAppState();
  
  // Основные вкладки верхнего уровня
  type MainTab = 'items' | 'recipes' | 'balance' | 'analysis';
  
  // Вложенные вкладки
  const subTabs = {
    items: ['list', 'editor', 'comparison'] as const,
    recipes: ['list', 'editor', 'tree'] as const,
    balance: ['parameters', 'configs'] as const,
    analysis: ['items', 'recipes'] as const
  };
  
  type SubTabName<T extends MainTab> = typeof subTabs[T][number];
  
  // Состояние активных вкладок
  const [activeTab, setActiveTab] = useState<MainTab>('items');
  const [activeSubTabs, setActiveSubTabs] = useState<{
    [K in MainTab]: SubTabName<K>;
  }>({
    items: 'list',
    recipes: 'list',
    balance: 'parameters',
    analysis: 'items'
  });
  
  // Добавляем состояние для хранения выбранного предмета
  const [selectedItem, setSelectedItem] = useState<ItemData | null>(null);
  
  // Добавляем состояние для хранения выбранного рецепта
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  
  // Функция для установки активной подвкладки
  const setSubTab = <T extends MainTab>(tab: T, subTab: SubTabName<T>) => {
    setActiveSubTabs(prev => ({
      ...prev,
      [tab]: subTab
    }));
  };
  
  // Перемещение по URL для поддержки закладок
  const navigate = useNavigate();
  
  // При изменении активной вкладки обновляем URL
  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab);
    navigate(`/balance-crafting/${tab}/${activeSubTabs[tab]}`);
  };
  
  // При изменении подвкладки обновляем URL
  const handleSubTabChange = <T extends MainTab>(tab: T, subTab: SubTabName<T>) => {
    setSubTab(tab, subTab);
    if (tab === activeTab) {
      navigate(`/balance-crafting/${tab}/${subTab}`);
    }
  };
  
  // Добавление функции для глобального доступа
  window.switchTabDirectly = (tab, subTab, data) => {
    if (tab === 'items' && subTab === 'editor') {
      setSelectedItem(data || null);
    } else if (tab === 'recipes' && subTab === 'editor') {
      setSelectedRecipeId(data || null);
    }
    
    setActiveTab(tab as MainTab);
    setSubTab(tab as MainTab, subTab as any);
    navigate(`/balance-crafting/${tab}/${subTab}`);
  };
  
  // Обработчики для ItemList
  const handleCreateItem = () => {
    setSelectedItem(null); // Новый предмет, поэтому null
    handleSubTabChange('items', 'editor');
  };
  
  const handleEditItem = (item: ItemData) => {
    setSelectedItem(item);
    handleSubTabChange('items', 'editor');
  };
  
  // Новый обработчик дублирования предмета
  const handleDuplicateItem = (item: ItemData) => {
    // Создаем копию предмета с пустым названием
    const duplicatedItem: ItemData = {
      ...item,
      name: '', // Очищаем название для соблюдения требования
    };
    
    // Устанавливаем дубликат как выбранный предмет
    setSelectedItem(duplicatedItem);
    
    // Переключаемся на редактор
    handleSubTabChange('items', 'editor');
  };
  
  // Обработчик удаления предмета
  const handleDeleteItem = (item: ItemData) => {
    // Удаляем предмет из списка
    const updatedItems = state.balance.comparisonItems.filter(i => i.name !== item.name);
    updateState('balance', {
      ...state.balance,
      comparisonItems: updatedItems
    });
  };
  
  // Обработчики для RecipeList
  const handleCreateRecipe = () => {
    setSelectedRecipeId(null); // Новый рецепт, поэтому null
    handleSubTabChange('recipes', 'editor');
  };
  
  const handleSelectRecipe = (recipeId: string) => {
    // Если передана пустая строка, значит нажали кнопку New Recipe
    if (recipeId === '') {
      handleCreateRecipe();
      return;
    }
    
    setSelectedRecipeId(recipeId);
    handleSubTabChange('recipes', 'editor');
  };
  
  // Обработчик сохранения рецепта
  const handleRecipeSaved = () => {
    // Возвращаемся к списку рецептов
    handleSubTabChange('recipes', 'list');
    // Сбрасываем выбранный рецепт
    setSelectedRecipeId(null);
  };
  
  // Функция для рендера контента в зависимости от активных вкладок
  const renderContent = () => {
    switch (activeTab) {
      case 'items':
        switch (activeSubTabs.items) {
          case 'list':
            return (
              <ItemList 
                onCreateItem={handleCreateItem}
                onEditItem={handleEditItem}
                onDeleteItem={handleDeleteItem}
                onDuplicateItem={handleDuplicateItem}
              />
            );
          case 'editor':
            return (
              <ItemEditor 
                itemToEdit={selectedItem}
                onBack={() => handleSubTabChange('items', 'list')}
              />
            );
          case 'comparison':
            return <ItemComparison />;
          default:
            return null;
        }
      
      case 'recipes':
        switch (activeSubTabs.recipes) {
          case 'list':
            return (
              <RecipeList
                onSelectRecipe={handleSelectRecipe}
                selectedRecipeId={activeSubTabs.recipes === 'list' ? null : selectedRecipeId}
              />
            );
          case 'editor':
            return (
              <RecipeForm 
                selectedRecipeId={selectedRecipeId} 
                onRecipeSaved={handleRecipeSaved} 
              />
            );
          case 'tree':
            return <CraftingTree />;
          default:
            return null;
        }
    
      case 'balance':
        switch (activeSubTabs.balance) {
          case 'parameters':
            return <BalanceParameters />;
          case 'configs':
            return <BalanceConfigs />;
          default:
            return null;
        }
    
      case 'analysis':
        switch (activeSubTabs.analysis) {
          case 'items':
            return <ItemComparison />;
          case 'recipes':
            return <RecipeAnalysis />;
          default:
            return null;
        }
      
      default:
        return <div>Default content</div>;
    }
  };
  
  return (
    <div className="flex flex-col h-full">
      {/* Верхнее навигационное меню */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1 p-2">
          <button
            onClick={() => handleTabChange('items')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === 'items'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Предметы
          </button>
          <button
            onClick={() => handleTabChange('recipes')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === 'recipes'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Рецепты
          </button>
          <button
            onClick={() => handleTabChange('balance')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === 'balance'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Баланс
          </button>
          <button
            onClick={() => handleTabChange('analysis')}
            className={`px-4 py-2 rounded-t-lg text-sm font-medium ${
              activeTab === 'analysis'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Анализ
          </button>
        </div>
      </div>
      
      {/* Подвкладки */}
      <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700 px-4">
        {activeTab === 'items' && (
          <div className="flex space-x-4 py-2">
            {subTabs.items.map(subTab => (
              <button
                key={subTab}
                onClick={() => handleSubTabChange('items', subTab)}
                className={`px-3 py-1 text-sm ${
                  activeSubTabs.items === subTab
                    ? 'text-primary font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
                }`}
              >
                {subTab === 'list' ? 'Список предметов' :
                 subTab === 'editor' ? 'Редактор предметов' :
                 subTab === 'comparison' ? 'Сравнение предметов' : subTab}
              </button>
            ))}
          </div>
        )}
        
        {activeTab === 'recipes' && (
          <div className="flex space-x-4 py-2">
            {subTabs.recipes.map(subTab => (
              <button
                key={subTab}
                onClick={() => handleSubTabChange('recipes', subTab)}
                className={`px-3 py-1 text-sm ${
                  activeSubTabs.recipes === subTab
                    ? 'text-primary font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
                }`}
              >
                {subTab === 'list' ? 'Список рецептов' :
                 subTab === 'editor' ? 'Редактор рецептов' :
                 subTab === 'tree' ? 'Дерево крафта' : subTab}
              </button>
            ))}
          </div>
        )}
        
        {activeTab === 'balance' && (
          <div className="flex space-x-4 py-2">
            {subTabs.balance.map(subTab => (
              <button
                key={subTab}
                onClick={() => handleSubTabChange('balance', subTab)}
                className={`px-3 py-1 text-sm ${
                  activeSubTabs.balance === subTab
                    ? 'text-primary font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
                }`}
              >
                {subTab === 'parameters' ? 'Параметры баланса' :
                 subTab === 'configs' ? 'Конфигурации' : subTab}
              </button>
            ))}
          </div>
        )}
        
        {activeTab === 'analysis' && (
          <div className="flex space-x-4 py-2">
            {subTabs.analysis.map(subTab => (
              <button
                key={subTab}
                onClick={() => handleSubTabChange('analysis', subTab)}
                className={`px-3 py-1 text-sm ${
                  activeSubTabs.analysis === subTab
                    ? 'text-primary font-medium'
                    : 'text-gray-600 dark:text-gray-400 hover:text-primary dark:hover:text-primary'
                }`}
              >
                {subTab === 'items' ? 'Анализ предметов' :
                 subTab === 'recipes' ? 'Анализ рецептов' : subTab}
              </button>
            ))}
          </div>
        )}
      </div>
      
      {/* Основное содержимое */}
      <div className="flex-1 p-4 bg-gray-100 dark:bg-gray-800 overflow-auto">
        {renderContent()}
      </div>
    </div>
  );
};

export default BalanceCraftingCenter;