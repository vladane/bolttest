// components/common/SearchableSelect.tsx
import { useState, useEffect, useRef } from 'react';

interface Item {
  name: string;
  tier: number;
  category?: string;
  selectedCategories?: string[];
  [key: string]: any; // Для других свойств предметов
}

interface SearchableSelectProps {
  items: Item[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export default function SearchableSelect({ 
  items, 
  value, 
  onChange, 
  placeholder = "Select item",
  className = ""
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Получение категорий из предметов
  const categoriesSet = new Set<string>();
  categoriesSet.add('all');
  
  items.forEach(item => {
    if (item.category) {
      categoriesSet.add(item.category);
    } else if (item.selectedCategories && item.selectedCategories.length > 0) {
      item.selectedCategories.forEach(cat => categoriesSet.add(cat));
    }
  });
  
  const categories = Array.from(categoriesSet);
  
  // Фильтрация предметов
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = activeCategory === 'all' || 
      item.category === activeCategory || 
      (item.selectedCategories && item.selectedCategories.includes(activeCategory));
    
    return matchesSearch && matchesCategory;
  });
  
  // Сортировка по тиру, а затем по имени
  const sortedItems = [...filteredItems].sort((a, b) => {
    if (a.tier !== b.tier) {
      return a.tier - b.tier;
    }
    return a.name.localeCompare(b.name);
  });
  
  // Закрытие выпадающего списка при клике вне компонента
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    }
  }, []);
  
  // Фокус на поле поиска при открытии
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);
  
  // Выбранный предмет
  const selectedItem = items.find(item => item.name === value);
  
  return (
    <div className={`relative w-full ${className}`} ref={wrapperRef}>
      {/* Кнопка открытия выпадающего списка */}
      <button
        type="button"
        className="w-full px-4 py-2 text-left bg-gray-100 dark:bg-gray-800 border border-gray-600 dark:border-gray-700 rounded-md flex justify-between items-center"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{selectedItem ? `${selectedItem.name} (Tier ${selectedItem.tier})` : placeholder}</span>
        <svg className={`w-5 h-5 transition-transform ${isOpen ? 'transform rotate-180' : ''}`} 
             fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-600 dark:border-gray-700 rounded-md shadow-lg max-h-80 overflow-hidden">
          {/* Строка поиска */}
          <div className="p-2 sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-600 dark:border-gray-700">
            <input
              ref={inputRef}
              type="text"
              placeholder="Search items..."
              className="w-full px-3 py-2 border border-gray-600 dark:border-gray-700 rounded-md bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              onClick={e => e.stopPropagation()}
            />
          </div>
          
          {/* Категории */}
          {categories.length > 1 && (
            <div className="p-2 flex flex-wrap gap-1 border-b border-gray-600 dark:border-gray-700">
              {categories.map(category => (
                <button
                  key={category}
                  className={`px-2 py-1 text-xs rounded-full ${
                    activeCategory === category 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                  }`}
                  onClick={() => setActiveCategory(category)}
                >
                  {category === 'all' ? 'All Categories' : category}
                </button>
              ))}
            </div>
          )}
          
          {/* Список предметов */}
          <div className="overflow-y-auto max-h-60">
            {sortedItems.length > 0 ? (
              <div className="py-1">
                {sortedItems.map(item => (
                  <button
                    key={item.name}
                    className={`w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 ${
                      value === item.name ? 'bg-blue-50 dark:bg-blue-900/30' : ''
                    }`}
                    onClick={() => {
                      onChange(item.name);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex justify-between">
                      <span>{item.name}</span>
                      <span className="text-gray-500 dark:text-gray-400">
                        (Tier {item.tier})
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-4 py-2 text-gray-500 dark:text-gray-400 text-center">
                No items found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}