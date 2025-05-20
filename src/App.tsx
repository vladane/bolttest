import { Routes, Route } from 'react-router-dom';
import { NotificationProvider } from './contexts/NotificationContext';
import Sidebar from './components/common/Sidebar';
import UnitBuilder from './pages/UnitBuilder';
import MixingSystem from './pages/MixingSystem';
import SaveManager from './components/common/SaveManager';
import NeoRustScriptPage from './pages/NeoRustScriptPage';
import { BalanceProvider } from './contexts/BalanceContext';
import { useState } from 'react';
import BalanceCraftingPage from './pages/BalanceCraftingPage';
import ShopBuilder from './components/shop/ShopBuilder';



function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <BalanceProvider>
      <NotificationProvider>
        <div className="flex h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
          {/* Мобильное меню */}
          <div className={`md:hidden fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity ${sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
               onClick={() => setSidebarOpen(false)}>
          </div>
          {/* Боковое меню */}
          <div className={`fixed md:relative z-30 md:z-auto w-64 md:w-64 h-screen transition-transform transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
            <Sidebar />
          </div>
          
          {/* Основной контент */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-4">
              <div className="flex items-center mb-4">
                <button 
                  className="md:hidden mr-2 p-2 rounded-md text-gray-500"
                  onClick={() => setSidebarOpen(true)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                <SaveManager />
              </div>
              
              <Routes>
                <Route path="/" element={<UnitBuilder />} />
                <Route path="/units/*" element={<UnitBuilder />} />
                <Route path="/mixing" element={<MixingSystem />} />
                <Route path="/balance-crafting/*" element={<BalanceCraftingPage />} />
                <Route path="/neorust" element={<NeoRustScriptPage />} />
                <Route path="/shop-builder" element={<ShopBuilder />} />
              </Routes>
            </div>
          </main>
        </div>
      </NotificationProvider>
    </BalanceProvider>
  );
}

export default App;