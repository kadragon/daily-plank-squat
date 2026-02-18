import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import DailySummary from './daily-summary'

test('Daily summary shows targets from fatigue model', () => {
  const html = renderToStaticMarkup(
    <DailySummary plankTargetSec={60} squatTargetCount={20} />,
  )

  expect(html).toContain('Plank target: 60s')
  expect(html).toContain('Squat target: 20')
})

test('Daily summary shows completion status', () => {
  const html = renderToStaticMarkup(
    <DailySummary plankSuccess squatSuccess={false} />,
  )

  expect(html).toContain('Plank: Complete')
  expect(html).toContain('Squat: Incomplete')
})
