import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SaveManager from './SaveManager';
import ProjectActions from './ProjectActions';

export default function Navigation() {
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(false);
  
  // Проверка темной темы при загрузке
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
    
    // Слушатель изменений темы
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => setDarkMode(e.matches);
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // Обновление CSS классов для темной темы
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);
  
  return (
    <nav className="bg-gray-100 dark:bg-gray-800 p-4 shadow">
      <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
        <div className="flex items-center space-x-4 mb-3 md:mb-0">
          <Link to="/" className="text-lg font-semibold">
            Game Builder
          </Link>
          
          <div className="flex space-x-2">
            <Link
              to="/units"
              className={`px-3 py-1 rounded ${
                location.pathname === '/units' || location.pathname === '/'
                  ? 'bg-primary bg-opacity-20 text-primary font-medium'
                  : 'hover:bg-primary hover:bg-opacity-10 hover:text-primary'
              }`}
            >
              Unit Builder
            </Link>
            
            <Link
              to="/resources"
              className={`px-3 py-1 rounded ${
                location.pathname === '/resources'
                  ? 'bg-primary bg-opacity-20 text-primary font-medium'
                  : 'hover:bg-primary hover:bg-opacity-10 hover:text-primary'
              }`}
            >
              Resource Catalog
            </Link>
            
            <Link
              to="/mixing"
              className={`px-3 py-1 rounded ${
                location.pathname === '/mixing'
                  ? 'bg-primary bg-opacity-20 text-primary font-medium'
                  : 'hover:bg-primary hover:bg-opacity-10 hover:text-primary'
              }`}
            >
              Mixing System
            </Link>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <SaveManager />
          <ProjectActions />
          
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700"
            aria-label="Toggle dark mode"
          >
            {darkMode ? (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M10 2a1 1 0 011 1v1a1 1 0 11-2 0V3a1 1 0 011-1zm4 8a4 4 0 11-8 0 4 4 0 018 0zm-.464 4.95l.707.707a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414zm2.12-10.607a1 1 0 010 1.414l-.706.707a1 1 0 11-1.414-1.414l.707-.707a1 1 0 011.414 0zM17 11a1 1 0 100-2h-1a1 1 0 100 2h1zm-7 4a1 1 0 011 1v1a1 1 0 11-2 0v-1a1 1 0 011-1zM5.05 6.464A1 1 0 106.465 5.05l-.708-.707a1 1 0 00-1.414 1.414l.707.707zm1.414 8.486l-.707.707a1 1 0 01-1.414-1.414l.707-.707a1 1 0 011.414 1.414zM4 11a1 1 0 100-2H3a1 1 0 000 2h1z"
                  clipRule="evenodd"
                />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M17.293 13.293A8 8 0 016.707 2.707a8.001 8.001 0 1010.586 10.586z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </nav>
  );
}