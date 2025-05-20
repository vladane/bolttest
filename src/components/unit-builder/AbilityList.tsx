import { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';

export default function AbilityList() {
  const { state, updateState } = useAppState();
  const [sorting, setSorting] = useState(state.units.abilitySorting || 'name-asc');
  const [effectFilter, setEffectFilter] = useState('all');
  
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
    updateState('units.abilitySorting', newSorting);
  };
  
  // Обработчик изменения фильтра по типу эффекта
  const handleEffectFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setEffectFilter(e.target.value);
  };
  
  // Функция удаления способности
  const handleDeleteAbility = (index: number) => {
    if (confirm(`Are you sure you want to delete the ability "${state.units.abilities[index].name}"?`)) {
      const updatedAbilities = [...state.units.abilities];
      updatedAbilities.splice(index, 1);
      updateState('units.abilities', updatedAbilities);
    }
  };
  
  // Функция редактирования способности
  const handleEditAbility = (index: number) => {
    // Здесь будет реализован переход к форме редактирования способности
    alert(`Edit ability ${state.units.abilities[index].name} (to be implemented)`);
  };
  
  // Сортировка и фильтрация способностей
  let filteredAbilities = [...state.units.abilities];
  
  // Применяем фильтр по типу эффекта
  if (effectFilter !== 'all') {
    filteredAbilities = filteredAbilities.filter(ability => {
      if (!ability.effects || ability.effects.length === 0) return false;
      return ability.effects.some(effect => effect.type === effectFilter);
    });
  }
  
  // Сортировка способностей
  switch (sorting) {
    case 'name-asc':
      filteredAbilities.sort((a, b) => a.name.localeCompare(b.name));
      break;
    case 'name-desc':
      filteredAbilities.sort((a, b) => b.name.localeCompare(a.name));
      break;
    case 'type':
      filteredAbilities.sort((a, b) => a.type.localeCompare(b.type));
      break;
  }
  
  // Получение цвета типа способности
  const getAbilityTypeColor = (type: string) => {
    switch (type) {
      case 'active':
        return 'bg-blue-500';
      case 'passive':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  // Получение цвета типа эффекта
  const getEffectTypeColor = (type: string) => {
    switch (type) {
      case 'damage':
        return 'bg-red-500';
      case 'heal':
        return 'bg-green-500';
      case 'buff':
        return 'bg-blue-500';
      case 'debuff':
        return 'bg-purple-500';
      case 'shield':
        return 'bg-yellow-500';
      case 'special':
        return 'bg-indigo-500';
      default:
        return 'bg-gray-500';
    }
  };
  
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 space-y-2 sm:space-y-0">
        <h2 className="text-xl font-semibold">Ability Catalog</h2>
        
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={sorting}
            onChange={handleSortChange}
          >
            <option value="name-asc">Name (A-Z)</option>
            <option value="name-desc">Name (Z-A)</option>
            <option value="type">Type</option>
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={effectFilter}
            onChange={handleEffectFilterChange}
          >
            <option value="all">All Effects</option>
            <option value="damage">Damage</option>
            <option value="heal">Heal</option>
            <option value="buff">Buff</option>
            <option value="debuff">Debuff</option>
            <option value="shield">Shield</option>
            <option value="special">Special</option>
          </select>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAbilities.length === 0 ? (
          <p className="col-span-full text-center text-gray-500 dark:text-gray-400 py-8">
            {state.units.abilities.length === 0 
              ? 'No abilities created yet. Start by creating an ability.'
              : 'No abilities match the selected filter.'}
          </p>
        ) : (
          filteredAbilities.map((ability, index) => {
            const originalIndex = state.units.abilities.findIndex(a => a === ability);
            
            return (
              <div key={index} className="bg-white dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center mb-3">
                  <div className="h-12 w-12 bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center mr-3">
                    {ability.iconId ? (
                      <img 
                        src={getImageUrl(ability.iconId)} 
                        className="h-full w-full object-contain" 
                        alt={ability.name} 
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full w-full text-gray-400">
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold">{ability.name}</h3>
                    <div className="flex items-center">
                      <span className={`inline-block w-2 h-2 rounded-full ${getAbilityTypeColor(ability.type)} mr-1`}></span>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{ability.type}</p>
                    </div>
                  </div>
                </div>
                
                <p className="text-sm italic mb-3">{ability.description}</p>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Cooldown</span>
                    <span className="text-sm">{ability.cooldown} turns</span>
                  </div>
                  <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded">
                    <span className="block text-xs text-gray-500 dark:text-gray-400">Target</span>
                    <span className="text-sm capitalize">{ability.targetType.replace(/_/g, ' ')}</span>
                  </div>
                </div>
                
                {ability.effects && ability.effects.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Effects:</h4>
                    <div className="space-y-1">
                      {ability.effects.map((effect, effectIndex) => (
                        <div key={effectIndex} className="flex items-center">
                          <span className={`inline-block w-2 h-2 rounded-full ${getEffectTypeColor(effect.type)} mr-1`}></span>
                          <span className="text-xs capitalize">
                            {effect.type}
                            {effect.element && (
                              <span className={`ml-1 text-${effect.element}`}>({effect.element})</span>
                            )}
                            {effect.value && (
                              <span className="ml-1">{effect.value}</span>
                            )}
                            {effect.duration > 1 && (
                              <span className="ml-1">for {effect.duration} turns</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => handleEditAbility(originalIndex)}
                    className="px-3 py-1 bg-primary text-white rounded-md text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteAbility(originalIndex)}
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
    </div>
  );
}