import { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import ImageUpload from '../common/ImageUpload';
import EffectModal from './EffectModal';

interface AbilityFormData {
  name: string;
  type: string;
  cooldown: string;
  description: string;
  targetType: string;
  iconId: string | null;
}

interface Effect {
  type: string;
  targetType: string;
  element: string;
  value: number;
  duration: number;
  specificFields?: Record<string, any>;
}

export default function AbilityForm() {
  const { state, updateState } = useAppState();
  const [formData, setFormData] = useState<AbilityFormData>({
    name: '',
    type: '',
    cooldown: '',
    description: '',
    targetType: '',
    iconId: null
  });
  
  const [effects, setEffects] = useState<Effect[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  
  // Состояние для модального окна эффектов
  const [isEffectModalOpen, setIsEffectModalOpen] = useState(false);
  const [editingEffectIndex, setEditingEffectIndex] = useState<number | null>(null);
  
  // Определение типов эффектов для модального окна
  const effectTypes = [
    { id: 'damage', name: 'Damage', color: 'bg-red-500' },
    { id: 'heal', name: 'Heal', color: 'bg-green-500' },
    { id: 'buff', name: 'Buff', color: 'bg-blue-500' },
    { id: 'debuff', name: 'Debuff', color: 'bg-purple-500' },
    { id: 'shield', name: 'Shield', color: 'bg-yellow-500' },
    { id: 'special', name: 'Special', color: 'bg-indigo-500' }
  ];
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очищаем сообщения при изменении данных
    if (error) setError(null);
  };
  
  // Обработчик загрузки изображения
  const handleImageUpload = (imageId: string) => {
    setFormData(prev => ({ ...prev, iconId: imageId }));
  };
  
  // Открытие модального окна для добавления/редактирования эффекта
  const openEffectModal = (index?: number) => {
    if (index !== undefined && index >= 0 && index < effects.length) {
      setEditingEffectIndex(index);
    } else {
      setEditingEffectIndex(null);
    }
    
    setIsEffectModalOpen(true);
  };
  
  // Обработчик сохранения эффекта
  const handleSaveEffect = (effect: Effect) => {
    if (editingEffectIndex !== null) {
      // Обновляем существующий эффект
      const updatedEffects = [...effects];
      updatedEffects[editingEffectIndex] = effect;
      setEffects(updatedEffects);
    } else {
      // Добавляем новый эффект
      setEffects([...effects, effect]);
    }
  };
  
  // Удаление эффекта
  const handleDeleteEffect = (index: number) => {
    if (confirm('Are you sure you want to delete this effect?')) {
      const updatedEffects = [...effects];
      updatedEffects.splice(index, 1);
      setEffects(updatedEffects);
    }
  };
  
  // Валидация формы
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Please enter an ability name');
      return false;
    }
    
    if (!formData.type) {
      setError('Please select an ability type');
      return false;
    }
    
    if (!formData.targetType) {
      setError('Please select a target type');
      return false;
    }
    
    if (!formData.description.trim()) {
      setError('Please enter a description');
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
    
    // Создание объекта способности
    const ability = {
      name: formData.name.trim(),
      type: formData.type,
      cooldown: parseInt(formData.cooldown) || 0,
      description: formData.description.trim(),
      targetType: formData.targetType,
      iconId: formData.iconId,
      effects: effects
    };
    
    // Обновление или создание способности
    if (isEditing && editingIndex >= 0) {
      // Создаем копию массива способностей
      const updatedAbilities = [...state.units.abilities];
      updatedAbilities[editingIndex] = ability;
      
      // Обновляем состояние
      updateState('units.abilities', updatedAbilities);
      setSuccess('Ability updated successfully!');
    } else {
      // Добавляем новую способность
      updateState('units.abilities', [...state.units.abilities, ability]);
      setSuccess('Ability created successfully!');
    }
    
    // Очищаем форму
    clearForm();
  };
  
  // Функция очистки формы
  const clearForm = () => {
    setFormData({
      name: '',
      type: '',
      cooldown: '',
      description: '',
      targetType: '',
      iconId: null
    });
    
    setEffects([]);
    setIsEditing(false);
    setEditingIndex(-1);
  };
  
  // Получаем цвет типа эффекта
  const getEffectTypeColor = (type: string) => {
    const effectType = effectTypes.find(t => t.id === type);
    return effectType ? effectType.color : 'bg-gray-500';
  };
  
  // Функция для генерации описания эффекта
  const getEffectDescription = (effect: Effect) => {
    let desc = '';
    
    switch (effect.type) {
      case 'damage':
        const damageType = effect.specificFields?.damageType || 'physical';
        desc = `Deals ${effect.value} ${damageType} damage`;
        break;
      case 'heal':
        const healType = effect.specificFields?.healType || 'flat';
        if (healType === 'flat') {
          desc = `Heals for ${effect.value} health`;
        } else if (healType === 'percentage') {
          desc = `Heals for ${effect.value}% of max health`;
        } else {
          desc = `Heals ${effect.value} health per turn`;
        }
        break;
      case 'buff':
        const buffStat = effect.specificFields?.statAffected || 'attack';
        const buffValueType = effect.specificFields?.valueType || 'flat';
        desc = `Increases ${buffStat} by ${effect.value}${buffValueType === 'percentage' ? '%' : ''}`;
        break;
      case 'debuff':
        const debuffStat = effect.specificFields?.statAffected || 'attack';
        const debuffValueType = effect.specificFields?.valueType || 'flat';
        desc = `Decreases ${debuffStat} by ${effect.value}${debuffValueType === 'percentage' ? '%' : ''}`;
        break;
      case 'shield':
        desc = `Provides a shield of ${effect.value} points`;
        break;
      case 'special':
        desc = `Special effect with value ${effect.value}`;
        break;
      default:
        desc = `Effect with value ${effect.value}`;
    }
    
    if (effect.duration > 1) {
      desc += ` for ${effect.duration} turns`;
    }
    
    return desc;
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Ability' : 'Create Ability'}
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
          <label className="block text-sm font-medium mb-1">Ability Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            placeholder="Enter ability name"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              name="type"
              value={formData.type}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            >
              <option value="">Select type</option>
              <option value="active">Active</option>
              <option value="passive">Passive</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Cooldown (turns)</label>
            <input
              type="number"
              name="cooldown"
              value={formData.cooldown}
              onChange={handleChange}
              className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
              placeholder="Turns"
              min="0"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Target Type</label>
          <select
            name="targetType"
            value={formData.targetType}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
          >
            <option value="">Select target type</option>
            <option value="single">Single Target</option>
            <option value="all">All Enemies</option>
            <option value="random">Random Enemy</option>
            <option value="self">Self</option>
            <option value="ally">Single Ally</option>
            <option value="all_allies">All Allies</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            rows={3}
            placeholder="Describe this ability..."
          ></textarea>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Icon</label>
          <ImageUpload 
            onImageUpload={handleImageUpload} 
            currentImageId={formData.iconId}
            size="md"
          />
        </div>
        
        <div>
          <div className="flex justify-between items-center mb-2">
            <label className="block text-sm font-medium">Effects</label>
            <button
              type="button"
              onClick={() => openEffectModal()}
              className="px-3 py-1.5 bg-primary bg-opacity-10 text-primary rounded-md text-sm hover:bg-opacity-20 transition-colors"
            >
              Add Effect
            </button>
          </div>
          
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
            {effects.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center">No effects added yet</p>
            ) : (
              <div className="space-y-3">
                {effects.map((effect, index) => (
                  <div key={index} className="bg-white dark:bg-gray-700 p-3 rounded-md shadow-sm">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center">
                        <span className={`inline-block w-3 h-3 rounded-full ${getEffectTypeColor(effect.type)} mr-2`}></span>
                        <span className="font-medium capitalize">{effect.type}</span>
                        {effect.element && (
                          <span className={`ml-2 px-2 py-0.5 text-xs rounded bg-${effect.element} bg-opacity-20 text-${effect.element}`}>
                            {effect.element}
                          </span>
                        )}
                      </div>
                      <div className="flex space-x-1">
                        <button
                          type="button"
                          onClick={() => openEffectModal(index)}
                          className="p-1 text-primary hover:text-primary-dark"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteEffect(index)}
                          className="p-1 text-red-500 hover:text-red-700"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    
                    <p className="text-sm">{getEffectDescription(effect)}</p>
                    
                    <div className="mt-1 flex space-x-3 text-xs text-gray-500 dark:text-gray-400">
                      <div>Target: {effect.targetType.replace('_', ' ')}</div>
                      {effect.duration > 1 && <div>Duration: {effect.duration} turns</div>}
                    </div>
                  </div>
                ))}
              </div>
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
            {isEditing ? 'Update' : 'Create'} Ability
          </button>
        </div>
      </form>
      
      {/* Модальное окно для редактирования эффектов */}
      <EffectModal
        isOpen={isEffectModalOpen}
        onClose={() => setIsEffectModalOpen(false)}
        onSave={handleSaveEffect}
        initialEffect={editingEffectIndex !== null ? effects[editingEffectIndex] : null}
        effectTypes={effectTypes}
      />
    </div>
  );
}