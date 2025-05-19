// vite.config.js или vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Еще более детальное разделение зависимостей
          if (id.includes('node_modules')) {
            // React и связанные пакеты
            if (id.includes('react') || id.includes('scheduler') || id.includes('prop-types')) {
              return 'vendor-react';
            }
            
            // Material-UI или другие UI библиотеки
            if (id.includes('@mui') || id.includes('@material-ui') || id.includes('@emotion')) {
              return 'vendor-ui-libs';
            }
            
            // Роутинг
            if (id.includes('react-router') || id.includes('history') || id.includes('@remix-run')) {
              return 'vendor-routing';
            }
            
            // Состояние/стейт-менеджмент
            if (id.includes('redux') || id.includes('recoil') || id.includes('zustand') || id.includes('mobx')) {
              return 'vendor-state';
            }
            
            // Утилиты и вспомогательные библиотеки
            if (id.includes('lodash') || id.includes('date-fns') || id.includes('moment') || 
                id.includes('ramda') || id.includes('uuid') || id.includes('immer')) {
              return 'vendor-utils';
            }
            
            // Библиотеки для работы с формами
            if (id.includes('formik') || id.includes('react-hook-form') || id.includes('yup') || 
                id.includes('zod') || id.includes('final-form')) {
              return 'vendor-forms';
            }
            
            // Стили и CSS
            if (id.includes('tailwind') || id.includes('css') || id.includes('styled-components') || 
                id.includes('scss') || id.includes('sass')) {
              return 'vendor-styles';
            }
            
            // Все остальные зависимости
            return 'vendor-other';
          }
          
          // Локальные модули проекта
          if (id.includes('/contexts/')) {
            return 'app-contexts';
          }
          
          if (id.includes('/components/shop/')) {
            return 'shop-components';
          }
          
          if (id.includes('/components/common/')) {
            return 'ui-components';
          }
          
          if (id.includes('/utils/')) {
            return 'utils';
          }
          
          return 'main';
        }
      }
    },
    // Можно также увеличить лимит предупреждения о размере чанка
    chunkSizeWarningLimit: 1000, // Увеличение до 1000кБ
  }
});