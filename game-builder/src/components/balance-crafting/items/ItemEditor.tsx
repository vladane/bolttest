// src/components/balance-crafting/items/ItemEditor.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useBalance, ItemData } from '../../../contexts/BalanceContext';
import { useAppState } from '../../../contexts/AppStateContext';
import FormulaPreview from '../balance/FormulaPreview';
import ImageUpload from '../../common/ImageUpload';
import { getImageUrl as getImageUrlUtil } from '../../../utils/imageUtils';

// Константы для длительности сезонов в днях - обновлено до 28 дней для всех сезонов
const SEASON_LENGTHS: Record<string, number> = {
  'Весна': 28,
  'Лето': 28,
  'Осень': 28,
  'Зима': 28
};

const DEFAULT_ITEM: ItemData = {
  name: '',
  tier: 1,
  mechanic: 'Найти в мире',
  selectedCategories: [],
  selectedModifiers: [],
  selectedLocations: [],
  frequencyType: 'Часто встречаемый',
  craftComplexity: 'Не крафтиться',
  imageId: null,
  subType: '', // Поле подтипа
  
  // Поля для урожая
  isHarvest: false,
  growingSeason: [],
  growingTime: 0,
  harvestPerSeason: 1,
  seedCost: 0,
  
  // Поля для топлива
  isFuel: false,
  fuelEfficiency: 1
};

interface ItemEditorProps {
  itemToEdit?: ItemData | null;
  onBack?: () => void;
}

const ItemEditor: React.FC<ItemEditorProps> = ({ itemToEdit, onBack }) => {
  const { state, updateState } = useAppState();
  const balance = useBalance();
  const { calculateItemCost, currentConfig } = balance;
  
  // Состояния для редактирования предмета
  const [item, setItem] = useState<ItemData>({ ...DEFAULT_ITEM });
  const [editMode, setEditMode] = useState<'new' | 'edit'>('new');
  const [savedItems, setSavedItems] = useState<ItemData[]>([]);
  const [editingItemOriginalName, setEditingItemOriginalName] = useState<string | null>(null);
  
  // Состояния для фильтрации опций
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [modifierFilter, setModifierFilter] = useState<string>('');
  const [locationFilter, setLocationFilter] = useState<string>('');
  
  // Состояние для вкладок редактирования
  const [activeTab, setActiveTab] = useState<'general' | 'harvest' | 'fuel'>('general');
  
  // Инициализация при получении предмета для редактирования через props
  useEffect(() => {
    if (itemToEdit) {
      setItem({ ...itemToEdit });
      setEditMode('edit');
      setEditingItemOriginalName(itemToEdit.name);
      
      // Автоматически переключаемся на вкладку урожая, если это урожай
      if (itemToEdit.isHarvest) {
        setActiveTab('harvest');
      }
      // Автоматически переключаемся на вкладку топлива, если это топливо
      else if (itemToEdit.isFuel) {
        setActiveTab('fuel');
      }
    }
  }, [itemToEdit]);
  
  // Загружаем сохраненные предметы при монтировании
  useEffect(() => {
    setSavedItems(state.balance.comparisonItems);
  }, [state.balance.comparisonItems]);
  
  // Функция для получения списка предметов с категорией "Семечко"
  const getAvailableSeeds = useMemo(() => {
    return savedItems.filter((item: ItemData) => 
      item.selectedCategories.includes('Семечко') || 
      item.name.toLowerCase().includes('семена') || 
      item.name.toLowerCase().includes('семя') ||
      item.name.toLowerCase().includes('семечк')
    );
  }, [savedItems]);
  
  // Загружаем предмет для редактирования, если указан
  const loadItemForEditing = (itemName: string): void => {
    const itemToEdit = savedItems.find(i => i.name === itemName);
    if (itemToEdit) {
      setItem({ ...itemToEdit });
      setEditMode('edit');
      setEditingItemOriginalName(itemName);
      
      // Автоматически переключаемся на вкладку урожая, если это урожай
      if (itemToEdit.isHarvest) {
        setActiveTab('harvest');
      }
      // Автоматически переключаемся на вкладку топлива, если это топливо
      else if (itemToEdit.isFuel) {
        setActiveTab('fuel');
      }
    }
  };
  
  // Вычисляем доступные параметры
  const {
    categories,
    mechanics,
    modifiers,
    locations,
    frequencyTypes,
    craftComplexityTypes
  } = useMemo(() => {
    return {
      categories: Object.keys(currentConfig.categories),
      mechanics: Object.keys(currentConfig.mechanics),
      modifiers: Object.keys(currentConfig.modifiers),
      locations: Object.keys(currentConfig.locations),
      frequencyTypes: Object.keys(currentConfig.frequencyTypes || {}),
      craftComplexityTypes: Object.keys(currentConfig.craftComplexityTypes || {})
    };
  }, [currentConfig]);
  
  // Список сезонов для урожая
  const seasons = useMemo(() => {
    return currentConfig.seasons || ['Весна', 'Лето', 'Осень', 'Зима'];
  }, [currentConfig.seasons]);
  
  // Фильтрованные списки для отображения
  const filteredCategories = useMemo(() => {
    return categories.filter(cat => 
      cat.toLowerCase().includes(categoryFilter.toLowerCase())
    );
  }, [categories, categoryFilter]);
  
  const filteredModifiers = useMemo(() => {
    return modifiers.filter(mod => 
      mod.toLowerCase().includes(modifierFilter.toLowerCase())
    );
  }, [modifiers, modifierFilter]);
  
  const filteredLocations = useMemo(() => {
    return locations.filter(loc => 
      loc.toLowerCase().includes(locationFilter.toLowerCase())
    );
  }, [locations, locationFilter]);
  
  // Функция для расчета стандартных компонентов стоимости предмета (ВСЕГДА возвращает стандартные компоненты)
  const calculateItemComponents = (item: ItemData): Record<string, number> => {
    // Расчет стандартных компонентов стоимости для предметов (даже для урожая)
    const categorySum = item.selectedCategories.reduce((sum, cat) => {
      return sum + (currentConfig.categories[cat] || 0);
    }, 0);

    const categoryValue = item.selectedCategories.length > 0 
      ? categorySum / item.selectedCategories.length 
      : 0;
      
    const tierValue = 1 + (item.tier - 1) * currentConfig.tierMultiplier;
    const mechanicValue = currentConfig.mechanics[item.mechanic] || 1;

    const modifiersSum = item.selectedModifiers.reduce((sum, mod) => {
      return sum + (currentConfig.modifiers[mod] || 0);
    }, 0);

    const locationsSum = item.selectedLocations.reduce((sum, loc) => {
      return sum + (currentConfig.locations[loc] || 0);
    }, 0);

    const locationsValue = item.selectedLocations.length > 0 
      ? locationsSum / item.selectedLocations.length 
      : 1;

    const modifiersValue = item.selectedModifiers.length > 0 
      ? modifiersSum / item.selectedModifiers.length 
      : 1;

    const frequencyValue = currentConfig.frequencyTypes[item.frequencyType] || 1.0;
    const craftComplexityValue = currentConfig.craftComplexityTypes[item.craftComplexity] || 1.0;

    // Учитываем модификатор подтипа, если он есть
    const subTypeValue = item.subType && currentConfig.subTypeModifiers 
      ? currentConfig.subTypeModifiers[item.subType] || 1.0
      : 1.0;

    // Рассчитываем компоненты формулы с учетом весов
    const categoryComponent = currentConfig.weights.categoryWeight * categoryValue;
    const tierComponent = currentConfig.weights.tierWeight * tierValue;
    const mechanicComponent = currentConfig.weights.mechanicWeight * mechanicValue;
    const modifiersComponent = currentConfig.weights.modifiersWeight * modifiersValue;
    const locationsComponent = currentConfig.weights.locationsWeight * locationsValue;
    const frequencyComponent = (currentConfig.weights.frequencyWeight || 0) * frequencyValue;
    const craftComplexityComponent = (currentConfig.weights.craftComplexityWeight || 0) * craftComplexityValue;
    
    // Добавляем компонент подтипа, если подтип указан
    const components: Record<string, number> = {
      'Категория': Math.round(currentConfig.baseValue * categoryComponent),
      'Тир': Math.round(currentConfig.baseValue * tierComponent),
      'Механика': Math.round(currentConfig.baseValue * mechanicComponent),
      'Модификаторы': Math.round(currentConfig.baseValue * modifiersComponent),
      'Локации': Math.round(currentConfig.baseValue * locationsComponent),
      'Частота': Math.round(currentConfig.baseValue * frequencyComponent),
      'Сложность крафта': Math.round(currentConfig.baseValue * craftComplexityComponent)
    };
    
    // Добавляем компонент подтипа только если он указан и имеет модификатор
    if (item.subType && subTypeValue !== 1.0 && currentConfig.subTypeModifiers && currentConfig.subTypeModifiers[item.subType]) {
      components['Подтип'] = Math.round(currentConfig.baseValue * (subTypeValue - 1));
    }

    return components;
  };
  
  // Вычисляем стоимость текущего предмета
  const { cost, components } = useMemo(() => {
    const cost = calculateItemCost(item);
    const components = calculateItemComponents(item);
    return { cost, components };
  }, [item, calculateItemCost, calculateItemComponents, currentConfig]);
  
  // Расчет стоимости урожая для отображения
  const calculateHarvestCost = (): {
    seedCost: number;
    growingTime: number;
    dayMultiplier: number;
    growingCost: number;
    totalCost: number;
    harvestPerSeason: number;
    unitCost: number;
  } | null => {
    if (!item.isHarvest) return null;
    
    const seedCost = item.seedCost || 0;
    const growingTime = item.growingTime || 0;
    const harvestPerSeason = item.harvestPerSeason || 1;
    const dayMultiplier = currentConfig.growthDayMultiplier || 1.0;
    
    const growingCost = growingTime * dayMultiplier;
    const totalCost = seedCost + growingCost;
    const unitCost = totalCost / harvestPerSeason;
    
    return {
      seedCost,
      growingTime,
      dayMultiplier,
      growingCost,
      totalCost,
      harvestPerSeason,
      unitCost
    };
  };
  
  const harvestCost = useMemo(() => {
    return calculateHarvestCost();
  }, [item.isHarvest, item.seedCost, item.growingTime, item.harvestPerSeason, currentConfig.growthDayMultiplier]);
  
  // Расчет максимального количества урожаев за сезон
  const calculateMaxHarvestsPerSeason = (growingTime: number, seasons: string[]): number => {
    if (!growingTime || growingTime <= 0 || !seasons || seasons.length === 0) {
      return 1;
    }
    
    // Берем минимальную длину из выбранных сезонов
    const minSeasonLength = Math.min(...seasons.map(season => SEASON_LENGTHS[season] || 28));
    
    // Рассчитываем количество полных урожаев
    const maxHarvests = Math.floor(minSeasonLength / growingTime);
    
    // Возвращаем минимум 1 урожай
    return Math.max(1, maxHarvests);
  };
  
  // Обработчики изменения полей предмета
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setItem({ ...item, name: e.target.value });
  };
  
  const handleTierChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setItem({ ...item, tier: parseInt(e.target.value) });
  };
  
  const handleMechanicChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setItem({ ...item, mechanic: e.target.value });
  };
  
  // Обработчики для чекбоксов
  const handleCategoryToggle = (category: string): void => {
    setItem(prev => {
      const isSelected = prev.selectedCategories.includes(category);
      
      if (isSelected) {
        return {
          ...prev,
          selectedCategories: prev.selectedCategories.filter(c => c !== category)
        };
      } else {
        return {
          ...prev,
          selectedCategories: [...prev.selectedCategories, category]
        };
      }
    });
  };
  
  const handleModifierToggle = (modifier: string): void => {
    setItem(prev => {
      const isSelected = prev.selectedModifiers.includes(modifier);
      
      if (isSelected) {
        return {
          ...prev,
          selectedModifiers: prev.selectedModifiers.filter(m => m !== modifier)
        };
      } else {
        return {
          ...prev,
          selectedModifiers: [...prev.selectedModifiers, modifier]
        };
      }
    });
  };
  
  const handleLocationToggle = (location: string): void => {
    setItem(prev => {
      const isSelected = prev.selectedLocations.includes(location);
      
      if (isSelected) {
        return {
          ...prev,
          selectedLocations: prev.selectedLocations.filter(l => l !== location)
        };
      } else {
        return {
          ...prev,
          selectedLocations: [...prev.selectedLocations, location]
        };
      }
    });
  };
  
  // Обновленный обработчик для переключения сезонов с автоматическим пересчетом
  const handleSeasonToggle = (season: string): void => {
    setItem(prev => {
      const isSelected = prev.growingSeason?.includes(season) || false;
      
      let newGrowingSeason;
      if (isSelected) {
        newGrowingSeason = prev.growingSeason?.filter(s => s !== season) || [];
      } else {
        newGrowingSeason = [...(prev.growingSeason || []), season];
      }
      
      // Автоматически пересчитываем количество урожаев при изменении сезонов
      if (prev.isHarvest && newGrowingSeason.length > 0 && (prev.growingTime || 0) > 0) {
        const maxHarvests = calculateMaxHarvestsPerSeason(prev.growingTime || 0, newGrowingSeason);
        return {
          ...prev,
          growingSeason: newGrowingSeason,
          harvestPerSeason: maxHarvests
        };
      }
      
      return {
        ...prev,
        growingSeason: newGrowingSeason
      };
    });
  };
  
  // Обработчики для выбора всех сезонов или снятия всех сезонов
  const handleSelectAllSeasons = (): void => {
    setItem(prev => {
      // Автоматически пересчитываем количество урожаев при выборе всех сезонов
      if (prev.isHarvest && (prev.growingTime || 0) > 0) {
        const maxHarvests = calculateMaxHarvestsPerSeason(prev.growingTime || 0, seasons);
        return {
          ...prev,
          growingSeason: [...seasons],
          harvestPerSeason: maxHarvests
        };
      }
      
      return {
        ...prev,
        growingSeason: [...seasons]
      };
    });
  };
  
  const handleDeselectAllSeasons = (): void => {
    setItem(prev => ({
      ...prev,
      growingSeason: []
    }));
  };
  
  // Обработчики "Выбрать все" / "Снять все"
  const handleSelectAllCategories = (): void => {
    setItem(prev => ({
      ...prev,
      selectedCategories: [...filteredCategories]
    }));
  };
  
  const handleDeselectAllCategories = (): void => {
    setItem(prev => ({
      ...prev,
      selectedCategories: prev.selectedCategories.filter(
        cat => !filteredCategories.includes(cat)
      )
    }));
  };
  
  const handleSelectAllModifiers = (): void => {
    setItem(prev => ({
      ...prev,
      selectedModifiers: [...filteredModifiers]
    }));
  };
  
  const handleDeselectAllModifiers = (): void => {
    setItem(prev => ({
      ...prev,
      selectedModifiers: prev.selectedModifiers.filter(
        mod => !filteredModifiers.includes(mod)
      )
    }));
  };
  
  const handleSelectAllLocations = (): void => {
    setItem(prev => ({
      ...prev,
      selectedLocations: [...filteredLocations]
    }));
  };
  
  const handleDeselectAllLocations = (): void => {
    setItem(prev => ({
      ...prev,
      selectedLocations: prev.selectedLocations.filter(
        loc => !filteredLocations.includes(loc)
      )
    }));
  };
  
  const handleFrequencyTypeChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setItem({ ...item, frequencyType: e.target.value });
  };
  
  const handleCraftComplexityChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    setItem({ ...item, craftComplexity: e.target.value });
  };
  
  // Обновленный обработчик для полей урожая
  const handleIsHarvestChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const isHarvest = e.target.checked;
    
    // Создаем обновленный объект предмета
    let updatedItem = { ...item, isHarvest };
    
    // Если включили режим урожая, устанавливаем категорию "Урожай" если она есть
    if (isHarvest) {
      if (categories.includes('Урожай') && !item.selectedCategories.includes('Урожай')) {
        updatedItem.selectedCategories = [...updatedItem.selectedCategories, 'Урожай'];
      }
      
      // Автоматически выбираем сезон Весна если не выбрано ни одного
      if (!updatedItem.growingSeason || updatedItem.growingSeason.length === 0) {
        updatedItem.growingSeason = ['Весна'];
      }
      
      // Устанавливаем минимальное время роста, если оно не задано
      if (!updatedItem.growingTime || updatedItem.growingTime <= 0) {
        updatedItem.growingTime = 10; // Значение по умолчанию, например 10 дней
      }
      
      // Автоматически рассчитываем количество урожаев
      if (updatedItem.growingSeason && updatedItem.growingSeason.length > 0 && updatedItem.growingTime > 0) {
        const maxHarvests = calculateMaxHarvestsPerSeason(updatedItem.growingTime, updatedItem.growingSeason);
        updatedItem.harvestPerSeason = maxHarvests;
      }
    }
    
    setItem(updatedItem);
  };
  
  // Обработчик для включения/выключения топлива
  const handleIsFuelChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const isFuel = e.target.checked;
    
    // Создаем обновленный объект предмета
    let updatedItem = { ...item, isFuel };
    
    // Если включили режим топлива, устанавливаем категорию "Топливо" если она есть
    if (isFuel) {
      if (categories.includes('Топливо') && !item.selectedCategories.includes('Топливо')) {
        updatedItem.selectedCategories = [...updatedItem.selectedCategories, 'Топливо'];
      }
      
      // Устанавливаем стандартную эффективность, если она не задана
      if (!updatedItem.fuelEfficiency || updatedItem.fuelEfficiency <= 0) {
        updatedItem.fuelEfficiency = 1; // Значение по умолчанию
      }
    }
    
    setItem(updatedItem);
  };
  
  // Обработчик для изменения эффективности топлива
  const handleFuelEfficiencyChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value) && value > 0) {
      setItem({ ...item, fuelEfficiency: value });
    }
  };
  
  // Обновленный обработчик для времени роста с автоматическим пересчетом
  const handleGrowingTimeChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      // Создаем обновленный объект предмета
      const updatedItem = { ...item, growingTime: value };
      
      // Автоматически пересчитываем количество урожаев
      if (updatedItem.isHarvest && updatedItem.growingSeason && updatedItem.growingSeason.length > 0 && value > 0) {
        const maxHarvests = calculateMaxHarvestsPerSeason(value, updatedItem.growingSeason);
        updatedItem.harvestPerSeason = maxHarvests;
      }
      
      setItem(updatedItem);
    }
  };
  
  const handleHarvestPerSeasonChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 1) {
      setItem({ ...item, harvestPerSeason: value });
    }
  };
  
  // Обработчик выбора семени из списка
  const handleSeedChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    
    if (value.startsWith('seed_')) {
      // Выбор предустановленного значения
      const seedCost = parseInt(value.replace('seed_', ''));
      if (!isNaN(seedCost)) {
        setItem({ ...item, seedCost });
      }
    } else if (value) {
      // Выбор семени из списка
      const seedItem = savedItems.find(i => i.name === value);
      if (seedItem) {
        const seedCost = calculateItemCost(seedItem);
        setItem({ ...item, seedCost });
      }
    }
  };
  
  const handleSeedCostChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value >= 0) {
      setItem({ ...item, seedCost: value });
    }
  };
  
  // Обработчик загрузки изображения
  const handleImageUpload = (imageId: string): void => {
    setItem({ ...item, imageId });
  };
  
  // Обработчик сохранения предмета
  const handleSaveItem = (): void => {
    // Проверка на заполнение обязательных полей
    if (!item.name.trim()) {
      alert('Пожалуйста, введите название предмета');
      return;
    }
    
    // Проверка на уникальность имени
    if (editMode === 'new' && savedItems.some(i => i.name === item.name)) {
      alert(`Предмет с названием "${item.name}" уже существует`);
      return;
    }
    
    // Дополнительные проверки для урожая
    if (item.isHarvest) {
      if (!item.growingSeason || item.growingSeason.length === 0) {
        alert('Пожалуйста, выберите хотя бы один сезон роста');
        return;
      }
      
      if (!item.growingTime || item.growingTime <= 0) {
        alert('Время роста должно быть больше 0');
        return;
      }
    }
    
    // Дополнительные проверки для топлива
    if (item.isFuel) {
      if (!item.fuelEfficiency || item.fuelEfficiency <= 0) {
        alert('Эффективность топлива должна быть больше 0');
        return;
      }
    }
    
    let updatedItems: ItemData[];
    
    if (editMode === 'edit' && editingItemOriginalName) {
      // Обновляем существующий предмет
      updatedItems = savedItems.map(i => 
        i.name === editingItemOriginalName ? { ...item } : i
      );
    } else {
      // Добавляем новый предмет
      updatedItems = [...savedItems, { ...item }];
    }
    
    // Обновляем состояние приложения
    updateState('balance', {
      ...state.balance,
      comparisonItems: updatedItems
    });
    
    // Сбрасываем форму
    setItem({ ...DEFAULT_ITEM });
    setEditMode('new');
    setEditingItemOriginalName(null);
    
    // Если есть onBack, вызываем его
    if (onBack) {
      onBack();
    } else {
      // Уведомляем пользователя
      alert(`Предмет "${item.name}" успешно ${editMode === 'edit' ? 'обновлен' : 'создан'}`);
    }
  };
  
  // Обработчик отмены редактирования
  const handleCancel = (): void => {
    // Если есть onBack, вызываем его
    if (onBack) {
      onBack();
    } else {
      // Иначе сбрасываем форму
      setItem({ ...DEFAULT_ITEM });
      setEditMode('new');
      setEditingItemOriginalName(null);
    }
  };
  
  // Обработчик удаления предмета
  const handleDeleteItem = (itemName: string): void => {
    if (window.confirm(`Вы уверены, что хотите удалить предмет "${itemName}"?`)) {
      const updatedItems = savedItems.filter(i => i.name !== itemName);
      updateState('balance', {
        ...state.balance,
        comparisonItems: updatedItems
      });
      
      // Если мы редактировали этот предмет, сбрасываем форму
      if (editMode === 'edit' && editingItemOriginalName === itemName) {
        setItem({ ...DEFAULT_ITEM });
        setEditMode('new');
        setEditingItemOriginalName(null);
      }
    }
  };
  
  // Функция для получения URL изображения - ИСПРАВЛЕНО: теперь используем утилиту
  const getImageUrl = (imageId: string | null): string | undefined => {
    if (!imageId) return undefined;
    
    // Используем утилиту getImageUrl из imageUtils.ts
    return getImageUrlUtil(imageId, state) || undefined;
  };
  
  // Преобразование array в список для отображения
  const formatListForDisplay = (arr: string[] | undefined): string => {
    if (!arr || arr.length === 0) return 'Не указано';
    return arr.join(', ');
  };
  
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      {/* Левая панель - список сохраненных предметов */}
      <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Сохраненные предметы</h2>
        
        <div className="space-y-2 overflow-y-auto max-h-96">
          {savedItems.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Нет сохраненных предметов</p>
          ) : (
            savedItems.map(savedItem => (
              <div 
                key={savedItem.name}
                className={`p-3 rounded-lg flex justify-between items-center ${
                  editingItemOriginalName === savedItem.name 
                    ? 'bg-blue-100 dark:bg-blue-900/30' 
                    : 'bg-gray-100 dark:bg-gray-700'
                }`}
              >
                <div className="flex items-center space-x-3">
                  {/* Изображение предмета */}
                  <div className="w-10 h-10 rounded overflow-hidden bg-gray-200 dark:bg-gray-600">
                    {savedItem.imageId && getImageUrl(savedItem.imageId) ? (
                      <img 
                        src={getImageUrl(savedItem.imageId)}
                        alt={savedItem.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
                        No img
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <div className="font-medium text-gray-900 dark:text-gray-100">
                      {savedItem.name}
                      {savedItem.isHarvest && (
                        <span className="ml-1 px-1 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded">
                          Урожай
                        </span>
                      )}
                      {/* Показываем бейдж для семян */}
                      {savedItem.selectedCategories.includes('Семечко') && (
                        <span className="ml-1 px-1 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded">
                          Семя
                        </span>
                      )}
                      {/* Показываем бейдж для топлива */}
                      {savedItem.isFuel && (
                        <span className="ml-1 px-1 py-0.5 text-xs bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded">
                          Топливо
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Tier {savedItem.tier} 
                      {savedItem.subType && <span> • {savedItem.subType}</span>} 
                      <span> • {calculateItemCost(savedItem)}</span>
                      {savedItem.isHarvest && savedItem.growingSeason && (
                        <span> • Сезон: {formatListForDisplay(savedItem.growingSeason)}</span>
                      )}
                      {savedItem.isFuel && (
                        <span> • Эфф: {savedItem.fuelEfficiency || 1}</span>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadItemForEditing(savedItem.name)}
                    className="p-1 text-blue-500"
                    title="Edit"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  
                  <button
                    onClick={() => handleDeleteItem(savedItem.name)}
                    className="p-1 text-red-500"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Центральная панель - форма редактирования */}
      <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4 overflow-y-auto max-h-[calc(100vh-2rem)]">
        <h2 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">
          {editMode === 'edit' ? 'Редактирование предмета' : 'Создание предмета'}
        </h2>
        
        {/* Вкладки для разных типов полей */}
        <div className="mb-4 flex border-b border-gray-300 dark:border-gray-600">
          <button
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 ${activeTab === 'general' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Основное
          </button>
          <button
            onClick={() => setActiveTab('harvest')}
            className={`px-4 py-2 ${activeTab === 'harvest' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Урожай
          </button>
          <button
            onClick={() => setActiveTab('fuel')}
            className={`px-4 py-2 ${activeTab === 'fuel' ? 'border-b-2 border-primary text-primary' : 'text-gray-500 dark:text-gray-400'}`}
          >
            Топливо
          </button>
        </div>
        
        <div className="space-y-4">
          {/* Общие поля для всех вкладок */}
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Название</label>
            <input
              type="text"
              value={item.name}
              onChange={handleNameChange}
              placeholder="Введите название предмета"
              className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            />
          </div>
          
          {/* Поля вкладки "Основное" */}
          {activeTab === 'general' && (
            <>
              {/* Поле для подтипа - заменяем на выпадающий список */}
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Подтип</label>
                <select
                  value={item.subType || ''}
                  onChange={(e) => setItem({...item, subType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {/* Группируем подтипы по категориям с оптгруппами */}
                  <option value="">Не определен</option>
                  
                  <optgroup label="Металлы">
                    <option value="Медный">Медный</option>
                    <option value="Железный">Железный</option>
                    <option value="Бронзовый">Бронзовый</option>
                    <option value="Стальной">Стальной</option>
                    <option value="Титановый">Титановый</option>
                    <option value="Золотой">Золотой</option>
                    <option value="Серебряный">Серебряный</option>
                  </optgroup>
                  
                  <optgroup label="Дерево">
                    <option value="Деревянный">Деревянный</option>
                    <option value="Дубовый">Дубовый</option>
                    <option value="Сосновый">Сосновый</option>
                    <option value="Березовый">Березовый</option>
                  </optgroup>
                  
                  <optgroup label="Растительные">
                    <option value="Кукурузный">Кукурузный</option>
                    <option value="Пшеничный">Пшеничный</option>
                    <option value="Льняной">Льняной</option>
                  </optgroup>
                  
                  <optgroup label="Другие материалы">
                    <option value="Каменный">Каменный</option>
                    <option value="Стеклянный">Стеклянный</option>
                    <option value="Кожаный">Кожаный</option>
                    <option value="Тканевый">Тканевый</option>
                  </optgroup>
                  
                  <optgroup label="Пищевые">
                    <option value="Мясной">Мясной</option>
                    <option value="Рыбный">Рыбный</option>
                    <option value="Грибной">Грибной</option>
                    <option value="Ягодный">Ягодный</option>
                    <option value="Овощной">Овощной</option>
                    <option value="Фруктовый">Фруктовый</option>
                  </optgroup>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Используйте для различения предметов одного тира</p>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Изображение</label>
                <ImageUpload onUpload={handleImageUpload} />
                
                {item.imageId && getImageUrl(item.imageId) && (
                  <div className="mt-2">
                    <img 
                      src={getImageUrl(item.imageId)}
                      alt={item.name} 
                      className="w-32 h-32 object-cover rounded-md"
                    />
                  </div>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Тир</label>
                <select
                  value={item.tier}
                  onChange={handleTierChange}
                  className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {[1, 2, 3, 4, 5].map(tier => (
                    <option key={tier} value={tier}>Tier {tier}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Механика получения</label>
                <select
                  value={item.mechanic}
                  onChange={handleMechanicChange}
                  className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {mechanics.map(mechanic => (
                    <option key={mechanic} value={mechanic}>{mechanic}</option>
                  ))}
                </select>
              </div>
              
              {/* Улучшенный выбор категорий с чекбоксами */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Категории</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllCategories}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Выбрать все
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllCategories}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Снять все
                    </button>
                  </div>
                </div>
                
                {/* Фильтр категорий */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                    placeholder="Найти категорию..."
                    className="w-full px-3 py-1 text-sm border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                <div className="p-3 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredCategories.map(category => (
                      <div key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${category}`}
                          checked={item.selectedCategories.includes(category)}
                          onChange={() => handleCategoryToggle(category)}
                          className="h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                        />
                        <label htmlFor={`category-${category}`} className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                          {category}
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            (×{currentConfig.categories[category]})
                          </span>
                        </label>
                      </div>
                    ))}
                    
                    {filteredCategories.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 col-span-2 py-2 text-center">
                        Ничего не найдено
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Улучшенный выбор модификаторов с чекбоксами */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Модификаторы</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllModifiers}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Выбрать все
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllModifiers}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Снять все
                    </button>
                  </div>
                </div>
                
                {/* Фильтр модификаторов */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={modifierFilter}
                    onChange={(e) => setModifierFilter(e.target.value)}
                    placeholder="Найти модификатор..."
                    className="w-full px-3 py-1 text-sm border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                <div className="p-3 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredModifiers.map(modifier => (
                      <div key={modifier} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`modifier-${modifier}`}
                          checked={item.selectedModifiers.includes(modifier)}
                          onChange={() => handleModifierToggle(modifier)}
                          className="h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                        />
                        <label htmlFor={`modifier-${modifier}`} className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                          {modifier}
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            (×{currentConfig.modifiers[modifier]})
                          </span>
                        </label>
                      </div>
                    ))}
                    
                    {filteredModifiers.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 col-span-2 py-2 text-center">
                        Ничего не найдено
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Улучшенный выбор локаций с чекбоксами */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Локации</label>
                  <div className="flex space-x-2">
                    <button
                      type="button"
                      onClick={handleSelectAllLocations}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Выбрать все
                    </button>
                    <button
                      type="button"
                      onClick={handleDeselectAllLocations}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      Снять все
                    </button>
                  </div>
                </div>
                
                {/* Фильтр локаций */}
                <div className="mb-2">
                  <input
                    type="text"
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    placeholder="Найти локацию..."
                    className="w-full px-3 py-1 text-sm border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  />
                </div>
                
                <div className="p-3 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {filteredLocations.map(location => (
                      <div key={location} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`location-${location}`}
                          checked={item.selectedLocations.includes(location)}
                          onChange={() => handleLocationToggle(location)}
                          className="h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                        />
                        <label htmlFor={`location-${location}`} className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                          {location}
                          <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                            (×{currentConfig.locations[location]})
                          </span>
                        </label>
                      </div>
                    ))}
                    
                    {filteredLocations.length === 0 && (
                      <div className="text-sm text-gray-500 dark:text-gray-400 col-span-2 py-2 text-center">
                        Ничего не найдено
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Частота появления</label>
                <select
                  value={item.frequencyType}
                  onChange={handleFrequencyTypeChange}
                  className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {frequencyTypes.map(frequencyType => (
                    <option key={frequencyType} value={frequencyType}>{frequencyType}</option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Сложность крафта</label>
                <select
                  value={item.craftComplexity}
                  onChange={handleCraftComplexityChange}
                  className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                >
                  {craftComplexityTypes.map(craftComplexity => (
                    <option key={craftComplexity} value={craftComplexity}>{craftComplexity}</option>
                  ))}
                </select>
              </div>
            </>
          )}
          
          {/* Поля вкладки "Урожай" */}
          {activeTab === 'harvest' && (
            <>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="isHarvest"
                  checked={item.isHarvest || false}
                  onChange={handleIsHarvestChange}
                  className="h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                />
                <label htmlFor="isHarvest" className="ml-2 text-base font-medium text-gray-700 dark:text-gray-300">
                  Это урожай
                </label>
              </div>
              
              {item.isHarvest && (
                <>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Сезон роста</label>
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          onClick={handleSelectAllSeasons}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Выбрать все
                        </button>
                        <button
                          type="button"
                          onClick={handleDeselectAllSeasons}
                          className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                        >
                          Снять все
                        </button>
                      </div>
                    </div>
                    <div className="border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 p-3">
                      <div className="grid grid-cols-2 gap-2">
                        {seasons.map(season => (
                          <div key={season} className="flex items-center">
                            <input
                              type="checkbox"
                              id={`season-${season}`}
                              checked={(item.growingSeason || []).includes(season)}
                              onChange={() => handleSeasonToggle(season)}
                              className="h-4 w-4 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                            />
                            <label htmlFor={`season-${season}`} className="ml-2 text-sm text-gray-900 dark:text-gray-100">
                              {season}
                              <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
                                ({SEASON_LENGTHS[season]} дней)
                              </span>
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Выберите сезоны, в которые можно выращивать</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Время роста (дни)</label>
                    <input
                      type="number"
                      min="1"
                      value={item.growingTime || 0}
                      onChange={handleGrowingTimeChange}
                      className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Количество дней от посадки до сбора урожая. При изменении автоматически пересчитывается количество возможных урожаев за сезон.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Количество за сезон</label>
                    <input
                      type="number"
                      min="1"
                      value={item.harvestPerSeason || 1}
                      onChange={handleHarvestPerSeasonChange}
                      className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Сколько единиц урожая получается за один сезон. 
                      По умолчанию рассчитывается как максимальное количество полных урожаев за сезон ({
                        item.growingSeason && item.growingSeason.length > 0 && (item.growingTime || 0) > 0 
                          ? Math.floor(Math.min(...item.growingSeason.map(s => SEASON_LENGTHS[s] || 28)) / (item.growingTime || 0))
                          : '?'
                      } для выбранного времени роста).
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Стоимость семян</label>
                    <div className="flex space-x-2">
                      <select
                        value={`seed_${item.seedCost || 0}`}
                        onChange={handleSeedChange}
                        className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      >
                        <option value={`seed_${item.seedCost || 0}`}>
                          {item.seedCost ? `Стоимость: ${item.seedCost}` : 'Выберите семена'}
                        </option>
                        {getAvailableSeeds.length > 0 && (
                          <optgroup label="Доступные семена">
                            {getAvailableSeeds.map(seed => (
                              <option key={seed.name} value={seed.name}>
                                {seed.name} - {calculateItemCost(seed)}
                              </option>
                            ))}
                          </optgroup>
                        )}
                      </select>
                      
                      <input 
                        type="number"
                        min="0"
                        value={item.seedCost || 0}
                        onChange={handleSeedCostChange}
                        className="w-24 px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Стоимость семян для посадки. Можно выбрать из списка доступных семян или ввести вручную.
                    </p>
                  </div>
                  
                  {/* Информация о множителе дня */}
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Множитель дня роста:</span>
                      <span className="text-sm font-bold text-blue-800 dark:text-blue-300">
                        {(currentConfig.growthDayMultiplier || 1.0).toFixed(2)}
                      </span>
                    </div>
                    <p className="text-xs text-blue-600 dark:text-blue-400">
                      Этот множитель используется для расчета стоимости выращивания и настраивается в параметрах баланса.
                    </p>
                  </div>
                </>
              )}
              
              {!item.isHarvest && (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Включите опцию "Это урожай", чтобы настроить параметры урожая</p>
                </div>
              )}
            </>
          )}
          
          {/* Новая вкладка "Топливо" */}
          {activeTab === 'fuel' && (
            <>
              <div className="flex items-center mb-4">
                <input
                  type="checkbox"
                  id="isFuel"
                  checked={item.isFuel || false}
                  onChange={handleIsFuelChange}
                  className="h-5 w-5 text-primary rounded border-gray-300 dark:border-gray-600 focus:ring-primary"
                />
                <label htmlFor="isFuel" className="ml-2 text-base font-medium text-gray-700 dark:text-gray-300">
                  Это топливо
                </label>
              </div>
              
              {item.isFuel && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Эффективность топлива</label>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={item.fuelEfficiency || 1}
                      onChange={handleFuelEfficiencyChange}
                      className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Сколько единиц ресурса можно обработать одной единицей этого топлива. Например, если эффективность угля равна 2, то 1 углем можно переплавить 2 единицы руды.
                    </p>
                  </div>
                  
                  {/* Примеры применения */}
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                    <h4 className="text-sm font-medium mb-2 text-gray-800 dark:text-gray-200">Примеры применения:</h4>
                    
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex justify-between">
                        <span>Переплавка руды:</span>
                        <span className="font-medium">{(item.fuelEfficiency || 1).toFixed(1)} руды / 1 {item.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>Для 10 единиц руды нужно:</span>
                        <span className="font-medium">{Math.ceil(10 / (item.fuelEfficiency || 1))} {item.name}</span>
                      </div>
                      
                      <div className="flex justify-between">
                        <span>20 единиц {item.name} переплавят:</span>
                        <span className="font-medium">{Math.floor(20 * (item.fuelEfficiency || 1))} руды</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Автоматическое добавление категории "Топливо" если она существует */}
                  {categories.includes('Топливо') && !item.selectedCategories.includes('Топливо') && (
                    <div className="mt-4">
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle('Топливо')}
                        className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full text-sm hover:bg-blue-200 dark:hover:bg-blue-900/50 transition"
                      >
                        + Добавить категорию "Топливо"
                      </button>
                    </div>
                  )}
                </>
              )}
              
              {!item.isFuel && (
                <div className="p-8 text-center">
                  <p className="text-gray-500 dark:text-gray-400">Включите опцию "Это топливо", чтобы настроить параметры топлива</p>
                </div>
              )}
            </>
          )}
          
          {/* Кнопки действий для всех вкладок */}
          <div className="flex space-x-2 pt-4">
            <button
              onClick={handleSaveItem}
              className="px-4 py-2 bg-primary text-white rounded-md hover:bg-opacity-90 transition"
            >
              {editMode === 'edit' ? 'Обновить' : 'Сохранить'}
            </button>
            
            <button
              onClick={handleCancel}
              className="px-4 py-2 bg-gray-300 dark:bg-gray-700 text-gray-800 dark:text-white rounded-md"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
      
      {/* Правая панель - формула и предпросмотр */}
      <div className="xl:col-span-1 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Предпросмотр</h2>
        
        <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg mb-4">
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">{cost}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Расчетная стоимость</div>
        </div>
        
        {/* Выбранные атрибуты предмета */}
        <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
          <h3 className="text-md font-medium mb-2 text-gray-900 dark:text-gray-100">Выбранные атрибуты</h3>
          
          {/* Отображаем тип (урожай или топливо) */}
          <div className="mb-2 flex flex-wrap gap-2">
            {item.isHarvest && (
              <div className="px-2 py-1 inline-block bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-md text-sm font-medium">
                Урожай
              </div>
            )}
            
            {item.isFuel && (
              <div className="px-2 py-1 inline-block bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300 rounded-md text-sm font-medium">
                Топливо (эфф: {item.fuelEfficiency || 1})
              </div>
            )}
          </div>
          
          {/* Информация о сезонах роста */}
          {item.isHarvest && item.growingSeason && item.growingSeason.length > 0 && (
            <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
              Сезон роста: {formatListForDisplay(item.growingSeason)}
            </div>
          )}
          
          {/* Отображаем подтип, если он указан */}
          {item.subType && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Подтип:</h4>
              <div className="flex flex-wrap gap-1 mt-1">
                <span className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300 rounded-full">
                  {item.subType}
                </span>
              </div>
            </div>
          )}
          
          {/* Показываем выбранные категории */}
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Категории:</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {item.selectedCategories.length > 0 ? (
                item.selectedCategories.map(cat => (
                  <span
                    key={cat}
                    className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded-full"
                  >
                    {cat}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">Не выбрано</span>
              )}
            </div>
          </div>
          
          {/* Показываем выбранные модификаторы */}
          <div className="mb-2">
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Модификаторы:</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {item.selectedModifiers.length > 0 ? (
                item.selectedModifiers.map(mod => (
                  <span
                    key={mod}
                    className="px-2 py-0.5 text-xs bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 rounded-full"
                  >
                    {mod}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">Не выбрано</span>
              )}
            </div>
          </div>
          
          {/* Показываем выбранные локации */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">Локации:</h4>
            <div className="flex flex-wrap gap-1 mt-1">
              {item.selectedLocations.length > 0 ? (
                item.selectedLocations.map(loc => (
                  <span
                    key={loc}
                    className="px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 rounded-full"
                  >
                    {loc}
                  </span>
                ))
              ) : (
                <span className="text-xs text-gray-500 dark:text-gray-400">Не выбрано</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Компоненты стоимости - всегда отображаются теперь */}
        <div className="mb-4">
          <h3 className="text-md font-medium mb-2 text-gray-900 dark:text-gray-100">Компоненты стоимости</h3>
          <div className="space-y-2">
            {Object.entries(components).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">{key}</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{value}</div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Расчет стоимости урожая - показывается только для урожая */}
        {item.isHarvest && harvestCost && (
          <div className="mb-4 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg border-l-4 border-green-500 dark:border-green-700">
            <h3 className="text-md font-medium mb-2 text-gray-900 dark:text-gray-100">Расчет стоимости урожая</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">Стоимость семян</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{harvestCost.seedCost}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">Время роста (дни)</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{harvestCost.growingTime}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">Множитель дня</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{harvestCost.dayMultiplier.toFixed(2)}</div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">Стоимость выращивания</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {harvestCost.growingTime} × {harvestCost.dayMultiplier.toFixed(2)} = {Math.round(harvestCost.growingCost)}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm text-gray-700 dark:text-gray-300">Количество за сезон</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">{harvestCost.harvestPerSeason}</div>
              </div>
              <div className="border-t border-gray-300 dark:border-gray-600 mt-2 pt-2 flex justify-between">
                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">Формула расчета</div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  ({harvestCost.seedCost} + {harvestCost.growingTime} × {harvestCost.dayMultiplier.toFixed(2)}) ÷ {harvestCost.harvestPerSeason}
                </div>
              </div>
              <div className="flex justify-between">
                <div className="text-sm font-bold text-gray-700 dark:text-gray-300">Итоговая стоимость за единицу</div>
                <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  {Math.round(harvestCost.unitCost)}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Формула расчета - всегда отображаем оба блока */}
          <div>
            <h3 className="text-md font-medium mb-2 text-gray-900 dark:text-gray-100">Формула расчета</h3>
            
            {/* Блок формулы расчета урожая - всегда показываем, но скрываем если не урожай */}
            {item.isHarvest && (
              <div className="mb-4">
                <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Для урожая используется специальная формула:
                  </p>
                  <pre className="mt-2 p-2 bg-gray-200 dark:bg-gray-600 rounded text-sm overflow-x-auto">
                    (Стоимость семян + Время роста × Множитель дня) ÷ Количество за сезон
                  </pre>
                </div>
              </div>
            )}
            
            {/* Блок стандартной формулы - всегда показываем */}
            <div className="mb-4">
              <FormulaPreview item={item} />
            </div>
          </div>
      </div>
    </div>
  );
};

export default ItemEditor;