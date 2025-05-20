import { useState, useRef } from 'react';
import { useAppState } from '../../contexts/AppStateContext';

interface ImageUploadProps {
  onImageUpload?: (imageId: string) => void;
  onUpload?: (imageId: string) => void;
  currentImageId?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function ImageUpload({
  onImageUpload,
  onUpload,
  currentImageId,
  size = 'md',
  className = ''
}: ImageUploadProps) {
  const { state, updateState } = useAppState();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Определяем размеры на основе prop size
  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-16 h-16',
    lg: 'w-24 h-24'
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Сбрасываем ошибку при новой попытке
    setError(null);
    
    // Проверка размера файла (ограничим 2MB)
    if (file.size > 2 * 1024 * 1024) {
      setError('File size must be less than 2MB');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    // Проверка типа файла
    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setIsLoading(true);
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imageData = event.target?.result as string;
        if (imageData) {
          // Создаем уникальный ID для изображения
          const imageId = `id_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
          
          // Создаем копию imageMap
          const newImageMap = new Map(state.units.imageMap || new Map());
          
          // ВАЖНО: корректно сохраняем данные изображения
          // Мы должны убедиться, что сохраняем полный data URL или отдельные компоненты
          let type = file.type;
          let data = imageData;
          
          // Если данные уже содержат data:image, извлекаем только часть с base64
          if (imageData.startsWith('data:')) {
            const parts = imageData.split(',');
            if (parts.length === 2) {
              // Извлекаем тип из заголовка data URL
              const typeMatch = parts[0].match(/data:([^;]+);/);
              if (typeMatch && typeMatch[1]) {
                type = typeMatch[1];
              }
              // Сохраняем только данные base64 без заголовка
              data = parts[1];
            }
          }
          
          // Сохраняем изображение в корректном формате
          newImageMap.set(imageId, {
            type: type,
            data: data
          });
          
          // Обновляем imageMap в state
          updateState('units.imageMap', newImageMap);
          
          // Увеличиваем nextImageId если он существует
          if (state.units.nextImageId !== undefined) {
            updateState('units.nextImageId', (state.units.nextImageId || 0) + 1);
          }
          
          // Вызываем любой доступный колбэк
          if (typeof onImageUpload === 'function') {
            onImageUpload(imageId);
          } else if (typeof onUpload === 'function') {
            onUpload(imageId);
          }
          
          // Очищаем input для возможности повторной загрузки того же файла
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      } catch (err) {
        console.error('Error processing image:', err);
        setError('Failed to process image');
      } finally {
        // Всегда сбрасываем состояние загрузки в конце
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      console.error('Error reading file');
      setError('Failed to read file');
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.onabort = () => {
      console.error('File reading aborted');
      setError('File reading was aborted');
      setIsLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    
    reader.readAsDataURL(file);
  };
  
  // ИСПРАВЛЕНО: более надежная функция для получения URL изображения
  const getImageUrl = (imageId: string | null | undefined) => {
    if (!imageId || !state.units.imageMap || !state.units.imageMap.has(imageId)) {
      return null;
    }
    
    try {
      const image = state.units.imageMap.get(imageId);
      if (!image) return null;
      
      // Если данные уже в формате data:URL, возвращаем как есть
      if (typeof image.data === 'string' && image.data.startsWith('data:')) {
        return image.data;
      }
      
      // Иначе конструируем data:URL
      return `data:${image.type};base64,${image.data}`;
    } catch (error) {
      console.error('Error getting image URL:', error);
      return null;
    }
  };
  
  const imageUrl = getImageUrl(currentImageId);
  
  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden flex items-center justify-center cursor-pointer border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-primary dark:hover:border-primary transition-colors`}
        onClick={() => fileInputRef.current?.click()}
      >
        {isLoading ? (
          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
        ) : imageUrl ? (
          // Добавляем обработку ошибок при загрузке изображения
          <img 
            src={imageUrl} 
            className="w-full h-full object-contain" 
            alt="Uploaded image" 
            onError={(e) => {
              console.error('Error loading image:', imageUrl);
              e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
            }}
          />
        ) : (
          <span className="text-gray-400 text-2xl">+</span>
        )}
      </div>
      
      <div>
        <p className="text-sm mb-1 text-gray-800 dark:text-gray-200">{imageUrl ? 'Replace image' : 'Upload image'}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">PNG, JPG or GIF (max 2MB)</p>
        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
      </div>
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/png,image/jpeg,image/gif"
        onChange={handleFileChange}
      />
    </div>
  );
}