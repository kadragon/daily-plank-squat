import type { AppTab } from '../models/navigation'

const ICON_PATHS: Record<AppTab, string[]> = {
  // Dumbbell
  today: ['M6.5 6.5v11', 'M17.5 6.5v11', 'M3.5 9v6', 'M20.5 9v6', 'M6.5 12h11'],
  // Calendar
  history: ['M4 6h16v14H4z', 'M4 10h16', 'M8 3v4', 'M16 3v4'],
  // Sliders
  settings: ['M4 7h10', 'M18 7h2', 'M4 17h4', 'M12 17h8', 'M16 5v4', 'M10 15v4'],
}

export function TabIcon({ tab }: { tab: AppTab }) {
  return (
    <svg
      className="app-tabbar__icon"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {ICON_PATHS[tab].map((d) => <path key={d} d={d} />)}
    </svg>
  )
}
