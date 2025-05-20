/**
 * Патч для функции экспорта, добавляющий системы в экспортируемые данные
 */

// Оригинальная функция JSON.stringify
const originalStringify = JSON.stringify;

// Метод для получения текущего состояния
let getAppState = () => null;

// Переменные для дебаунсинга и предотвращения множественных обновлений
let updateDebounceTimer = null;
let lastUpdateTime = 0;
let isUpdating = false;
let pendingUpdate = false;
const UPDATE_INTERVAL = 2500; // Минимальный интервал между обновлениями (2.5 секунды)

// Регистрация функции получения состояния
export function registerStateGetter(stateGetter) {
  // Предотвращаем множественные регистрации
  if (getAppState !== null && getAppState !== (() => null)) {
    console.log('CraftSystemPatch: State getter already registered, skipping redundant registration');
    return;
  }
  
  getAppState = stateGetter;
  console.log('CraftSystemPatch: State getter registered');
}

// Функция для обновления craftValue с дебаунсингом
function scheduleCraftValueUpdate() {
  // Если обновление уже выполняется, отмечаем, что есть ожидающее обновление
  if (isUpdating) {
    pendingUpdate = true;
    console.log('CraftSystemPatch: Обновление уже выполняется, запрос поставлен в очередь');
    return;
  }
  
  // Проверяем, прошло ли достаточно времени с последнего обновления
  const now = Date.now();
  const timeSinceLastUpdate = now - lastUpdateTime;
  
  if (timeSinceLastUpdate < UPDATE_INTERVAL) {
    // Если обновление было недавно, планируем его с задержкой
    console.log(`CraftSystemPatch: Слишком частое обновление, откладываем на ${UPDATE_INTERVAL - timeSinceLastUpdate}мс`);
    clearTimeout(updateDebounceTimer);
    updateDebounceTimer = setTimeout(() => {
      processCraftValueUpdate();
    }, UPDATE_INTERVAL - timeSinceLastUpdate);
    return;
  }
  
  // Если прошло достаточно времени, выполняем обновление немедленно
  processCraftValueUpdate();
}

// Функция для фактического выполнения обновления craftValue
function processCraftValueUpdate() {
  if (isUpdating) return;
  isUpdating = true;
  
  try {
    const appState = getAppState();
    if (!appState || !appState.balance || !appState.balance.updateCraftValuesForAllItems) {
      console.error('CraftSystemPatch: Функция обновления craftValue недоступна');
      isUpdating = false;
      return;
    }
    
    console.log('CraftSystemPatch: Выполняется обновление craftValue...');
    
    // Запускаем обновление, используя функцию из контекста баланса
    appState.balance.updateCraftValuesForAllItems();
    
    // Обновляем время последнего обновления
    lastUpdateTime = Date.now();
    
    // После небольшой задержки сбрасываем флаг обновления
    setTimeout(() => {
      isUpdating = false;
      
      // Если есть отложенное обновление, запускаем его
      if (pendingUpdate) {
        pendingUpdate = false;
        scheduleCraftValueUpdate();
      }
    }, 300);
    
  } catch (error) {
    console.error('CraftSystemPatch: Ошибка при обновлении craftValue:', error);
    isUpdating = false;
  }
}

// Перехват оригинальной функции JSON.stringify
JSON.stringify = function(obj, replacer, space) {
  // Проверяем, является ли объект экспортируемыми данными
  if (obj && typeof obj === 'object' && obj.balance && obj.balance.comparisonItems 
      && obj.resources && !obj.craftSystem) {
    
    console.log('CraftSystemPatch: Обнаружены экспортируемые данные без нужных систем, добавляем...');
    
    try {
      // Получаем текущее состояние приложения
      const appState = getAppState();
      
      if (appState) {
        // Клонируем объект, чтобы не изменять оригинал
        const patchedObj = { ...obj };
        
        // Добавляем craftSystem
        if (appState.craftSystem) {
          patchedObj.craftSystem = {
            recipes: JSON.parse(JSON.stringify(appState.craftSystem.recipes || [])),
            variants: JSON.parse(JSON.stringify(appState.craftSystem.variants || [])),
            nextRecipeId: appState.craftSystem.nextRecipeId || 1,
            nextVariantId: appState.craftSystem.nextVariantId || 1
          };
          console.log(`CraftSystemPatch: craftSystem добавлен с ${patchedObj.craftSystem.recipes.length} рецептами`);
        }
        
        // Добавляем mixingSystem
        if (appState.mixingSystem && !patchedObj.mixingSystem) {
          patchedObj.mixingSystem = {
            recipes: JSON.parse(JSON.stringify(appState.mixingSystem.recipes || [])),
            spoiledFood: JSON.parse(JSON.stringify(appState.mixingSystem.spoiledFood || [])),
            nextRecipeId: appState.mixingSystem.nextRecipeId || 1
          };
          console.log(`CraftSystemPatch: mixingSystem добавлен с ${patchedObj.mixingSystem.recipes.length} рецептами`);
        }
        
        // Добавляем shopSystem
        if (appState.shopSystem && !patchedObj.shopSystem) {
          patchedObj.shopSystem = {
            currencies: JSON.parse(JSON.stringify(appState.shopSystem.currencies || [])),
            traders: JSON.parse(JSON.stringify(appState.shopSystem.traders || [])),
            shops: JSON.parse(JSON.stringify(appState.shopSystem.shops || [])),
            nextTraderIdCounter: appState.shopSystem.nextTraderIdCounter || 1,
            nextShopIdCounter: appState.shopSystem.nextShopIdCounter || 1
          };
          console.log(`CraftSystemPatch: shopSystem добавлен с ${patchedObj.shopSystem.shops.length} магазинами`);
        }
        
        // Вызываем оригинальную функцию с модифицированным объектом
        return originalStringify(patchedObj, replacer, space);
      } else {
        console.warn('CraftSystemPatch: Не удалось получить состояние приложения');
      }
    } catch (error) {
      console.error('CraftSystemPatch: Ошибка при патче данных:', error);
    }
  }
  
  // Для всех остальных случаев - вызываем оригинальную функцию
  return originalStringify(obj, replacer, space);
};

// Функция для создания ссылки на скачивание JSON файла с исправленными данными
export function downloadFixedJSON(filename) {
  try {
    // Получаем текущее состояние приложения
    const appState = getAppState();
    
    if (!appState) {
      console.error('CraftSystemPatch: Не удалось получить состояние приложения');
      return false;
    }
    
    // Планируем обновление craftValue, но с дебаунсингом
    scheduleCraftValueUpdate();
    
    // Создаем объект в формате экспорта
    const exportData = {
      units: appState.units.units || [],
      items: appState.units.items || [],
      abilities: appState.units.abilities || [],
      resources: {
        items: appState.resources.items || [],
        categories: appState.resources.categories || [],
        imageMap: {},
        nextImageId: appState.resources.nextImageId || 1
      },
      recipes: {
        recipes: appState.recipes.recipes || [],
        nextId: appState.recipes.nextId || 1
      },
      balance: {
        currentConfig: appState.balance.currentConfig,
        savedConfigs: appState.balance.savedConfigs,
        comparisonItems: appState.balance.comparisonItems
      },
      // Явно добавляем craftSystem
      craftSystem: {
        recipes: appState.craftSystem.recipes || [],
        variants: appState.craftSystem.variants || [],
        nextRecipeId: appState.craftSystem.nextRecipeId || 1,
        nextVariantId: appState.craftSystem.nextVariantId || 1
      },
      // Добавляем mixingSystem
      mixingSystem: appState.mixingSystem ? {
        recipes: appState.mixingSystem.recipes || [],
        spoiledFood: appState.mixingSystem.spoiledFood || [],
        nextRecipeId: appState.mixingSystem.nextRecipeId || 1
      } : undefined,
      // Добавляем shopSystem
      shopSystem: appState.shopSystem ? {
        currencies: appState.shopSystem.currencies || [],
        traders: appState.shopSystem.traders || [],
        shops: appState.shopSystem.shops || [],
        nextTraderIdCounter: appState.shopSystem.nextTraderIdCounter || 1,
        nextShopIdCounter: appState.shopSystem.nextShopIdCounter || 1
      } : undefined,
      imageMap: {}
    };
    
    // Создаем строку JSON
    const jsonString = JSON.stringify(exportData, null, 2);
    
    // Создаем Blob
    const blob = new Blob([jsonString], { type: 'application/json' });
    
    // Создаем URL для скачивания
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'game-data-with-craftsystem.json';
    
    // Добавляем на страницу и кликаем
    document.body.appendChild(a);
    a.click();
    
    // Удаляем ссылку из DOM
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
    
    return true;
  } catch (error) {
    console.error('CraftSystemPatch: Ошибка при создании исправленного JSON:', error);
    return false;
  }
}