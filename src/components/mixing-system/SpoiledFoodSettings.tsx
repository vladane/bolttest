import React, { useState } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import ImageUpload from '../common/ImageUpload';
import { getImageUrl as getImageUrlUtil } from '../../utils/imageUtils';

type SpoiledFoodType = 'meat' | 'fish' | 'general';

const SpoiledFoodSettings: React.FC = () => {
  const { state, updateState } = useAppState();
  const { spoiledFood } = state.mixingSystem;
  
  // Состояния для редактирования
  const [editingType, setEditingType] = useState<SpoiledFoodType | null>(null);
  const [editName, setEditName] = useState('');
  const [editImageId, setEditImageId] = useState('');
  const [editDescription, setEditDescription] = useState('');
  
  // Функция для получения URL изображения
  const getImageUrl = (imageId: string): string => {
    return getImageUrlUtil(imageId, state) || '';
  };
  
  // Начать редактирование
  const startEditing = (type: SpoiledFoodType) => {
    const food = spoiledFood.find(f => f.type === type);
    if (food) {
      setEditingType(type);
      setEditName(food.name);
      setEditImageId(food.imageId || '');
      setEditDescription(food.description || '');
    }
  };
  
  // Сохранить изменения
  const saveChanges = () => {
    if (!editingType) return;
    
    const updatedSpoiledFood = spoiledFood.map(food => 
      food.type === editingType
        ? { 
            ...food, 
            name: editName, 
            imageId: editImageId,
            description: editDescription 
          }
        : food
    );
    
    updateState('mixingSystem.spoiledFood', updatedSpoiledFood);
    
    // Сброс формы
    setEditingType(null);
    setEditName('');
    setEditImageId('');
    setEditDescription('');
  };
  
  // Отмена редактирования
  const cancelEditing = () => {
    setEditingType(null);
    setEditName('');
    setEditImageId('');
    setEditDescription('');
  };
  
  // Перевод типа пищи на русский
  const getFoodTypeLabel = (type: SpoiledFoodType): string => {
    switch (type) {
      case 'meat': return 'Мясная испорченная';
      case 'fish': return 'Рыбная испорченная';
      case 'general': return 'Обычная испорченная';
      default: return 'Неизвестный тип';
    }
  };
  
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
      <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Настройки испорченной еды</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {spoiledFood.map(food => (
          <div key={food.type} className="border rounded-lg p-4 dark:border-gray-700">
            <h3 className="font-medium text-center mb-2 text-gray-900 dark:text-gray-100">
              {getFoodTypeLabel(food.type as SpoiledFoodType)}
            </h3>
            
            {editingType === food.type ? (
              /* Форма редактирования */
              <div className="space-y-4">
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Название</label>
                  <input 
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600"
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Описание</label>
                  <textarea
                    value={editDescription}
                    onChange={(e) => setEditDescription(e.target.value)}
                    className="w-full px-3 py-2 border rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 dark:border-gray-600"
                    rows={3}
                  />
                </div>
                
                <div>
                  <label className="block text-sm mb-1 text-gray-700 dark:text-gray-300">Изображение</label>
                  <ImageUpload onUpload={(id) => setEditImageId(id)} />
                  
                  {editImageId && (
                    <div className="mt-2 flex justify-center">
                      <img 
                        src={getImageUrl(editImageId)}
                        alt={editName}
                        className="w-20 h-20 object-cover rounded"
                      />
                    </div>
                  )}
                </div>
                
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={saveChanges}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded hover:bg-opacity-90"
                  >
                    Сохранить
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="flex-1 px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-opacity-90"
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              /* Просмотр */
              <div className="text-center">
                <div className="mb-2 flex justify-center">
                  {food.imageId ? (
                    <img 
                      src={getImageUrl(food.imageId)}
                      alt={food.name}
                      className="w-24 h-24 object-cover rounded"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gray-200 dark:bg-gray-600 rounded flex items-center justify-center">
                      <span className="text-gray-400 dark:text-gray-500">Нет изображения</span>
                    </div>
                  )}
                </div>
                <p className="mb-2 text-gray-900 dark:text-gray-100">{food.name || 'Без названия'}</p>
                {food.description && (
                  <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">{food.description}</p>
                )}
                <button
                  onClick={() => startEditing(food.type as SpoiledFoodType)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded w-full transition"
                >
                  Редактировать
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SpoiledFoodSettings;