import { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';

export default function ItemList() {
  const { state, updateState } = useAppState();
  const [sorting, setSorting] = useState(state.units.itemSorting || 'name-asc');
  
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
    updateState('units.itemSorting', newSorting);
  };
  
  // Функция удаления предмета
  const handleDeleteItem = (index: number) => {
    if (confirm(`Are you sure you want to delete the item "${state.units.items[index].name}"?`)) {
      // Проверяем, используется ли предмет в требованиях снаряжения юнитов
      let isUsed = false;
      
      state.units.units.forEach(unit => {
        if (unit.gearRequirements) {
          for (const items of Object.values(unit.gearRequirements)) {
            if (Array.isArray(items) && items.includes(index)) {
              isUsed = true;
              break;
            }
          }
        }
      });
      
      if (isUsed) {
        alert('This item is used by one or more units and cannot be deleted.');
        return;
      }
      
      // Безопасно удаляем предмет
      const updatedItems = [...state.units.items];
      updatedItems.splice(index, 1);
      updateState('units.items', updatedItems);
    }
  };
  
  // Функция редактирования предмета
  const handleEditItem = (index: number) => {
    // Здесь будет реализован переход к форме редактирования предмета
    // Для этого нужно будет добавить функционал в родительский компонент UnitBuilder
    alert(`Edit item ${state.units.items[index].name} (to be implemented)`);
  };
  
  // Сортировка предметов
  let sortedItems = [...state.units.items];
  
  switch (sorting) {
    case 'name-asc':
      sortedItems.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      sortedItems.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'rarity':
      sortedItems.sort((a, b) => {
        const aRarity = state.units.rarities.find(r => r.id === a.rarity)?.value || 0;
        const bRarity = state.units.rarities.find(r => r.id === b.rarity)?.value || 0;
        return aRarity - bRarity;
      });
      break;
    case 'rarity-desc':
      sortedItems.sort((a, b) => {
        const aRarity = state.units.rarities.find(r => r.id === a.rarity)?.value || 0;
        const bRarity = state.units.rarities.find(r => r.id === b.rarity)?.value || 0;
        return bRarity - aRarity;
      });
      break;
  }
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold">Item Catalog</h2>
        
        <div className="flex space-x-2">
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
        </div>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sortedItems.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
            No items created yet. Start by creating an item.
          </p>
        ) : (
          sortedItems.map((item, index) => {
            const originalIndex = state.units.items.findIndex(i => i === item);
            const rarityInfo = state.units.rarities.find(r => r.id === item.rarity);
            
            return (
              <div 
                key={index} 
                className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow flex flex-col items-center text-center"
              >
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center mb-3">
                  {item.imageId ? (
                    <img 
                      src={getImageUrl(item.imageId)} 
                      className="h-full w-full object-contain" 
                      alt={item.name} 
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full w-full text-gray-400">
                      <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                </div>
                
                <h3 className="font-medium">{item.name}</h3>
                <p className={`text-sm capitalize ${rarityInfo ? `text-${item.rarity}` : ''}`}>
                  {rarityInfo?.name || item.rarity}
                </p>
                
                <div className="flex justify-center space-x-2 mt-3">
                  <button
                    onClick={() => handleEditItem(originalIndex)}
                    className="px-2 py-1 bg-primary text-white rounded text-xs"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteItem(originalIndex)}
                    className="px-2 py-1 bg-red-500 text-white rounded text-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}