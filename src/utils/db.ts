const DB_NAME = 'game-builder-db';
const DB_VERSION = 1;
const STORES = {
  SAVES: 'saves'
};

export async function openDatabase(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Проверяем, существует ли хранилище saves
      if (!db.objectStoreNames.contains(STORES.SAVES)) {
        db.createObjectStore(STORES.SAVES, { keyPath: 'id' });
      }
    };
    
    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };
    
    request.onerror = (event) => {
      reject(`Database error: ${(event.target as IDBOpenDBRequest).error}`);
    };
  });
}

// Функция для проверки наличия craftSystem в данных перед сохранением
function ensureCraftSystemExists(data: any): any {
  if (!data) return data;
  
  try {
    // Проверка прямого доступа к craftSystem
    if (!data.craftSystem) {
      console.warn('[DB] craftSystem отсутствует в данных!');
      
      // Попытка найти craftSystem в другом месте (например, в data.data)
      if (data.data && data.data.craftSystem) {
        data.craftSystem = JSON.parse(JSON.stringify(data.data.craftSystem));
        console.log('[DB] craftSystem найден в data.data и перемещен на верхний уровень');
      } else {
        // Создаем пустую структуру craftSystem
        data.craftSystem = {
          recipes: [],
          variants: [],
          nextRecipeId: 1,
          nextVariantId: 1
        };
        console.log('[DB] Создан пустой craftSystem');
      }
    } else {
      console.log(`[DB] craftSystem найден, содержит ${data.craftSystem.recipes?.length || 0} рецептов`);
    }
    
    // Добавляем дополнительное резервное копирование в localStorage
    try {
      if (data.craftSystem && data.craftSystem.recipes && data.craftSystem.recipes.length > 0) {
        localStorage.setItem('craftSystem_backup', JSON.stringify(data.craftSystem));
        console.log(`[DB] Резервная копия craftSystem сохранена с ${data.craftSystem.recipes.length} рецептами`);
      }
    } catch (error) {
      console.error('[DB] Ошибка при создании резервной копии:', error);
    }
    
    return data;
  } catch (error) {
    console.error('[DB] Ошибка обеспечения craftSystem:', error);
    return data; // Возвращаем оригинальные данные в случае ошибки
  }
}

export async function saveGame(name: string, data: any): Promise<string> {
  const db = await openDatabase();
  return new Promise<string>((resolve, reject) => {
    const transaction = db.transaction([STORES.SAVES], 'readwrite');
    const store = transaction.objectStore(STORES.SAVES);
    
    try {
      // ВАЖНО: Проверяем наличие craftSystem перед сохранением
      const processedData = ensureCraftSystemExists(data);
      
      // Проверяем структуру processedData перед сохранением
      console.log('[DB] Проверка структуры данных перед сохранением:', {
        hasCraftSystem: !!processedData.craftSystem,
        craftRecipesCount: processedData.craftSystem?.recipes?.length || 0
      });
      
      const saveData = {
        id: name,
        name: name,
        data: processedData,
        timestamp: new Date().toISOString()
      };
      
      // Логируем объект, который будет сохранен
      console.log(`[DB] Сохраняем данные с ${saveData.data.craftSystem?.recipes?.length || 0} рецептами`);
      
      const request = store.put(saveData);
      
      request.onsuccess = () => {
        console.log(`[DB] Сохранение успешно: ${name}, рецептов: ${processedData.craftSystem?.recipes?.length || 0}`);
        resolve(name);
      };
      
      request.onerror = () => {
        console.error('[DB] Ошибка при сохранении:', request.error);
        reject(request.error);
      };
    } catch (error) {
      console.error('[DB] Критическая ошибка при подготовке данных:', error);
      reject(error);
    }
  });
}

// Проверяем наличие craftSystem в загруженных данных
function checkAndRepairLoadedData(data: any): any {
  if (!data) return data;
  
  try {
    console.log('[DB] Проверка загруженных данных:', {
      hasData: !!data,
      hasCraftSystem: !!data.craftSystem
    });
    
    if (!data.craftSystem) {
      console.warn('[DB] В загруженных данных отсутствует craftSystem!');
      
      // Пробуем восстановить из резервной копии в localStorage
      try {
        const backup = localStorage.getItem('craftSystem_backup');
        if (backup) {
          data.craftSystem = JSON.parse(backup);
          console.log(`[DB] Восстановлен craftSystem из резервной копии: ${data.craftSystem.recipes?.length || 0} рецептов`);
        } else {
          // Создаем пустую структуру
          data.craftSystem = {
            recipes: [],
            variants: [],
            nextRecipeId: 1,
            nextVariantId: 1
          };
          console.log('[DB] Создан пустой craftSystem, резервная копия отсутствует');
        }
      } catch (error) {
        console.error('[DB] Ошибка при восстановлении из резервной копии:', error);
        // Создаем пустую структуру
        data.craftSystem = {
          recipes: [],
          variants: [],
          nextRecipeId: 1,
          nextVariantId: 1
        };
      }
    } else {
      console.log(`[DB] craftSystem найден: ${data.craftSystem.recipes?.length || 0} рецептов`);
    }
    
    return data;
  } catch (error) {
    console.error('[DB] Ошибка при проверке/восстановлении данных:', error);
    return data; // Возвращаем оригинальные данные в случае ошибки
  }
}

export async function loadGame(id: string): Promise<any> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SAVES], 'readonly');
    const store = transaction.objectStore(STORES.SAVES);
    const request = store.get(id);
    
    request.onsuccess = () => {
      if (request.result) {
        console.log("[DB] Raw DB result:", request.result);
        
        // Получаем данные из ответа
        let resultData = request.result.data;
        
        // ВАЖНО: Проверяем наличие craftSystem в загруженных данных
        resultData = checkAndRepairLoadedData(resultData);
        
        console.log(`[DB] Загружены данные с ${resultData.craftSystem?.recipes?.length || 0} рецептами`);
        resolve(resultData);
      } else {
        console.error("No save found with ID:", id);
        reject(new Error(`No save found with ID: ${id}`));
      }
    };
    
    request.onerror = () => {
      console.error("Error loading save:", request.error);
      reject(request.error);
    };
  });
}

export async function getSavesList(): Promise<any[]> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SAVES], 'readonly');
    const store = transaction.objectStore(STORES.SAVES);
    const request = store.getAll();
    
    request.onsuccess = () => {
      resolve(request.result);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

export async function deleteSave(id: string): Promise<boolean> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.SAVES], 'readwrite');
    const store = transaction.objectStore(STORES.SAVES);
    const request = store.delete(id);
    
    request.onsuccess = () => {
      resolve(true);
    };
    
    request.onerror = () => {
      reject(request.error);
    };
  });
}

// Добавьте алиас для обратной совместимости если где-то используется deleteGame
export const deleteGame = deleteSave;