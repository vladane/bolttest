import { AppState } from '../contexts/AppStateContext';

/**
 * Подготавливает состояние приложения для экспорта
 * @param state Текущее состояние приложения
 * @returns Объект, готовый для JSON.stringify
 */
export function prepareStateForExport(state: AppState): any {
  console.log("Подготовка состояния для экспорта");
  
  // Создаем глубокую копию объекта для экспорта
  const exportState = {
    units: state.units.units || [],
    items: state.units.items || [],
    abilities: state.units.abilities || [],
    resources: {
      items: state.resources.items || [],
      categories: state.resources.categories || [],
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
    // Явно добавляем craftSystem в экспортируемые данные
    craftSystem: {
      recipes: JSON.parse(JSON.stringify(state.craftSystem.recipes || [])),
      variants: JSON.parse(JSON.stringify(state.craftSystem.variants || [])),
      nextRecipeId: state.craftSystem.nextRecipeId || 1,
      nextVariantId: state.craftSystem.nextVariantId || 1
    },
    // ДОБАВЛЯЕМ! Данные для mixingSystem
    mixingSystem: {
      recipes: JSON.parse(JSON.stringify(state.mixingSystem.recipes || [])),
      spoiledFood: JSON.parse(JSON.stringify(state.mixingSystem.spoiledFood || [])),
      nextRecipeId: state.mixingSystem.nextRecipeId || 1
    },
    // ДОБАВЛЯЕМ! Данные для shopSystem
    shopSystem: state.shopSystem ? {
      currencies: JSON.parse(JSON.stringify(state.shopSystem.currencies || [])),
      traders: JSON.parse(JSON.stringify(state.shopSystem.traders || [])),
      shops: JSON.parse(JSON.stringify(state.shopSystem.shops || [])),
      nextTraderIdCounter: state.shopSystem.nextTraderIdCounter || 1,
      nextShopIdCounter: state.shopSystem.nextShopIdCounter || 1
    } : undefined,
    imageMap: {}
  };
  
  console.log("Экспортируемые данные подготовлены:", {
    unitCount: exportState.units.length,
    resourcesCount: exportState.resources.items.length,
    craftSystemRecipesCount: exportState.craftSystem.recipes.length,
    mixingSystemRecipesCount: exportState.mixingSystem.recipes.length,
    shopSystemShopsCount: exportState.shopSystem?.shops?.length || 0
  });
  
  return exportState;
}