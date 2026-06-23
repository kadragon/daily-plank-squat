import type { AppView } from '../models/navigation'

// Typographic monograms — uppercase 2-char lockups in the Nike display system.
// Distinct per view (no first-letter collisions across Plank/Pushup, Squat/Settings, Deadhang/Dumbbell).
const MONOGRAM: Record<AppView, string> = {
  plank: 'PL',
  squat: 'SQ',
  pushup: 'PU',
  deadhang: 'DH',
  dumbbell: 'DB',
  overview: 'OV',
  settings: 'ST',
}

export function TabIcon({ view }: { view: AppView }) {
  const monogram = MONOGRAM[view]
  if (!monogram) return null
  return <span className="app-tabbar__icon" aria-hidden="true">{monogram}</span>
}
