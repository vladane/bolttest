import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'
import './index.css'
import './styles/rarities.css'
import { AppStateProvider } from './contexts/AppStateContext.tsx'
import './utils/craftSystemExportPatch';

ReactDOM.createRoot(document.getElementById('root')!).render(
 <React.StrictMode>
    <AppStateProvider>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </AppStateProvider>
 </React.StrictMode>,
)