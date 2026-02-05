import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './css/component/HeaderGlobal.css'          // ← add this line
import App from './App.tsx'
import { ThemeProvider } from './contexts/ThemeContext'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
)