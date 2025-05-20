import { Link, useLocation } from 'react-router-dom';
import ThemeToggle from './ThemeToggle';
import ProjectActions from './ProjectActions';

export default function Sidebar() {
  const location = useLocation();
  
  // Определяем, активен ли пункт меню
  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };
  
  // Специальная проверка для Balance & Crafting Center, который должен быть активен
  // если текущий путь совпадает с /balance-crafting, /balance или /crafting
  const isBalanceCraftingActive = () => {
    return isActive('/balance-crafting') || isActive('/balance') || isActive('/crafting');
  };
  
  return (
    <div className="bg-gray-900 w-64 min-h-screen text-white flex flex-col">
      <div className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-bold">Game Designer Suite</h1>
        <ThemeToggle />
      </div>
      
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-sm uppercase tracking-wider text-gray-400 font-semibold mb-3">Программы</h2>
        <nav className="space-y-2">
          <Link 
            to="/units" 
            className={`block py-2 px-4 rounded transition ${isActive('/units') || location.pathname === '/' ? 'bg-indigo-900 text-white' : 'hover:bg-gray-800'}`}
          >
            Unit Builder
          </Link>
          <Link 
            to="/mixing" 
            className={`block py-2 px-4 rounded transition ${isActive('/mixing') ? 'bg-indigo-900 text-white' : 'hover:bg-gray-800'}`}
          >
            Mixing System
          </Link>
          
          <Link 
            to="/balance-crafting" 
            className={`block py-2 px-4 rounded transition ${isBalanceCraftingActive() ? 'bg-indigo-900 text-white' : 'hover:bg-gray-800'}`}
          >
            Balance & Crafting Center
          </Link>
          
          <Link 
            to="/shop-builder" 
            className={`block py-2 px-4 rounded transition ${isActive('/shop-builder') ? 'bg-indigo-900 text-white' : 'hover:bg-gray-800'}`}
          >
            Shop Builder
          </Link>
          <Link 
            to="/neorust" 
            className={`block py-2 px-4 rounded transition ${isActive('/neorust') ? 'bg-indigo-900 text-white' : 'hover:bg-gray-800'}`}
          >
            NeoRust Editor
          </Link>
        </nav>
      </div>
      
      <div className="p-4 mt-auto">
        <div className="mt-6 border-t border-gray-200 dark:border-gray-700 pt-4">
          <h3 className="text-sm font-medium mb-2">Export/Import</h3>
          <ProjectActions />
        </div>
      </div>
    </div>
  );
}