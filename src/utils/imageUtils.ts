// Получение URL изображения из imageMap по ID
export function getImageUrl(imageId: string | null | undefined, state: any): string | null {
  if (!imageId) {
    return null;
  }

  try {
    // Проверяем в imageMap units
    if (state.units.imageMap && state.units.imageMap.has(imageId)) {
      const image = state.units.imageMap.get(imageId);
      if (!image || !image.data) {
        return null;
      }
      
      // ВАЖНОЕ ИСПРАВЛЕНИЕ: Предотвращаем дублирование data:image prefix
      if (typeof image.data === 'string' && image.data.startsWith('data:')) {
        return image.data; // Возвращаем как есть
      }
      
      // Создаем data URL для использования в img src
      return `data:${image.type || 'image/png'};base64,${image.data}`;
    }
    
    // Проверяем в imageMap resources
    if (state.resources.imageMap && state.resources.imageMap.has(imageId)) {
      const image = state.resources.imageMap.get(imageId);
      if (!image || !image.data) {
        return null;
      }
      
      // ВАЖНОЕ ИСПРАВЛЕНИЕ: Предотвращаем дублирование data:image prefix
      if (typeof image.data === 'string' && image.data.startsWith('data:')) {
        return image.data; // Возвращаем как есть
      }
      
      // Создаем data URL для использования в img src
      return `data:${image.type || 'image/png'};base64,${image.data}`;
    }
    
    return null;
  } catch (error) {
    console.error(`Error getting image URL for ${imageId}:`, error);
    return null;
  }
}

// Загрузка изображения и получение imageId
export async function uploadImage(file: File, state: any, updateState: Function): Promise<string | null> {
  if (!file) return null;
  
  // Проверка размера файла (ограничение 2MB)
  if (file.size > 2 * 1024 * 1024) {
    throw new Error('File size must be less than 2MB');
  }
  
  // Проверка типа файла
  if (!file.type.startsWith('image/')) {
    throw new Error('Only image files are allowed');
  }
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const imageData = event.target?.result as string;
        if (!imageData) {
          reject(new Error('Failed to read image data'));
          return;
        }
        
        // Создаем уникальный ID для изображения
        const imageId = `id_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        
        // Создаем копию imageMap
        const newImageMap = new Map(state.units.imageMap);
        
        // КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ: Правильно обрабатываем dataURL
        let cleanData = imageData;
        
        // Если данные уже в формате dataURL, извлекаем только base64 часть
        if (imageData.startsWith('data:')) {
          const dataParts = imageData.split(',');
          if (dataParts.length === 2) {
            cleanData = dataParts[1]; // Только base64 часть
          }
        }
        
        // Добавляем изображение в Map
        newImageMap.set(imageId, {
          data: cleanData,
          type: file.type
        });
        
        // Обновляем imageMap в state
        updateState('units.imageMap', newImageMap);
        
        // Увеличиваем nextImageId
        if (state.units.nextImageId !== undefined) {
          updateState('units.nextImageId', (state.units.nextImageId || 0) + 1);
        }
        
        resolve(imageId);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading file'));
    };
    
    reader.readAsDataURL(file);
  });
}