import { useState } from 'react';
import { useAppState, Item } from '../../contexts/AppStateContext';

// Определение перечисления для типов слотов
enum EquipmentSlotType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  HELMET = 'helmet',
  GLOVES = 'gloves',
  BOOTS = 'boots',
  ACCESSORY = 'accessory',
  HEAD = 'head',      
  BODY = 'body',      
  OFF_HAND = 'offHand'
}

interface UnitEquipmentProps {
  unitIndex: number;
  onClose: () => void;
}

export default function UnitEquipment({ unitIndex, onClose }: UnitEquipmentProps) {
  const { state, updateState } = useAppState();
  const unit = state.units.units[unitIndex];
  
  // Инициализируем состояние экипировки из юнита или создаем пустой объект
  const [equipment, setEquipment] = useState<Record<string, number | null>>(
    unit.equipment || {
      [EquipmentSlotType.HEAD]: null,
      [EquipmentSlotType.BODY]: null,
      [EquipmentSlotType.WEAPON]: null,
      [EquipmentSlotType.OFF_HAND]: null,
      [EquipmentSlotType.ACCESSORY]: null
    }
  );

  // Функция для получения URL изображения
  const getImageUrl = (imageId: string | null) => {
    if (!imageId || !state.units.imageMap.has(imageId)) {
      return '';
    }
    return state.units.imageMap.get(imageId)?.data;
  };

  // Функция для получения предметов для определенного слота
  const getItemsForSlot = (slotType: string): Item[] => {
    return state.units.items.filter(item => item.slotType === slotType);
  };

  // Обработчик изменения экипированного предмета
  const handleEquipItem = (slotType: string, itemIndex: number | null) => {
    setEquipment(prev => ({
      ...prev,
      [slotType]: itemIndex
    }));
  };

  // Обработчик сохранения экипировки
  const handleSave = () => {
    const updatedUnits = [...state.units.units];
    updatedUnits[unitIndex] = {
      ...updatedUnits[unitIndex],
      equipment
    };
    updateState('units.units', updatedUnits);
    onClose();
  };

  // Получаем название для слота
  const getSlotName = (slotType: string): string => {
    const names: Record<string, string> = {
      [EquipmentSlotType.HEAD]: 'Head',
      [EquipmentSlotType.BODY]: 'Body',
      [EquipmentSlotType.WEAPON]: 'Weapon',
      [EquipmentSlotType.OFF_HAND]: 'Off Hand',
      [EquipmentSlotType.ACCESSORY]: 'Accessory',
      // Добавляем остальные слоты, если они используются
      [EquipmentSlotType.HELMET]: 'Helmet',
      [EquipmentSlotType.ARMOR]: 'Armor',
      [EquipmentSlotType.GLOVES]: 'Gloves',
      [EquipmentSlotType.BOOTS]: 'Boots'
    };
    return names[slotType] || slotType; // Возвращаем имя слота или сам слот, если имя не найдено
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Equipment: {unit.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.values(EquipmentSlotType).map((slotType: string) => (
              <div key={slotType} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <h3 className="text-sm font-medium mb-2">{getSlotName(slotType)}</h3>
                
                <div className="flex items-center mb-2">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-600 rounded-md overflow-hidden mr-3">
                    {equipment[slotType] !== null && equipment[slotType] !== undefined && (
                      <img 
                        src={getImageUrl(state.units.items[equipment[slotType] as number]?.imageId)} 
                        alt={state.units.items[equipment[slotType] as number]?.name}
                        className="w-full h-full object-contain"
                      />
                    )}
                  </div>
                  <div>
                    {equipment[slotType] !== null && equipment[slotType] !== undefined ? (
                      <>
                        <p className="font-medium">{state.units.items[equipment[slotType] as number]?.name}</p>
                        <button 
                          onClick={() => handleEquipItem(slotType, null)}
                          className="text-xs text-red-500 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No item equipped</p>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <label className="block text-xs font-medium mb-1">Select item</label>
                  <select 
                    className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md"
                    value={equipment[slotType] !== null && equipment[slotType] !== undefined ? equipment[slotType] as number : ''}
                    onChange={(e) => handleEquipItem(slotType, e.target.value ? parseInt(e.target.value) : null)}
                  >
                    <option value="">None</option>
                    {getItemsForSlot(slotType).map((item: Item) => {
                      const itemIndex = state.units.items.findIndex(i => i === item);
                      return (
                        <option key={itemIndex} value={itemIndex}>
                          {item.name} ({item.rarity})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-primary text-white rounded-md"
          >
            Save Equipment
          </button>
        </div>
      </div>
    </div>
  );
}