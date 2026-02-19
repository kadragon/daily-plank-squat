import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import DailySummary from './daily-summary'

test('Daily summary shows targets from fatigue model', () => {
  const html = renderToStaticMarkup(
    <DailySummary plankTargetSec={60} squatTargetReps={20} tomorrowPlankTargetSec={63} tomorrowSquatTargetReps={21} />,
  )

  expect(html).toContain('Plank target: 60s')
  expect(html).toContain('Squat target: 20')
  expect(html).toContain('Tomorrow plank target: 63s')
  expect(html).toContain('Tomorrow squat target: 21')
})

test('Daily summary shows completion status', () => {
  const html = renderToStaticMarkup(
    <DailySummary plankSuccess squatSuccess={false} />,
  )

  expect(html).toContain('Plank: Complete')
  expect(html).toContain('Squat: Incomplete')
})

test('DailySummary has h2 heading', () => {
  const html = renderToStaticMarkup(<DailySummary />)

  expect(html).toContain('<h2')
})

test('DailySummary warning messages have role="alert"', () => {
  const html = renderToStaticMarkup(
    <DailySummary overloadWarning suspiciousSession />,
  )

  expect(html).toContain('role="alert"')
})

test('DailySummary markup has daily-summary and summary-stat class names', () => {
  const html = renderToStaticMarkup(<DailySummary plankTargetSec={60} squatTargetReps={20} />)

  expect(html).toContain('daily-summary')
  expect(html).toContain('summary-stat')
})

test('DailySummary shows pushup target and completion status', () => {
  const html = renderToStaticMarkup(
    <DailySummary pushupTargetReps={15} pushupSuccess />,
  )

  expect(html).toContain('Pushup target: 15')
  expect(html).toContain('Pushup: Complete')
})

test('DailySummary shows pushup incomplete when not done', () => {
  const html = renderToStaticMarkup(
    <DailySummary pushupTargetReps={15} pushupSuccess={false} />,
  )

  expect(html).toContain('Pushup: Incomplete')
})

test('DailySummary shows tomorrow pushup target', () => {
  const html = renderToStaticMarkup(
    <DailySummary tomorrowPushupTargetReps={16} />,
  )

  expect(html).toContain('Tomorrow pushup target: 16')
})
