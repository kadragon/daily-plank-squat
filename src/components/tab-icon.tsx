import { NAV_MONOGRAM } from '../locales/ko'
import type { AppView } from '../models/navigation'

// Typographic monograms — one-syllable lockups in the Nike display system, distinct per view.
const MONOGRAM: Record<AppView, string> = NAV_MONOGRAM

export function TabIcon({ view }: { view: AppView }) {
  const monogram = MONOGRAM[view]
  if (!monogram) return null
  return <span className="app-tabbar__icon" aria-hidden="true">{monogram}</span>
}
