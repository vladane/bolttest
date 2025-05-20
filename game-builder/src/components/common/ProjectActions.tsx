import { useState, useRef } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import JSZip from 'jszip';

// Типизация для imageMap
interface ImageInfo {
  fileName: string;
  type: string;
  source: string;
}

export default function ProjectActions() {
  const { state, setFullState } = useAppState();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Функция для экспорта проекта
  const handleExportProject = async () => {
    setIsExporting(true);
    console.log('Starting export process...');
    
    try {
      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      if (imagesFolder === null) {
        throw new Error('Failed to create images folder in zip archive');
      }

      // Типизация для imageMap в exportData
      const exportData: {
        units: any[],
        items: any[],
        abilities: any[],
        resources: {
          items: any[],
          categories: any[],
          nextImageId: number
        },
        recipes: any,
        balance: any,
        craftSystem: any,
        mixingSystem: any,
        shopSystem: any,
        imageMap: Record<string, ImageInfo> // Правильная типизация для imageMap
      } = {
        units: state.units.units,
        items: state.units.items,
        abilities: state.units.abilities,
        resources: {
          items: state.resources.items,
          categories: state.resources.categories,
          nextImageId: state.resources.nextImageId
        },
        recipes: state.recipes,
        balance: {
          currentConfig: state.balance.currentConfig,
          savedConfigs: state.balance.savedConfigs,
          comparisonItems: state.balance.comparisonItems
        },
        craftSystem: {
          recipes: JSON.parse(JSON.stringify(state.craftSystem.recipes || [])),
          variants: JSON.parse(JSON.stringify(state.craftSystem.variants || [])),
          nextRecipeId: state.craftSystem.nextRecipeId,
          nextVariantId: state.craftSystem.nextVariantId
        },
        // Включаем mixingSystem
        mixingSystem: {
          recipes: JSON.parse(JSON.stringify(state.mixingSystem.recipes || [])),
          spoiledFood: JSON.parse(JSON.stringify(state.mixingSystem.spoiledFood || [])),
          nextRecipeId: state.mixingSystem.nextRecipeId
        },
        // Добавляем shopSystem
        shopSystem: state.shopSystem ? {
          currencies: JSON.parse(JSON.stringify(state.shopSystem.currencies || [])),
          traders: JSON.parse(JSON.stringify(state.shopSystem.traders || [])),
          shops: JSON.parse(JSON.stringify(state.shopSystem.shops || [])),
          nextTraderIdCounter: state.shopSystem.nextTraderIdCounter,
          nextShopIdCounter: state.shopSystem.nextShopIdCounter
        } : undefined,
        imageMap: {}
      };
      
      console.log("Экспорт данных:", {
        unitsCount: exportData.units?.length || 0,
        itemsCount: exportData.items?.length || 0,
        comparisonItemsCount: exportData.balance?.comparisonItems?.length || 0,
        craftSystemRecipesCount: exportData.craftSystem?.recipes?.length || 0,
        mixingSystemRecipesCount: exportData.mixingSystem?.recipes?.length || 0,
        shopSystemShopsCount: exportData.shopSystem?.shops?.length || 0,
        shopSystemTradersCount: exportData.shopSystem?.traders?.length || 0,
        unitsImageMapSize: state.units.imageMap.size,
        resourcesImageMapSize: state.resources.imageMap.size
      });
      
      // Сохраняем все изображения из units.imageMap
      if (state.units.imageMap && state.units.imageMap.size > 0) {
        console.log(`Exporting ${state.units.imageMap.size} images from units`);
        
        state.units.imageMap.forEach((imageData, imageId) => {
          if (!imageData || !imageData.data) {
            console.warn(`Image ${imageId} has no data, skipping`);
            return;
          }
          
          try {
            // Определяем, является ли данные data URL
            let base64Data;
            let mimeType = imageData.type || 'image/png';
            
            if (typeof imageData.data === 'string' && imageData.data.startsWith('data:')) {
              // Обрабатываем data URL
              const matches = imageData.data.match(/^data:(.+);base64,(.+)$/);
              if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
              } else {
                console.warn(`Invalid data URL format for image ${imageId}`);
                return;
              }
            } else {
              // Предполагаем, что это просто base64
              base64Data = imageData.data;
            }
            
            // Определяем расширение
            const extension = mimeType === 'image/jpeg' ? 'jpg' : 
                            mimeType === 'image/png' ? 'png' : 
                            mimeType === 'image/gif' ? 'gif' : 'png';
            
            // Сохраняем в архиве
            const fileName = `${imageId}.${extension}`;
            imagesFolder.file(fileName, base64Data, { base64: true });
            
            // Добавляем информацию в JSON
            exportData.imageMap[imageId] = {
              fileName,
              type: mimeType,
              source: 'units'
            };
            
            console.log(`Exported image ${imageId} as ${fileName}`);
          } catch (error) {
            console.error(`Error processing image ${imageId}:`, error);
          }
        });
      }
      
      // Сохраняем изображения из resources.imageMap
      if (state.resources.imageMap && state.resources.imageMap.size > 0) {
        console.log(`Exporting ${state.resources.imageMap.size} images from resources`);
        
        state.resources.imageMap.forEach((imageData, imageId) => {
          if (!imageData || !imageData.data) return;
          
          try {
            // Определяем, является ли данные data URL
            let base64Data;
            let mimeType = imageData.type || 'image/png';
            
            if (typeof imageData.data === 'string' && imageData.data.startsWith('data:')) {
              // Обрабатываем data URL
              const matches = imageData.data.match(/^data:(.+);base64,(.+)$/);
              if (matches) {
                mimeType = matches[1];
                base64Data = matches[2];
              } else {
                return;
              }
            } else {
              // Предполагаем, что это просто base64
              base64Data = imageData.data;
            }
            
            // Определяем расширение
            const extension = mimeType === 'image/jpeg' ? 'jpg' : 
                            mimeType === 'image/png' ? 'png' : 
                            mimeType === 'image/gif' ? 'gif' : 'png';
            
            // Сохраняем в архиве
            const fileName = `${imageId}.${extension}`;
            imagesFolder.file(fileName, base64Data, { base64: true });
            
            // Добавляем информацию в JSON
            exportData.imageMap[imageId] = {
              fileName,
              type: mimeType,
              source: 'resources'
            };
          } catch (error) {
            console.error(`Error processing resource image ${imageId}:`, error);
          }
        });
      }
      
      // Сохраняем JSON с данными
      zip.file('project.json', JSON.stringify(exportData, null, 2));
      
      // Создаем копию экспортируемых данных в локальном хранилище для отладки
      try {
        const debugData = {
          timestamp: new Date().toISOString(),
          exportedSystems: {
            units: true,
            resources: true,
            craftSystem: !!exportData.craftSystem?.recipes?.length,
            mixingSystem: !!exportData.mixingSystem?.recipes?.length,
            shopSystem: !!exportData.shopSystem?.shops?.length
          }
        };
        localStorage.setItem('last_export_debug', JSON.stringify(debugData));
      } catch (e) {
        console.warn('Unable to save debug data to localStorage:', e);
      }
      
      // Генерируем ZIP-архив
      const content = await zip.generateAsync({ type: 'blob' });
      
      // Создаем ссылку для скачивания
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `game-builder-project-${new Date().toISOString().slice(0, 10)}.zip`;
      document.body.appendChild(a);
      a.click();
      
      // Очищаем ссылку
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      setIsExporting(false);
      console.log('Export completed successfully');
    } catch (error) {
      console.error('Error exporting project:', error);
      alert(`Error exporting project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExporting(false);
    }
  };
  
  // Функция для импорта проекта
  const handleImportProject = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    console.log('Starting import process...');
    
    try {
      // Загружаем ZIP архив
      const zip = await JSZip.loadAsync(file);
      
      // Ищем файл project.json
      const dataFile = zip.file('project.json');
      if (!dataFile) {
        throw new Error('Invalid project file: project.json not found');
      }
      
      // Получаем и парсим данные
      const dataText = await dataFile.async('text');
      const importData = JSON.parse(dataText);
      
      console.log('Parsed project data:', {
        unitsCount: importData.units?.length || 0,
        itemsCount: importData.items?.length || 0,
        comparisonItemsCount: importData.balance?.comparisonItems?.length || 0,
        craftSystemRecipesCount: importData.craftSystem?.recipes?.length || 0,
        mixingSystemRecipesCount: importData.mixingSystem?.recipes?.length || 0,
        shopSystemShopsCount: importData.shopSystem?.shops?.length || 0,
        imageMapCount: Object.keys(importData.imageMap || {}).length
      });
      
      // Создаем новые Map для изображений
      const unitsImageMap = new Map();
      const resourcesImageMap = new Map();
      
      // Получаем список файлов с изображениями
      const zipFiles = Object.keys(zip.files).filter(f => !zip.files[f].dir);
      console.log('Files in archive:', zipFiles.slice(0, 10).join(', ') + (zipFiles.length > 10 ? ` (and ${zipFiles.length - 10} more)` : ''));
      
      // Загружаем все изображения из архива
      if (importData.imageMap && Object.keys(importData.imageMap).length > 0) {
        console.log('Loading images from imageMap...');
        
        // Создаем список Promise для загрузки всех изображений
        const imagePromises = [];
        
        for (const [imageId, imageInfo] of Object.entries(importData.imageMap)) {
          const { fileName, type, source } = imageInfo as { fileName: string, type: string, source: string };
          console.log(`Processing image ${imageId} (${fileName})`);
          
          // Находим файл в архиве
          let filePath = null;
          
          // Проверяем различные возможные пути
          const possiblePaths = [
            `images/${fileName}`,
            `images/${imageId}.png`,
            `images/${imageId}.jpg`,
            fileName,
            `${imageId}.png`,
            `${imageId}.jpg`
          ];
          
          for (const path of possiblePaths) {
            if (zipFiles.includes(path)) {
              filePath = path;
              console.log(`Found image at path: ${path}`);
              break;
            }
          }
          
          // Если не нашли конкретный путь, ищем по шаблону с ID
          if (!filePath) {
            for (const path of zipFiles) {
              if (path.includes(imageId)) {
                filePath = path;
                console.log(`Found image by ID pattern: ${path}`);
                break;
              }
            }
          }
          
          if (!filePath) {
            console.warn(`Could not find image for ${imageId}`);
            continue;
          }
          
          // Загружаем файл
          const imageFile = zip.file(filePath);
          if (!imageFile) {
            console.warn(`Could not load file at path ${filePath}`);
            continue;
          }
          
          // Создаем Promise для загрузки
          const promise = imageFile.async('base64')
            .then(base64Data => {
              // Создаем полный data URL
              const dataUrl = `data:${type};base64,${base64Data}`;
              
              // Сохраняем в соответствующий Map
              if (source === 'resources') {
                resourcesImageMap.set(imageId, { data: dataUrl, type });
                console.log(`Added image ${imageId} to resourcesImageMap`);
              } else {
                unitsImageMap.set(imageId, { data: dataUrl, type });
                console.log(`Added image ${imageId} to unitsImageMap`);
              }
            })
            .catch(error => {
              console.error(`Error loading image ${imageId}:`, error);
            });
          
          imagePromises.push(promise);
        }
        
        // Ждем загрузки всех изображений
        await Promise.all(imagePromises);
        
        console.log(`Loaded ${unitsImageMap.size} unit images and ${resourcesImageMap.size} resource images`);
      }
      
      // Создаем новое состояние приложения с нашими загруженными данными
      const newState = {
        units: {
          ...state.units,
          units: importData.units || [],
          items: importData.items || [],
          abilities: importData.abilities || [],
          imageMap: unitsImageMap.size > 0 ? unitsImageMap : state.units.imageMap, // Используем существующий map, если новый пустой
          nextImageId: Math.max(state.units.nextImageId, ...Array.from(unitsImageMap.keys())
            .filter(k => typeof k === 'string' && k.startsWith('id_'))
            .map(k => {
              const id = parseInt(k.substring(3).split('_')[0], 10);
              return isNaN(id) ? 0 : id;
            })
          ) + 1
        },
        resources: {
          ...state.resources,
          items: importData.resources?.items || [],
          categories: importData.resources?.categories || [],
          imageMap: resourcesImageMap.size > 0 ? resourcesImageMap : state.resources.imageMap, // Используем существующий map, если новый пустой
          nextImageId: Math.max(state.resources.nextImageId, ...Array.from(resourcesImageMap.keys())
            .filter(k => typeof k === 'string' && k.startsWith('id_'))
            .map(k => {
              const id = parseInt(k.substring(3).split('_')[0], 10);
              return isNaN(id) ? 0 : id;
            })
          ) + 1
        },
        recipes: importData.recipes || state.recipes,
        balance: importData.balance || state.balance,
        craftSystem: importData.craftSystem || {
          recipes: [],
          variants: [],
          nextRecipeId: 1,
          nextVariantId: 1
        },
        // Добавляем импорт данных MixingSystem
        mixingSystem: importData.mixingSystem || {
          recipes: [],
          spoiledFood: state.mixingSystem.spoiledFood,
          nextRecipeId: 1
        },
        // Добавляем импорт данных ShopSystem
        shopSystem: importData.shopSystem || {
          currencies: state.shopSystem?.currencies || [],
          traders: [],
          shops: [],
          nextTraderIdCounter: 1,
          nextShopIdCounter: 1
        }
      };
      
      // Проверяем ссылки на изображения в comparisonItems
      if (newState.balance?.comparisonItems) {
        console.log(`Checking ${newState.balance.comparisonItems.length} comparison items for image references`);
        let imageCount = 0;
        
        newState.balance.comparisonItems.forEach((item: {name: string, imageId?: string | null}) => {
          if (item.imageId) {
            const imageExists = unitsImageMap.has(item.imageId) || resourcesImageMap.has(item.imageId);
            console.log(`Item "${item.name}" has imageId "${item.imageId}" which ${imageExists ? 'exists' : 'does NOT exist'} in imageMap`);
            if (imageExists) imageCount++;
          }
        });
        
        console.log(`Found ${imageCount} items with valid image references`);
      }
      
      // Сохраняем ссылки на изображения в window (для восстановления в случае проблем)
      (window as any).__importedImages = {
        units: unitsImageMap,
        resources: resourcesImageMap
      };
      
      console.log("Сохранены ссылки на изображения в глобальном контексте:", {
        unitsSize: unitsImageMap.size,
        resourcesSize: resourcesImageMap.size
      });
      
      // Обновляем состояние через setFullState
      await setFullState(newState);
      console.log('State updated with setFullState');
      
      setIsImporting(false);
      console.log('Import completed successfully');
      alert('Project imported successfully!');
      
      // Сбрасываем значение инпута
      if (event.target) {
        event.target.value = '';
      }
    } catch (error) {
      console.error('Error importing project:', error);
      alert(`Error importing project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsImporting(false);
      
      // Сбрасываем значение инпута
      if (event.target) {
        event.target.value = '';
      }
    }
  };
  
  return (
    <div className="flex items-center space-x-3">
      <input
        type="file"
        id="import-project"
        ref={fileInputRef}
        accept=".zip"
        className="hidden"
        onChange={handleImportProject}
        disabled={isImporting}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
        className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center ${
          isImporting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isImporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Importing...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
            Import Project
          </>
        )}
      </button>
      
      <button
        onClick={handleExportProject}
        disabled={isExporting}
        className={`px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center ${
          isExporting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isExporting ? (
          <>
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Exporting...
          </>
        ) : (
          <>
            <svg className="w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export Project
          </>
        )}
      </button>
    </div>
  );
}