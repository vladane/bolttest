import { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import UnitEquipment from './UnitEquipment';

export default function UnitList() {
  const { state, updateState } = useAppState();
  const [sorting, setSorting] = useState(state.units.sorting || 'name-asc');
  const [elementFilter, setElementFilter] = useState(state.units.elementFilter || 'all');
  
  // Добавляем состояние для модального окна экипировки
  const [equipmentModalOpen, setEquipmentModalOpen] = useState(false);
  const [selectedUnitIndex, setSelectedUnitIndex] = useState<number | null>(null);
  
  // Функция для получения URL изображения из imageMap
  const getImageUrl = (imageId: string | null) => {
    if (!imageId || !state.units.imageMap.has(imageId)) {
      return '';
    }
    
    return state.units.imageMap.get(imageId)?.data;
  };
  
  // Обработчик изменения сортировки
  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSorting = e.target.value;
    setSorting(newSorting);
    updateState('units.sorting', newSorting);
  };
  
  // Обработчик изменения фильтра по элементу
  const handleElementFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newFilter = e.target.value;
    setElementFilter(newFilter);
    updateState('units.elementFilter', newFilter);
  };
  
  // Функция удаления юнита
  const handleDeleteUnit = (index: number) => {
    if (confirm(`Are you sure you want to delete the unit "${state.units.units[index].name}"?`)) {
      const updatedUnits = [...state.units.units];
      updatedUnits.splice(index, 1);
      updateState('units.units', updatedUnits);
    }
  };
  
  // Функция для редактирования юнита
  const handleEditUnit = (index: number) => {
    // Будет реализовано позже с возможностью редактирования юнита
    alert(`Edit unit ${state.units.units[index].name} (to be implemented)`);
  };
  
  // Функция для открытия модального окна экипировки
  const handleEditEquipment = (index: number) => {
    setSelectedUnitIndex(index);
    setEquipmentModalOpen(true);
  };
  
  // Фильтрация юнитов
  let filteredUnits = [...state.units.units];
  
  // Применяем фильтр по элементу
  if (elementFilter !== 'all') {
    filteredUnits = filteredUnits.filter(unit => unit.element === elementFilter);
  }
  
  // Сортировка юнитов
  switch (sorting) {
    case 'name-asc':
      filteredUnits.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      filteredUnits.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'rarity':
      filteredUnits.sort((a, b) => {
        const aRarity = state.units.rarities.find(r => r.id === a.rarity)?.value || 0;
        const bRarity = state.units.rarities.find(r => r.id === b.rarity)?.value || 0;
        return aRarity - bRarity;
      });
      break;
    case 'rarity-desc':
      filteredUnits.sort((a, b) => {
        const aRarity = state.units.rarities.find(r => r.id === a.rarity)?.value || 0;
        const bRarity = state.units.rarities.find(r => r.id === b.rarity)?.value || 0;
        return bRarity - aRarity;
      });
      break;
  }
  
  // Расчет Dodge на основе скорости
  const calculateDodgeValue = (speed: number) => {
    if (speed <= 0) return "0.00%";
    
    // Formula: (((Speed / 100) ^ 2) - 0.1) / 5 * 100
    const speedRatio = speed / 100;
    const dodge = (((speedRatio * speedRatio) - 0.1) / 5) * 100;
    
    // Ensure dodge is not negative
    const finalDodge = Math.max(0, dodge);
    
    // Format with 2 decimal places
    return finalDodge.toFixed(2) + '%';
  };
  
  return (
    <div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 space-y-2 md:space-y-0">
        <h2 className="text-xl font-semibold">Unit Catalog</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={sorting}
            onChange={handleSortChange}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="rarity">Rarity (Low to High)</option>
            <option value="rarity-desc">Rarity (High to Low)</option>
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={elementFilter}
            onChange={handleElementFilterChange}
          >
            <option value="all">All Elements</option>
            <option value="fire">Fire</option>
            <option value="water">Water</option>
            <option value="earth">Earth</option>
            <option value="air">Air</option>
            <option value="electricity">Electricity</option>
            <option value="chaos">Chaos</option>
            <option value="order">Order</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUnits.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
            {state.units.units.length === 0 
              ? 'No units created yet. Start by creating a unit.'
              : 'No units match the selected filter.'}
          </p>
        ) : (
          filteredUnits.map((unit, index) => {
            const originalIndex = state.units.units.findIndex(u => u === unit);
            const rarityInfo = state.units.rarities.find(r => r.id === unit.rarity);
            
            return (
              <div key={index} className={`bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow unit-card-${unit.rarity}`}>
                <div className="flex items-center mb-3">
                  <div className="h-16 w-16 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center mr-3">
                    {unit.imageId ? (
                      <img 
                        src={getImageUrl(unit.imageId)} 
                        className="h-full w-full object-contain" 
                        alt={unit.name} 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-gray-400">
                        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate unit-name">{unit.name}</h3>
                    <p className={`text-sm capitalize rarity-text rarity-${unit.rarity}`}>
                      {rarityInfo?.name || unit.rarity}
                    </p>
                    <span className={`inline-block px-2 py-0.5 rounded text-xs bg-${unit.element} bg-opacity-20 text-${unit.element} mt-1`}>
                      {unit.element.charAt(0).toUpperCase() + unit.element.slice(1)}
                    </span>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 grid-rows-2 gap-2 mb-3">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Health</p>
                    <p className="font-medium">{unit.stats.health}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Speed</p>
                    <p className="font-medium">{unit.stats.speed}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Dodge</p>
                    <p className="font-medium">{calculateDodgeValue(unit.stats.speed)}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded col-span-2">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Phys Def</p>
                    <p className="font-medium">{unit.stats.physDefense}</p>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    <p className="text-xs text-gray-500 dark:text-gray-400">Magic Def</p>
                    <p className="font-medium">{unit.stats.magicDefense}</p>
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEditEquipment(originalIndex)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-md text-sm"
                  >
                    Equipment
                  </button>
                  <button
                    onClick={() => handleEditUnit(originalIndex)}
                    className="px-3 py-1 bg-primary text-white rounded-md text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteUnit(originalIndex)}
                    className="px-3 py-1 bg-red-500 text-white rounded-md text-sm"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
      
      {/* Модальное окно для управления экипировкой */}
      {equipmentModalOpen && selectedUnitIndex !== null && (
        <UnitEquipment 
          unitIndex={selectedUnitIndex} 
          onClose={() => setEquipmentModalOpen(false)}
        />
      )}
    </div>
  );
}