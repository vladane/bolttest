import { useState } from 'react';
import MixingRecipeEditor from '../components/mixing-system/MixingRecipeEditorComponent';
import MixingRecipeList from '../components/mixing-system/MixingRecipeListComponent';
import MixingStationSimulator from '../components/mixing-system/MixingStationSimulator';
import SpoiledFoodSettings from '../components/mixing-system/SpoiledFoodSettings';

type MixingTabType = 'recipes' | 'editor' | 'simulator' | 'spoiled';

export default function MixingSystem() {
  const [activeTab, setActiveTab] = useState<MixingTabType>('recipes');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);

  // Функция для перехода к редактированию рецепта
  const handleEditRecipe = (recipeId: string) => {
    console.log('Editing recipe with ID:', recipeId);
    setEditingRecipeId(recipeId);
    setActiveTab('editor');
  };
  
  // Функция для создания нового рецепта
  const handleCreateRecipe = () => {
    console.log('Creating new recipe');
    setEditingRecipeId(null);
    setActiveTab('editor');
  };

  // Функция для завершения редактирования/создания
  const handleSaveComplete = () => {
    console.log('Save complete, returning to recipes');
    setActiveTab('recipes');
  };

  const MixingTabs = () => {
    const tabs = [
      { id: 'recipes', label: 'Рецепты' },
      { id: 'editor', label: 'Редактор' },
      { id: 'simulator', label: 'Тестирование' },
      { id: 'spoiled', label: 'Испорченная еда' }
    ];
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          {tabs.map(tab => (
            <li key={tab.id} className="mr-2">
              <button
                onClick={() => {
                  setActiveTab(tab.id as MixingTabType);
                  // Сбрасываем ID редактируемого рецепта при переключении на другие вкладки
                  if (tab.id !== 'editor') {
                    setEditingRecipeId(null);
                  }
                }}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                {tab.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold mb-6">Система Смешивания</h1>
      
      <MixingTabs />
      
      <div className="mt-6">
        {activeTab === 'recipes' && (
          <MixingRecipeList 
            onEditRecipe={handleEditRecipe}
            onCreateRecipe={handleCreateRecipe}
          />
        )}
        {activeTab === 'editor' && (
          <MixingRecipeEditor 
            editingRecipeId={editingRecipeId}
            onSaveComplete={handleSaveComplete}
          />
        )}
        {activeTab === 'simulator' && <MixingStationSimulator />}
        {activeTab === 'spoiled' && <SpoiledFoodSettings />}
      </div>
    </div>
  );
}