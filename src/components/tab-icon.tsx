import type { AppView } from '../models/navigation'

export function TabIcon({ view }: { view: AppView }) {
  switch (view) {
    case 'plank':
      return <span className="app-tabbar__icon" aria-hidden="true">🧘</span>
    case 'squat':
      return <span className="app-tabbar__icon" aria-hidden="true">🏋️</span>
    case 'pushup':
      return <span className="app-tabbar__icon" aria-hidden="true">💪</span>
    case 'deadhang':
      return <span className="app-tabbar__icon" aria-hidden="true">🧗</span>
    case 'dumbbell':
      return <span className="app-tabbar__icon" aria-hidden="true">🏋️‍♂️</span>
    case 'overview':
      return <span className="app-tabbar__icon" aria-hidden="true">📊</span>
    case 'settings':
      return <span className="app-tabbar__icon" aria-hidden="true">⚙️</span>
    default:
      return null
  }
}
