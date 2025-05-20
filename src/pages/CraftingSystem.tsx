import { useState } from 'react';
import { useAppState } from '../contexts/AppStateContext';
import RecipeList from '../components/balance-crafting/crafting/RecipeList';
import RecipeForm from '../components/balance-crafting/crafting/RecipeForm';
import RecipeAnalysis from '../components/balance-crafting/crafting/RecipeAnalysis';
import CraftingTree from '../components/balance-crafting/crafting/CraftingTree';

export default function CraftingSystem() {
  const [activeTab, setActiveTab] = useState('recipes'); // recipes, analysis, tree
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const { state } = useAppState();
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Crafting System</h1>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('recipes')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'recipes' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Recipes
          </button>
          <button
            onClick={() => setActiveTab('analysis')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'analysis' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Analysis
          </button>
          <button
            onClick={() => setActiveTab('tree')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'tree' 
                ? 'bg-primary text-white' 
                : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}
          >
            Crafting Tree
          </button>
        </div>
      </div>
      
      {activeTab === 'recipes' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <RecipeList 
              recipes={state.craftSystem.recipes} 
              onSelectRecipe={setSelectedRecipeId}
              selectedRecipeId={selectedRecipeId}
            />
          </div>
          <div className="lg:col-span-2">
            <RecipeForm 
              selectedRecipeId={selectedRecipeId}
              onRecipeSaved={() => setSelectedRecipeId(null)}
            />
          </div>
        </div>
      )}
      
      {activeTab === 'analysis' && (
        <RecipeAnalysis />
      )}
      
      {activeTab === 'tree' && (
        <CraftingTree />
      )}
    </div>
  );
}