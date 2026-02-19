import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app'
import { registerPwaUpdater } from './pwa-registration'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

if ('serviceWorker' in navigator) {
  registerPwaUpdater()
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
