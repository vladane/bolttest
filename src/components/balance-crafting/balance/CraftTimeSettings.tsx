import { useState, useEffect, useCallback } from 'react';
import { useBalance } from '../../../contexts/BalanceContext';

// Определяем литеральные типы для уровней сложности
type ComplexityLevel = 'Очень легко' | 'Легко' | 'Средне' | 'Сложно' | 'Очень сложно';

// Интерфейс для конфигурации времени крафта
interface CraftTimeConfig {
  baseTimesByComplexity: Record<ComplexityLevel, number>;
  ingredientBaseTime: number;
  ingredientScalingFactor: number;
  levelMultiplier: number;
  categoryTimeMultipliers: Record<string, number>;
  version?: number;
}

export default function CraftTimeSettings() {
  const { currentConfig, updateConfig } = useBalance();
  
  // Get or create craft time configuration с русскими именами полей
  const [craftTimeConfig, setCraftTimeConfig] = useState<CraftTimeConfig>({
    baseTimesByComplexity: {
      'Очень легко': 20,
      'Легко': 30,
      'Средне': 45,
      'Сложно': 60,
      'Очень сложно': 90
    },
    ingredientBaseTime: 3,
    ingredientScalingFactor: 0.7,
    levelMultiplier: 0.2,
    categoryTimeMultipliers: {}
  });
  
  // Initialize on first load
  useEffect(() => {
    if (currentConfig.craftTimeConfig) {
      setCraftTimeConfig(currentConfig.craftTimeConfig as CraftTimeConfig);
    } else {
      // Создаем мультипликаторы категорий с нужным типом
      const initialCategoryMultipliers: Record<string, number> = {};
      
      // Use existing categories from configuration
      Object.keys(currentConfig.categories || {}).forEach(category => {
        initialCategoryMultipliers[category] = 1.0;
      });
      
      const initialConfig: CraftTimeConfig = {
        baseTimesByComplexity: {
          'Очень легко': 20,
          'Легко': 30,
          'Средне': 45,
          'Сложно': 60,
          'Очень сложно': 90
        },
        ingredientBaseTime: 3,
        ingredientScalingFactor: 0.7,
        levelMultiplier: 0.2,
        categoryTimeMultipliers: initialCategoryMultipliers
      };
      
      setCraftTimeConfig(initialConfig);
      updateConfig({ craftTimeConfig: initialConfig });
    }
  }, [currentConfig.id]);
  
  // Используем debounce с типами параметров
  const debouncedUpdateConfig = useCallback(() => {
    console.log("Scheduling debounced update for craftTimeConfig");
    
    const timeoutId = setTimeout(() => {
      console.log("Applying delayed craftTimeConfig update with new version");
      updateConfig({ 
        craftTimeConfig: { 
          ...craftTimeConfig,
          version: Date.now()
        }
      });
    }, 500);
    
    return () => {
      console.log("Clearing previous craftTimeConfig update timeout");
      clearTimeout(timeoutId);
    }
  }, [craftTimeConfig, updateConfig]);
  
  useEffect(() => {
    const shouldUpdate = Object.keys(craftTimeConfig).length > 0;
    if (shouldUpdate) {
      return debouncedUpdateConfig();
    }
  }, [craftTimeConfig, debouncedUpdateConfig]);
  
  // Handler with proper types
  const handleBaseTimeChange = (complexity: ComplexityLevel, value: string) => {
    const newValue = parseInt(value);
    if (isNaN(newValue) || newValue < 0) return;
    
    setCraftTimeConfig(prev => ({
      ...prev,
      baseTimesByComplexity: {
        ...prev.baseTimesByComplexity,
        [complexity]: newValue
      }
    }));
  };
  
  // Handler with proper types
  const handleIngredientBaseTimeChange = (value: string) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue) || newValue < 0) return;
    
    setCraftTimeConfig(prev => ({
      ...prev,
      ingredientBaseTime: newValue
    }));
  };
  
  // Handler with proper types
  const handleScalingFactorChange = (value: string) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue) || newValue < 0 || newValue > 2) return;
    
    setCraftTimeConfig(prev => ({
      ...prev,
      ingredientScalingFactor: newValue
    }));
  };
  
  // Handler with proper types
  const handleLevelMultiplierChange = (value: string) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue) || newValue < -0.5 || newValue > 0.5) return;
    
    setCraftTimeConfig(prev => ({
      ...prev,
      levelMultiplier: newValue
    }));
  };
  
  // Handler with proper types
  const handleCategoryMultiplierChange = (category: string, value: string) => {
    const newValue = parseFloat(value);
    if (isNaN(newValue) || newValue < 0) return;
    
    setCraftTimeConfig(prev => ({
      ...prev,
      categoryTimeMultipliers: {
        ...prev.categoryTimeMultipliers,
        [category]: newValue
      }
    }));
  };
  
  // Manual apply function
  const handleApplyChanges = () => {
    console.log("Manually applying craftTimeConfig changes");
    updateConfig({ 
      craftTimeConfig: { 
        ...craftTimeConfig,
        version: Date.now() 
      }
    });
  };
  
  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Base Crafting Time by Complexity</h2>
        
        <div className="space-y-3">
          {Object.entries(craftTimeConfig.baseTimesByComplexity).map(([complexity, seconds]) => (
            <div key={complexity} className="flex items-center">
              <label className="w-1/2 text-sm">{complexity}</label>
              <div className="w-1/2 flex items-center">
                <input
                  type="number"
                  value={seconds}
                  onChange={(e) => handleBaseTimeChange(complexity as ComplexityLevel, e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
                />
                <span className="ml-2 text-sm">sec</span>
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Ingredient Processing Parameters</h2>
        
        <div className="space-y-3">
          <div className="flex items-center">
            <label className="w-1/2 text-sm">Base Time per Ingredient</label>
            <div className="w-1/2 flex items-center">
              <input
                type="number"
                value={craftTimeConfig.ingredientBaseTime}
                onChange={(e) => handleIngredientBaseTimeChange(e.target.value)}
                min="0"
                step="0.5"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
              <span className="ml-2 text-sm">sec</span>
            </div>
          </div>
          
          <div className="flex items-center">
            <label className="w-1/2 text-sm">Quantity Scaling Factor</label>
            <input
              type="number"
              value={craftTimeConfig.ingredientScalingFactor}
              onChange={(e) => handleScalingFactorChange(e.target.value)}
              min="0"
              max="2"
              step="0.1"
              className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">1 = linear scaling, &lt; 1 = diminishing returns</p>
        </div>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Recipe Level Impact</h2>
        
        <div className="flex items-center">
          <label className="w-1/2 text-sm">Level Multiplier</label>
          <input
            type="number"
            value={craftTimeConfig.levelMultiplier}
            onChange={(e) => handleLevelMultiplierChange(e.target.value)}
            min="-0.5"
            max="0.5"
            step="0.01"
            className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
          />
        </div>
        <p className="text-xs text-gray-500 mt-1">
          Positive value = more time with each level<br />
          Negative value = less time with each level
        </p>
      </div>
      
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Time Multipliers by Category</h2>
        
        <div className="space-y-3">
          {Object.entries(craftTimeConfig.categoryTimeMultipliers || {}).map(([category, multiplier]) => (
            <div key={category} className="flex items-center">
              <label className="w-1/2 text-sm">{category}</label>
              <input
                type="number"
                value={multiplier}
                onChange={(e) => handleCategoryMultiplierChange(category, e.target.value)}
                min="0.1"
                max="5"
                step="0.1"
                className="w-1/2 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800"
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Кнопка ручного применения */}
      <div className="flex justify-end mt-4">
        <button
          onClick={handleApplyChanges}
          className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-600 transition"
        >
          Apply Changes
        </button>
      </div>
    </div>
  );
}