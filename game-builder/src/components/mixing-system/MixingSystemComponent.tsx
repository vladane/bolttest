import React, { useState } from 'react';
import { Tabs } from '../common/Tabs';
import MixingRecipeListComponent from './MixingRecipeListComponent';
import MixingRecipeEditorComponent from './MixingRecipeEditorComponent';
import MixingStationSimulator from './MixingStationSimulator';
import SpoiledFoodSettings from './SpoiledFoodSettings';

const MixingSystemComponent: React.FC = () => {
  const [activeTab, setActiveTab] = useState('recipes');
  const [editingRecipeId, setEditingRecipeId] = useState<string | null>(null);
  
  // Функция для перехода к редактированию рецепта
  const handleEditRecipe = (recipeId: string) => {
    console.log('===EDIT RECIPE CALLED===', recipeId);
    setEditingRecipeId(recipeId);
    setActiveTab('editor');
  };
  
  // Функция для создания нового рецепта
  const handleCreateRecipe = () => {
    setEditingRecipeId(null);
    setActiveTab('editor');
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-100">Система Смешивания</h1>
      
      <Tabs 
        tabs={[
          { id: 'recipes', label: 'Рецепты' },
          { id: 'editor', label: 'Редактор' },
          { id: 'simulator', label: 'Тестирование' },
          { id: 'spoiled', label: 'Испорченная еда' }
        ]}
        activeTab={activeTab}
        onTabChange={(tab: string) => {
          setActiveTab(tab);
          // Сбрасываем ID редактируемого рецепта при переключении на другие вкладки
          if (tab !== 'editor') {
            setEditingRecipeId(null);
          }
        }}
      />
      
      <div className="mt-4">
        {activeTab === 'recipes' && (
          <MixingRecipeListComponent 
            onEditRecipe={(id) => {
              console.log('onEditRecipe вызван с id:', id);
              handleEditRecipe(id);
            }} 
            onCreateRecipe={() => {
              console.log('onCreateRecipe вызван');
              handleCreateRecipe();
            }}
          />
        )}
        {activeTab === 'editor' && (
          <MixingRecipeEditorComponent 
            editingRecipeId={editingRecipeId}
            onSaveComplete={() => setActiveTab('recipes')}
          />
        )}
        {activeTab === 'simulator' && <MixingStationSimulator />}
        {activeTab === 'spoiled' && <SpoiledFoodSettings />}
      </div>
    </div>
  );
};

export default MixingSystemComponent;