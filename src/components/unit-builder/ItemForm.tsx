import { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import ImageUpload from '../common/ImageUpload';


interface ItemFormData {
  name: string;
  rarity: string;
  imageId: string | null;
}

export default function ItemForm() {
  const { state, updateState } = useAppState();
  const [formData, setFormData] = useState<ItemFormData>({
    name: '',
    rarity: 'common',
    imageId: null
  });
  
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editingIndex, setEditingIndex] = useState(-1);
  
  // Обработчик изменения полей формы
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Очищаем сообщения при изменении данных
    if (error) setError(null);
  };
  
  // Обработчик загрузки изображения
  const handleImageUpload = (imageId: string) => {
    setFormData(prev => ({ ...prev, imageId }));
  };
  
  // Валидация формы
  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('Please enter an item name');
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
    
    // Создание объекта предмета
    const item = {
      name: formData.name.trim(),
      rarity: formData.rarity,
      imageId: formData.imageId
    };
    
    // Обновление или создание предмета
    if (isEditing && editingIndex >= 0) {
      // Создаем копию массива предметов
      const updatedItems = [...state.units.items];
      updatedItems[editingIndex] = { ...item, slotType: null };
      
      // Обновляем состояние
      updateState('units.items', updatedItems);
      setSuccess('Item updated successfully!');
    } else {
      // Добавляем новый предмет
      updateState('units.items', [...state.units.items, item]);
      setSuccess('Item created successfully!');
    }
    
    // Очищаем форму
    clearForm();
  };
  
  // Функция очистки формы
  const clearForm = () => {
    setFormData({
      name: '',
      rarity: 'common',
      imageId: null
    });
    
    setIsEditing(false);
    setEditingIndex(-1);
  };
  
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">
        {isEditing ? 'Edit Item' : 'Create Item'}
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
          <label className="block text-sm font-medium mb-1">Item Name</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
            placeholder="Enter item name"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Rarity</label>
          <select
            name="rarity"
            value={formData.rarity}
            onChange={handleChange}
            className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-md text-gray-700 dark:text-gray-300"
          >
            {state.units.rarities.map(rarity => (
              <option key={rarity.id} value={rarity.id}>
                {rarity.name}
              </option>
            ))}
          </select>
        </div>
      
        
        <div>
          <label className="block text-sm font-medium mb-1">Item Image</label>
          <ImageUpload 
            onImageUpload={handleImageUpload} 
            currentImageId={formData.imageId}
            size="md"
          />
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
            {isEditing ? 'Update' : 'Create'} Item
          </button>
        </div>
      </form>
    </div>
  );
}