import { useState, useEffect, useRef } from 'react';
import { useAppState } from '../../contexts/AppStateContext';
import { getSavesList, saveGame, loadGame, deleteSave } from '../../utils/db';
import { registerStateGetter } from '../../utils/craftSystemExportPatch';

export default function SaveManager() {
  const { state, setFullState } = useAppState();
  const [saves, setSaves] = useState<any[]>([]);
  const [saveName, setSaveName] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'save' | 'load'>('save');
  const [isLoading, setIsLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const diagnosticsRef = useRef<{recipesCount: number}>({recipesCount: 0});
  
  // Загрузка списка сохранений при открытии модального окна
  useEffect(() => {
    if (isModalOpen) {
      loadSavesList();
    }
  }, [isModalOpen]);
  
  // Регистрируем функцию получения состояния для патча
  useEffect(() => {
    registerStateGetter(() => state);
  }, [state]);
  
  // Сохраняем диагностические данные при изменении рецептов
  useEffect(() => {
    diagnosticsRef.current.recipesCount = state.craftSystem.recipes.length;
    
    // Автоматическое резервное копирование рецептов при изменении
    try {
      if (state.craftSystem.recipes.length > 0) {
        const backupData = {
          recipes: JSON.parse(JSON.stringify(state.craftSystem.recipes)),
          variants: JSON.parse(JSON.stringify(state.craftSystem.variants)),
          nextRecipeId: state.craftSystem.nextRecipeId,
          nextVariantId: state.craftSystem.nextVariantId
        };
        localStorage.setItem('craftSystem_backup', JSON.stringify(backupData));
      }
    } catch (error) {
      console.error("Ошибка резервного копирования:", error);
    }
  }, [state.craftSystem.recipes]);
  
  const loadSavesList = async () => {
    try {
      setIsLoading(true);
      const savesList = await getSavesList();
      setSaves(savesList as any[]);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading saves list:', error);
      setIsLoading(false);
    }
  };
  
  // Функция для диагностики состояния (скрыта от пользователя)
  const diagnoseState = (label: string, data: any = null) => {
    const target = data || state;
    const craftRecipes = target.craftSystem?.recipes || [];
    console.log(`[ДИАГНОСТИКА ${label}]`, {
      unitsCount: target.units?.units?.length || 0,
      itemsCount: target.units?.items?.length || 0,
      abilitiesCount: target.units?.abilities?.length || 0,
      resourcesCount: target.resources?.items?.length || 0,
      craftRecipesCount: craftRecipes.length || 0,
      craftRecipeIds: craftRecipes.map((r: any) => r.id).slice(0, 5),
      nextRecipeId: target.craftSystem?.nextRecipeId,
      balanceItemsCount: target.balance?.comparisonItems?.length || 0,
    });
  };
  
  // Удалили неиспользуемые функции mapToObject и objectToMap
  
  // Функция для создания структуры данных для сохранения
  const prepareStateForSave = () => {
    // Создаем копию состояния без мутации оригинального объекта
    const stateToSave = {
      units: state.units.units || [],
      items: state.units.items || [],
      abilities: state.units.abilities || [],
      resources: {
        items: state.resources.items || [],
        categories: state.resources.categories || [],
        imageMap: {},
        nextImageId: state.resources.nextImageId || 1
      },
      recipes: {
        recipes: state.recipes.recipes || [],
        nextId: state.recipes.nextId || 1
      },
      balance: {
        currentConfig: JSON.parse(JSON.stringify(state.balance.currentConfig)),
        savedConfigs: JSON.parse(JSON.stringify(state.balance.savedConfigs)),
        comparisonItems: JSON.parse(JSON.stringify(state.balance.comparisonItems))
      },
      craftSystem: {
        recipes: JSON.parse(JSON.stringify(state.craftSystem.recipes || [])),
        variants: JSON.parse(JSON.stringify(state.craftSystem.variants || [])), 
        nextRecipeId: state.craftSystem.nextRecipeId || 1,
        nextVariantId: state.craftSystem.nextVariantId || 1
      },
      // Добавляем mixingSystem
      mixingSystem: {
        recipes: JSON.parse(JSON.stringify(state.mixingSystem.recipes || [])),
        spoiledFood: JSON.parse(JSON.stringify(state.mixingSystem.spoiledFood || [])),
        nextRecipeId: state.mixingSystem.nextRecipeId || 1
      },
      // Добавляем shopSystem
      shopSystem: state.shopSystem ? {
        currencies: JSON.parse(JSON.stringify(state.shopSystem.currencies || [])),
        traders: JSON.parse(JSON.stringify(state.shopSystem.traders || [])),
        shops: JSON.parse(JSON.stringify(state.shopSystem.shops || [])),
        nextTraderIdCounter: state.shopSystem.nextTraderIdCounter || 1,
        nextShopIdCounter: state.shopSystem.nextShopIdCounter || 1
      } : undefined,
      imageMap: {}
    };
    
    return stateToSave;
  };
  
  // Функция сохранения
  const handleSave = async () => {
    if (!saveName.trim()) {
      alert('Please enter a name for your save');
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Диагностика перед сохранением
      diagnoseState("ПЕРЕД СОХРАНЕНИЕМ");
      
      // Проверка на пустые структуры данных
      if (!state.units.units.length && !state.units.items.length && 
          !state.resources?.items?.length && !state.craftSystem?.recipes?.length) {
        if (!confirm("You're about to save a project with no data. Continue?")) {
          setIsLoading(false);
          return;
        }
      }
      
      // Подготавливаем данные для сохранения
      const stateToSave = prepareStateForSave();
      
      // Сохраняем дополнительную копию в localStorage (для страховки)
      try {
        localStorage.setItem('last_save_data', JSON.stringify({
          name: saveName,
          timestamp: new Date().toISOString(),
          craftSystemOnly: stateToSave.craftSystem
        }));
      } catch (error) {
        console.warn("Не удалось сохранить страховочную копию:", error);
      }
      
      // Сохраняем данные
      await saveGame(saveName, stateToSave);
      
      setSaveName('');
      setIsModalOpen(false);
      setIsLoading(false);
      alert('Game saved successfully!');
      
      // Обновляем список сохранений
      loadSavesList();
    } catch (error) {
      console.error('Error saving game:', error);
      alert(`Error saving game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };
  
  // Функция загрузки
  const handleLoad = async (saveId: string) => {
    try {
      setIsLoading(true);
      setImportError(null);
      
      // Загружаем данные
      let loadedData = await loadGame(saveId);
      
      // Проверка на существование данных
      if (!loadedData) {
        throw new Error("Save data is empty or corrupted");
      }
      
      // Диагностика загруженных данных
      diagnoseState("ЗАГРУЖЕННЫЕ ДАННЫЕ", loadedData);
      
      // Проверяем на наличие craftSystem в загруженных данных
      if (!loadedData.craftSystem) {
        // Попытка восстановления из localStorage
        try {
          const backupStr = localStorage.getItem('craftSystem_backup');
          if (backupStr) {
            loadedData.craftSystem = JSON.parse(backupStr);
          } else {
            // Создаем пустую структуру
            loadedData.craftSystem = {
              recipes: [],
              variants: [],
              nextRecipeId: 1,
              nextVariantId: 1
            };
          }
        } catch (error) {
          // Создаем пустую структуру как запасной вариант
          loadedData.craftSystem = {
            recipes: [],
            variants: [],
            nextRecipeId: 1,
            nextVariantId: 1
          };
        }
      }
      
      // Применяем импорт через setFullState
      if (setFullState) {
        await setFullState(loadedData);
        
        setIsModalOpen(false);
        setIsLoading(false);
        alert('Game loaded successfully!');
      } else {
        throw new Error("setFullState function is not available");
      }
    } catch (error) {
      console.error('Error loading game:', error);
      setImportError(`Error loading game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`Error loading game: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };
  
  // Функция для обработки загрузки файла импорта
  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setIsLoading(true);
    setImportError(null);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        // Парсим JSON из файла
        const jsonText = e.target?.result as string;
        
        const data = JSON.parse(jsonText);
        
        // Диагностика импортируемых данных
        diagnoseState("ИМПОРТИРУЕМЫЕ ДАННЫЕ", data);
        
        // Проверяем валидность данных
        if (!data || typeof data !== 'object') {
          throw new Error("Invalid file format. Expected a JSON object.");
        }
        
        // Проверяем наличие craftSystem в импортируемых данных
        if (!data.craftSystem) {
          // Пробуем восстановить из резервной копии
          try {
            const backupStr = localStorage.getItem('craftSystem_backup');
            if (backupStr) {
              data.craftSystem = JSON.parse(backupStr);
            } else {
              // Создаем пустой craftSystem, если он отсутствует
              data.craftSystem = {
                recipes: [],
                variants: [],
                nextRecipeId: 1,
                nextVariantId: 1
              };
            }
          } catch (error) {
            // Создаем пустую структуру
            data.craftSystem = {
              recipes: [],
              variants: [],
              nextRecipeId: 1,
              nextVariantId: 1
            };
          }
        }
        
        // Применяем импорт через setFullState
        await setFullState(data);
        
        // Закрываем модальное окно и показываем сообщение об успехе
        setIsModalOpen(false);
        setIsLoading(false);
        alert('Import successful!');
      } catch (error) {
        console.error('Error importing file:', error);
        setImportError(`Error importing file: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    };
    
    reader.onerror = () => {
      setImportError("Error reading file");
      setIsLoading(false);
    };
    
    reader.readAsText(file);
  };
  
  const handleDelete = async (saveId: string) => {
    if (confirm('Are you sure you want to delete this save?')) {
      try {
        setIsLoading(true);
        await deleteSave(saveId);
        setIsLoading(false);
        loadSavesList();
      } catch (error) {
        console.error('Error deleting save:', error);
        alert(`Error deleting save: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsLoading(false);
      }
    }
  };
  
  const openModal = (type: 'save' | 'load') => {
    setModalType(type);
    setIsModalOpen(true);
    setImportError(null);
  };
  
  // Форматирование даты
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch (e) {
      return dateString;
    }
  };
  
  return (
    <>
      <div className="flex space-x-2 flex-wrap gap-2">
        <button
          onClick={() => openModal('save')}
          className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
        >
          Save Project
        </button>
        <button
          onClick={() => openModal('load')}
          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Load Project
        </button>
      </div>
      
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">
              {modalType === 'save' ? 'Save Project' : 'Load Project'}
            </h2>
            
            {importError && (
              <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-md">
                {importError}
              </div>
            )}
            
            {modalType === 'save' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Save Name</label>
                <input
                  type="text"
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="Enter save name"
                />
              </div>
            )}
            
            {modalType === 'load' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Import from File</label>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Or select from saved projects below
                </p>
              </div>
            )}
            
            <div className="max-h-60 overflow-y-auto mb-4">
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
                </div>
              ) : saves.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-3">
                  No saves yet
                </p>
              ) : (
                <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {saves.map((save) => (
                    <li key={save.id} className="py-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium">{save.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(save.timestamp)}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          {modalType === 'load' && (
                            <button
                              onClick={() => handleLoad(save.id)}
                              className="px-2 py-1 bg-blue-600 text-white rounded text-sm"
                            >
                              Load
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(save.id)}
                            className="px-2 py-1 bg-red-600 text-white rounded text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-md"
              >
                Cancel
              </button>
              
              {modalType === 'save' && (
                <button
                  onClick={handleSave}
                  disabled={isLoading || !saveName.trim()}
                  className={`px-4 py-2 bg-green-600 text-white rounded-md ${
                    isLoading || !saveName.trim() ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                  }`}
                >
                  {isLoading ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}