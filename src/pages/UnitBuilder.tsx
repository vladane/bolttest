import { useState } from 'react';
import UnitForm from '../components/unit-builder/UnitForm';
import UnitList from '../components/unit-builder/UnitList';
import ItemForm from '../components/unit-builder/ItemForm';
import ItemList from '../components/unit-builder/ItemList';
import AbilityForm from '../components/unit-builder/AbilityForm';
import AbilityList from '../components/unit-builder/AbilityList';

// Определяем типы для табов
type TabType = 'unit-creator' | 'unit-catalog' | 'item-creator' | 'item-catalog' | 'ability-creator' | 'ability-catalog';

export default function UnitBuilder() {
  const [activeTab, setActiveTab] = useState<TabType>('unit-creator');

  // Компонент для табов
  const UnitTabs = () => {
    const tabs = [
      { id: 'unit-creator', label: 'Create Unit' },
      { id: 'unit-catalog', label: 'Units' },
      { id: 'item-creator', label: 'Create Item' },
      { id: 'item-catalog', label: 'Items' },
      { id: 'ability-creator', label: 'Create Ability' },
      { id: 'ability-catalog', label: 'Abilities' }
    ];
    
    return (
      <div className="border-b border-gray-200 dark:border-gray-700">
        <ul className="flex flex-wrap -mb-px">
          {tabs.map(tab => (
            <li key={tab.id} className="mr-2">
              <button
                onClick={() => setActiveTab(tab.id as TabType)}
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
      <h1 className="text-2xl font-bold mb-6">Unit Builder</h1>
      
      <UnitTabs />
      
      <div className="mt-6">
        {activeTab === 'unit-creator' && <UnitForm />}
        {activeTab === 'unit-catalog' && <UnitList />}
        {activeTab === 'item-creator' && <ItemForm />}
        {activeTab === 'item-catalog' && <ItemList />}
        {activeTab === 'ability-creator' && <AbilityForm />}
        {activeTab === 'ability-catalog' && <AbilityList />}
      </div>
    </div>
  );
}