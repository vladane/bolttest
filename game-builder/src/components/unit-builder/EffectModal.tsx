import React, { useState, useEffect, ReactNode } from 'react';

interface EffectType {
  id: string;
  name: string;
  color: string;
}

interface EffectData {
  type: string;
  targetType: string;
  element: string;
  value: number;
  duration: number;
  specificFields?: Record<string, any>;
}

interface EffectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (effect: EffectData) => void;
  initialEffect?: EffectData | null;
  effectTypes: EffectType[];
}

export default function EffectModal({
  isOpen,
  onClose,
  onSave,
  initialEffect,
  effectTypes
}: EffectModalProps) {
  const [effect, setEffect] = useState<EffectData>({
    type: '',
    targetType: 'single',
    element: '',
    value: 0,
    duration: 1,
    specificFields: {}
  });
  
  // Дополнительные специфичные поля в зависимости от типа эффекта
  const [specificFields, setSpecificFields] = useState<ReactNode | null>(null);
  
  // Обновляем состояние, когда меняется initialEffect
  useEffect(() => {
    if (initialEffect) {
      setEffect(initialEffect);
    } else {
      // Сброс при создании нового эффекта
      setEffect({
        type: effectTypes.length > 0 ? effectTypes[0].id : '',
        targetType: 'single',
        element: '',
        value: 0,
        duration: 1,
        specificFields: {}
      });
    }
  }, [initialEffect, effectTypes]);
  
  // Обновляем специфичные поля при изменении типа эффекта
  useEffect(() => {
    updateSpecificFields();
  }, [effect.type]);
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setEffect(prev => ({
      ...prev,
      [name]: name === 'value' || name === 'duration' ? parseFloat(value) : value
    }));
  };
  
  // Обработчик изменения специфичных полей
  const handleSpecificFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    setEffect(prev => ({
      ...prev,
      specificFields: {
        ...prev.specificFields,
        [name]: e.target.type === 'number' ? parseFloat(value) : value
      }
    }));
  };
  
  // Функция для создания специфичных полей в зависимости от типа эффекта
  const updateSpecificFields = () => {
    let fields: ReactNode | null = null; // Изменено с JSX.Element на ReactNode
    
    // Логика для добавления специфичных полей в зависимости от типа эффекта
    // В будущем можно расширить для других типов эффектов
    if (effect.type === 'damage') {
      fields = (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Damage Type</label>
            <select
              name="damageType"
              value={effect.specificFields?.damageType || 'physical'}
              onChange={handleSpecificFieldChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="physical">Physical</option>
              <option value="magical">Magical</option>
              <option value="true">True (ignores defense)</option>
            </select>
          </div>
        </div>
      );
    } else if (effect.type === 'heal') {
      fields = (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Heal Type</label>
            <select
              name="healType"
              value={effect.specificFields?.healType || 'flat'}
              onChange={handleSpecificFieldChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="flat">Flat Amount</option>
              <option value="percentage">Percentage of Max Health</option>
              <option value="overtime">Over Time</option>
            </select>
          </div>
        </div>
      );
    } else if (effect.type === 'buff' || effect.type === 'debuff') {
      fields = (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Stat Affected</label>
            <select
              name="statAffected"
              value={effect.specificFields?.statAffected || 'attack'}
              onChange={handleSpecificFieldChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="attack">Attack</option>
              <option value="defense">Defense</option>
              <option value="speed">Speed</option>
              <option value="dodge">Dodge</option>
              <option value="accuracy">Accuracy</option>
              <option value="critRate">Crit Rate</option>
              <option value="critDamage">Crit Damage</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Value Type</label>
            <select
              name="valueType"
              value={effect.specificFields?.valueType || 'flat'}
              onChange={handleSpecificFieldChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="flat">Flat Value</option>
              <option value="percentage">Percentage</option>
            </select>
          </div>
        </div>
      );
    }
    
    setSpecificFields(fields);
  };
  
  // Обработчик сохранения эффекта
  const handleSave = () => {
    onSave(effect);
    onClose();
  };
  
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
        <h2 className="text-xl font-bold mb-4">
          {initialEffect ? 'Edit Effect' : 'Add Effect'}
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Effect Type</label>
            <select
              name="type"
              value={effect.type}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              {effectTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Target Type</label>
            <select
              name="targetType"
              value={effect.targetType}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="single">Single Target</option>
              <option value="all">All Enemies</option>
              <option value="random">Random Enemy</option>
              <option value="self">Self</option>
              <option value="ally">Single Ally</option>
              <option value="all_allies">All Allies</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Element</label>
            <select
              name="element"
              value={effect.element}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="">None</option>
              <option value="fire">Fire</option>
              <option value="water">Water</option>
              <option value="earth">Earth</option>
              <option value="air">Air</option>
              <option value="electricity">Electricity</option>
              <option value="chaos">Chaos</option>
              <option value="order">Order</option>
            </select>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Value</label>
              <input
                type="number"
                name="value"
                value={effect.value}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Duration (turns)</label>
              <input
                type="number"
                name="duration"
                value={effect.duration}
                onChange={handleChange}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
                min="1"
              />
            </div>
          </div>
          
          {/* Специфичные поля для каждого типа эффекта */}
          {specificFields}
        </div>
        
        <div className="flex justify-end space-x-2 mt-6">
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
            {initialEffect ? 'Update' : 'Add'} Effect
          </button>
        </div>
      </div>
    </div>
  );
}