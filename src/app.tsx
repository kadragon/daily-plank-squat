import { useState } from 'react'
import DailySummary from './components/daily-summary'
import PlankTimer from './components/plank-timer'
import SquatCounter from './components/squat-counter'

type AppView = 'plank' | 'squat' | 'summary'

interface AppProps {
  initialView?: AppView
}

export default function App({ initialView = 'plank' }: AppProps) {
  const [view, setView] = useState<AppView>(initialView)

  return (
    <div className="app">
      <h1>Daily Plank & Squat</h1>
      <nav>
        <button type="button" onClick={() => setView('plank')}>Plank</button>
        <button type="button" onClick={() => setView('squat')}>Squat</button>
        <button type="button" onClick={() => setView('summary')}>Summary</button>
      </nav>
      {view === 'plank' ? <PlankTimer state="IDLE" /> : null}
      {view === 'squat' ? <SquatCounter /> : null}
      {view === 'summary' ? <DailySummary /> : null}
    </div>
  )
}
