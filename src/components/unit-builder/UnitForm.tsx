import { useState, useEffect } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import ImageUpload from '../common/ImageUpload';

interface UnitFormData {
  name: string;
  rarity: string;
  element: string;
  health: string;
  physDefense: string;
  magicDefense: string;
  speed: string;
  imageId: string | null;
  abilities: number[];
  gearRequirements: Record<string, number[]>;
}

// Функция для получения цвета в зависимости от редкости
const getRarityColor = (rarity: string): string => {
  switch (rarity?.toLowerCase()) {
    case 'common':
      return 'text-gray-400 dark:text-gray-300';
    case 'uncommon':
      return 'text-green-500 dark:text-green-400';
    case 'rare':
      return 'text-blue-500 dark:text-blue-400';
    case 'exotic':
      return 'text-purple-500 dark:text-purple-400';
    case 'epic':
      return 'text-pink-500 dark:text-pink-400';
    case 'mythical':
      return 'text-yellow-600 dark:text-yellow-500';
    case 'legendary':
      return 'text-amber-500 dark:text-amber-400';
    case 'relic':
      return 'text-red-600 dark:text-red-500';
    case 'immortal':
      return 'text-cyan-500 dark:text-cyan-400';
    case 'ancient':
      return 'text-teal-600 dark:text-teal-500';
    default:
      return 'text-gray-500 dark:text-gray-400';
  }
};

export default function UnitForm() {
  const { state, updateState } = useAppState();
  const [formData, setFormData] = useState<UnitFormData>({
    name: '',
    rarity: 'common',
    element: '',
    health: '',
    physDefense: '',
    magicDefense: '',
    speed: '',
    imageId: null,
    abilities: [],
    gearRequirements: {}
  });
  
  // Состояние для выбора способностей и предметов
  const [selectedAbility, setSelectedAbility] = useState<number>(-1);
  const [selectedGearLevel, setSelectedGearLevel] = useState<string>('');

  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  const [dodgeValue, setDodgeValue] = useState('0.00%');
  
  // Функция для расчета dodge на основе скорости
  const calculateDodge = (speed: number) => {
    if (speed <= 0) return '0.00%';
    
    // Formula: (((Speed / 100) ^ 2) - 0.1) / 5 * 100
    const speedRatio = speed / 100;
    const dodge = (((speedRatio * speedRatio) - 0.1) / 5) * 100;
    
    // Ensure dodge is not negative
    const finalDodge = Math.max(0, dodge);
    
    // Format with 2 decimal places
    return finalDodge.toFixed(2) + '%';
  };
  
  // Обновление dodge при изменении скорости
  useEffect(() => {
    const speed = parseFloat(formData.speed) || 0;
    setDodgeValue(calculateDodge(speed));
  }, [formData.speed]);
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очищаем сообщения об ошибках при изменении данных
    if (error) setError(null);
  };
  
  // Обработчик изображения
  const handleImageUpload = (imageId: string) => {
    setFormData(prev => ({ ...prev, imageId }));
  };
  
  // Функции для работы со способностями
  const addAbility = () => {
    if (selectedAbility === -1) return;
    
    // Проверяем, не добавлена ли уже эта способность
    if (formData.abilities.includes(selectedAbility)) {
      setError("This ability is already added");
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      abilities: [...prev.abilities, selectedAbility]
    }));
    
    setSelectedAbility(-1);
  };
  
  const removeAbility = (abilityIndex: number) => {
    setFormData(prev => ({
      ...prev,
      abilities: prev.abilities.filter((_, i) => i !== abilityIndex)
    }));
  };
  
  
  // Валидация формы
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Please enter a unit name');
      return false;
    }
    
    if (!formData.element) {
      setError('Please select an element');
      return false;
    }
    
    const health = parseInt(formData.health);
    if (isNaN(health) || health <= 0) {
      setError('Health must be greater than 0');
      return false;
    }
    
    const speed = parseFloat(formData.speed);
    if (isNaN(speed) || speed <= 0) {
      setError('Speed must be greater than 0');
      return false;
    }
    
    if (speed > 100) {
      setError('Speed cannot be greater than 100');
      return false;
    }
    
    return true;
  };
  
  // Обработчик отправки формы
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    // Создание объекта юнита
    const unit = {
      name: formData.name.trim(),
      rarity: formData.rarity,
      element: formData.element,
      stats: {
        health: parseInt(formData.health) || 0,
        physDefense: parseInt(formData.physDefense) || 0,
        magicDefense: parseInt(formData.magicDefense) || 0,
        speed: parseFloat(formData.speed) || 0
      },
      imageId: formData.imageId,
      abilities: formData.abilities,
      gearRequirements: formData.gearRequirements,
      equipment: {} // Сохраняем пустой объект для совместимости
    };
    
    // Обновление или создание юнита
    if (isEditing && editingIndex >= 0) {
      // Создаем копию массива юнитов
      const updatedUnits = [...state.units.units];
      updatedUnits[editingIndex] = unit;
      
      // Обновляем состояние
      updateState('units.units', updatedUnits);
      setSuccess('Unit updated successfully!');
    } else {
      // Добавляем новый юнит
      updateState('units.units', [...state.units.units, unit]);
      setSuccess('Unit created successfully!');
    }
    
    // Очищаем форму
    clearForm();
  };
  
  // Функция очистки формы
  const clearForm = () => {
    setFormData({
      name: '',
      rarity: 'common',
      element: '',
      health: '',
      physDefense: '',
      magicDefense: '',
      speed: '',
      imageId: null,
      abilities: [],
      gearRequirements: {
        'Gear Common 1': [],
        'Gear Common 2': [],
        'Gear Uncommon 1': [],
        'Gear Uncommon 2': [],
        'Gear Uncommon 3': [],
        'Gear Rare 1': [],
        'Gear Rare 2': [],
        'Gear Rare 3': [],
        'Gear Exotic 1': [],
        'Gear Exotic 2': [],
        'Gear Exotic 3': [],
        'Gear Exotic 4': [],
        'Gear Epic 1': [],
        'Gear Epic 2': [],
        'Gear Epic 3': [],
        'Gear Epic 4': [],
        'Gear Mythical 1': [],
        'Gear Mythical 2': [],
        'Gear Mythical 3': [],
        'Gear Mythical 4': [],
        'Gear Mythical 5': [],
        'Gear Legendary 1': [],
        'Gear Legendary 2': [],
        'Gear Legendary 3': [],
        'Gear Legendary 4': [],
        'Gear Legendary 5': [],
        'Gear Relic 1': [],
        'Gear Relic 2': [],
        'Gear Relic 3': [],
        'Gear Relic 4': [],
        'Gear Immortal 1': [],
        'Gear Immortal 2': [],
        'Gear Immortal 3': [],
        'Gear Ancient 1': [],
        'Gear Ancient 2': [],
        'Gear Ancient 3': []
      }
    });
    
    setIsEditing(false);
    setEditingIndex(-1);
    setDodgeValue('0.00%');
    setSelectedAbility(-1);
  };
  
  // Получение имени способности по индексу
  const getAbilityName = (abilityIndex: number) => {
    return state.units.abilities[abilityIndex]?.name || "Unknown Ability";
  };
  
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Unit' : 'Create Unit'}
      </h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {success}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-text"
            placeholder="Enter unit name"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Rarity</label>
            <select
              name="rarity"
              value={formData.rarity}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              {state.units.rarities.map(rarity => (
                <option 
                  key={rarity.id} 
                  value={rarity.id}
                  className={`rarity-${rarity.id}`}
                >
                  {rarity.name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Element</label>
            <select
              name="element"
              value={formData.element}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              <option value="">Select element</option>
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
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Health</label>
            <input
              type="number"
              name="health"
              value={formData.health}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-text"
              placeholder="Health points"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Speed</label>
            <input
              type="number"
              name="speed"
              value={formData.speed}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-text"
              placeholder="Speed value"
              step="0.1"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Physical Defense</label>
            <input
              type="number"
              name="physDefense"
              value={formData.physDefense}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-text"
              placeholder="Physical defense"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Magic Defense</label>
            <input
              type="number"
              name="magicDefense"
              value={formData.magicDefense}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-text"
              placeholder="Magic defense"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Dodge (calculated)</label>
          <input
            type="text"
            value={dodgeValue}
            readOnly
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md cursor-not-allowed text-gray-700 dark:text-gray-300"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Unit Image</label>
          <ImageUpload 
            onImageUpload={handleImageUpload} 
            currentImageId={formData.imageId}
            size="lg"
          />
        </div>
        
        {/* Секция Abilities */}
        <div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
          <h3 className="text-lg font-medium mb-3">Abilities</h3>
          
          <div className="flex space-x-2 mb-3">
            <select
              value={selectedAbility}
              onChange={(e) => setSelectedAbility(parseInt(e.target.value))}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 cursor-pointer"
            >
              <option value="-1">Select an ability</option>
              {state.units.abilities.map((ability, index) => (
                <option key={index} value={index}>
                  {ability.name}
                </option>
              ))}
            </select>
            
            <button
              type="button"
              onClick={addAbility}
              disabled={selectedAbility === -1}
              className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
            >
              Add
            </button>
          </div>
          
          {formData.abilities.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-2">
              No abilities added yet
            </p>
          ) : (
            <div className="space-y-2">
              {formData.abilities.map((abilityIndex, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-800 p-2 rounded">
                  <span>{getAbilityName(abilityIndex)}</span>
                  <button
                    type="button"
                    onClick={() => removeAbility(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        
{/* Секция Gear Requirements */}
<div className="border border-gray-200 dark:border-gray-700 rounded-md p-4">
  <h3 className="text-lg font-medium mb-3">Gear Requirements (Optional)</h3>
  <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
    Define what items are required for each gear level of this unit.
  </p>
  
  {/* Селектор уровня и кнопка добавления */}
  <div className="flex items-end gap-2 mb-6">
    <div className="flex-1">
      <label className="block text-sm font-medium mb-1">Select Gear Level:</label>
      <select
        value={selectedGearLevel}
        onChange={(e) => setSelectedGearLevel(e.target.value)}
        className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md"
      >
        <option value="">-- Select Gear Level --</option>
        {[
          'Gear Common 1', 
          'Gear Common 2',
          'Gear Uncommon 1',
          'Gear Uncommon 2',
          'Gear Uncommon 3',
          'Gear Rare 1',
          'Gear Rare 2',
          'Gear Rare 3',
          'Gear Exotic 1',
          'Gear Exotic 2',
          'Gear Exotic 3',
          'Gear Exotic 4',
          'Gear Epic 1',
          'Gear Epic 2',
          'Gear Epic 3',
          'Gear Epic 4',
          'Gear Mythical 1',
          'Gear Mythical 2',
          'Gear Mythical 3',
          'Gear Mythical 4',
          'Gear Mythical 5',
          'Gear Legendary 1',
          'Gear Legendary 2',
          'Gear Legendary 3',
          'Gear Legendary 4',
          'Gear Legendary 5',
          'Gear Relic 1',
          'Gear Relic 2',
          'Gear Relic 3',
          'Gear Relic 4',
          'Gear Immortal 1',
          'Gear Immortal 2',
          'Gear Immortal 3',
          'Gear Ancient 1',
          'Gear Ancient 2',
          'Gear Ancient 3'
        ].map(level => (
          <option key={level} value={level}>{level}</option>
        ))}
      </select>
    </div>
    <button
      type="button"
      onClick={() => {
        if (selectedGearLevel) {
          // Создаем новый объект с требованиями снаряжения
          const updatedRequirements = { ...formData.gearRequirements };
          // Инициализируем выбранный уровень, если его еще нет
          if (!updatedRequirements[selectedGearLevel]) {
            updatedRequirements[selectedGearLevel] = [];
          }
          
          setFormData(prev => ({
            ...prev,
            gearRequirements: updatedRequirements
          }));
          
          // Сбрасываем выбранный уровень
          setSelectedGearLevel('');
        }
      }}
      disabled={!selectedGearLevel}
      className={`px-4 py-2 rounded-md ${
        !selectedGearLevel
          ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
          : 'bg-primary text-white hover:bg-opacity-90'
      }`}
    >
      Add Level
    </button>
  </div>
  
  {/* Список добавленных уровней с аккордеоном */}
  <div className="space-y-4">
    {Object.keys(formData.gearRequirements).length === 0 ? (
      <div className="p-6 text-center bg-gray-50 dark:bg-gray-800 rounded-md text-gray-500 dark:text-gray-400">
        No gear requirements defined
      </div>
    ) : (
      Object.entries(formData.gearRequirements).map(([gearLevel, selectedItems]) => {
        // Проверяем, развернут ли текущий уровень
        const isExpanded = selectedGearLevel === gearLevel;
        
        return (
          <div key={gearLevel} className="bg-gray-50 dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
            {/* Заголовок уровня */}
            <div 
              className="flex justify-between items-center p-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
              onClick={() => setSelectedGearLevel(isExpanded ? '' : gearLevel)}
            >
              <h4 className="font-medium flex items-center">
                <span className={`mr-2 transform transition-transform ${isExpanded ? 'rotate-90' : ''}`}>
                  ▶
                </span>
                {gearLevel}
              </h4>
              
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedItems.length} item(s)
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Удаляем уровень
                    const { [gearLevel]: _, ...restRequirements } = formData.gearRequirements;
                    setFormData(prev => ({
                      ...prev,
                      gearRequirements: restRequirements
                    }));
                    
                    if (selectedGearLevel === gearLevel) {
                      setSelectedGearLevel('');
                    }
                  }}
                  className="text-red-500 hover:text-red-700 p-1"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            {/* Содержимое уровня (отображается только когда развернуто) */}
            {isExpanded && (
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                {state.units.items.length === 0 ? (
                  <p className="text-center text-gray-500 dark:text-gray-400 py-2">
                    No items available. Create some items first.
                  </p>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                    {state.units.items.map((item, itemIndex) => {
                      // Проверяем, выбран ли этот предмет для данного уровня
                      const isSelected = selectedItems.includes(itemIndex);
                      
                      return (
                        <div key={itemIndex} className="flex items-center p-2 border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700">
                          <input
                            type="checkbox"
                            id={`${gearLevel}-item-${itemIndex}`}
                            checked={isSelected}
                            onChange={() => {
                              // Добавляем или удаляем предмет из списка
                              const updatedRequirements = { ...formData.gearRequirements };
                              
                              if (isSelected) {
                                // Если уже выбран - удалить
                                updatedRequirements[gearLevel] = updatedRequirements[gearLevel]
                                  .filter(idx => idx !== itemIndex);
                              } else {
                                // Если не выбран - добавить
                                updatedRequirements[gearLevel] = [
                                  ...updatedRequirements[gearLevel],
                                  itemIndex
                                ];
                              }
                              
                              setFormData(prev => ({
                                ...prev,
                                gearRequirements: updatedRequirements
                              }));
                            }}
                            className="form-checkbox h-4 w-4 text-primary rounded"
                          />
                          
                          <div className="flex items-center ml-2 flex-1">
                            {/* Изображение предмета */}
                            <div className="h-10 w-10 flex-shrink-0 mr-3 bg-gray-200 dark:bg-gray-600 rounded-md overflow-hidden">
                              {item.imageId && state.units.imageMap.get(item.imageId) ? (
                                <img 
                                  src={item.imageId && state.units.imageMap.get(item.imageId)?.data}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex items-center justify-center h-full w-full">
                                  <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            
                            {/* Информация о предмете */}
                            <div>
                              <label
                                htmlFor={`${gearLevel}-item-${itemIndex}`}
                                className="block text-sm font-medium cursor-pointer"
                              >
                                {item.name}
                              </label>
                              <span className={`text-xs ${getRarityColor(item.rarity)}`}>
                                {item.rarity}
                              </span>
                              {item.slotType && (
                                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                  ({item.slotType})
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })
    )}
  </div>
</div>
        
        <div className="flex justify-end space-x-2">
          {isEditing && (
            <button
              type="button"
              onClick={() => {
                setIsEditing(false);
                setEditingIndex(-1);
                clearForm();
              }}
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={clearForm}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
          >
            Clear
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            {isEditing ? 'Update' : 'Create'} Unit
          </button>
        </div>
      </form>
    </div>
  );
}