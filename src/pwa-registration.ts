import { registerSW } from 'virtual:pwa-register'
import { createPwaUpdater } from './pwa-updater'

export function registerPwaUpdater(): () => void {
  return createPwaUpdater(registerSW, {
    confirmRefresh: (message) => window.confirm(message),
  })
}
