import { useState } from 'react';
import { BalanceProvider } from '../contexts/BalanceContext';
import ItemCostCalculator from '../components/balance-crafting/balance/ItemCostCalculator';
import BalanceParameters from '../components/balance-crafting/balance/BalanceParameters';
import ItemComparison from '../components/balance-crafting/items/ItemComparison';
import BalanceConfigs from '../components/balance-crafting/balance/BalanceConfigs';

export default function BalanceItemTool() {
  const [activeTab, setActiveTab] = useState<string>('calculator');

  return (
    <BalanceProvider>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold mb-6">Balance Item Tool</h1>
        
        <div className="border-b border-gray-200 dark:border-gray-700 mb-6">
          <ul className="flex flex-wrap -mb-px">
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('calculator')}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === 'calculator' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Item Calculator
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('parameters')}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === 'parameters' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Balance Parameters
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('comparison')}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === 'comparison' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Item Comparison
              </button>
            </li>
            <li className="mr-2">
              <button
                onClick={() => setActiveTab('configs')}
                className={`inline-block p-4 border-b-2 rounded-t-lg ${
                  activeTab === 'configs' 
                    ? 'border-primary text-primary' 
                    : 'border-transparent hover:text-primary hover:border-primary'
                }`}
              >
                Balance Configs
              </button>
            </li>
          </ul>
        </div>
        
        <div className="mt-6">
          {activeTab === 'calculator' && <ItemCostCalculator />}
          {activeTab === 'parameters' && <BalanceParameters />}
          {activeTab === 'comparison' && <ItemComparison />}
          {activeTab === 'configs' && <BalanceConfigs />}
        </div>
      </div>
    </BalanceProvider>
  );
}