import React from 'react';
import BalanceCraftingCenter from '../components/balance-crafting/BalanceCraftingCenter';

const BalanceCraftingPage: React.FC = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-1">
      <BalanceCraftingCenter />
    </div>
  );
};

export default BalanceCraftingPage;