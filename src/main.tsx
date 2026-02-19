import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app'
import { registerPwaUpdater } from './pwa-registration'

const root = document.getElementById('root')
if (!root) throw new Error('Root element not found')

function AppWithPwaUpdater() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return
    }

    return registerPwaUpdater()
  }, [])

  return <App />
}

createRoot(root).render(
  <StrictMode>
    <AppWithPwaUpdater />
  </StrictMode>,
)
