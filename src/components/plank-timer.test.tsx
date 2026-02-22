import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import PlankTimer from './plank-timer'

test('Plank view shows remaining time as MM:SS', () => {
  const html = renderToStaticMarkup(<PlankTimer elapsedMs={61_000} targetSec={120} />)

  expect(html).toContain('00:59')
})

test('PlankTimer IDLE shows full target time', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" targetSec={60} />)

  expect(html).toContain('01:00')
})

test('PlankTimer shows countdown at halfway', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="RUNNING" elapsedMs={30_000} targetSec={60} />,
  )

  expect(html).toContain('00:30')
})

test('Plank view shows start button in IDLE', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" />)

  expect(html).toContain('Start')
})

test('Plank view shows pause/cancel in RUNNING and no manual complete button', () => {
  const html = renderToStaticMarkup(<PlankTimer state="RUNNING" />)

  expect(html).toContain('Pause')
  expect(html).toContain('Cancel')
  expect(html).not.toContain('Complete')
})

test('Plank view shows resume/cancel in PAUSED', () => {
  const html = renderToStaticMarkup(<PlankTimer state="PAUSED" />)

  expect(html).toContain('Resume')
  expect(html).toContain('Cancel')
})

test('Plank view shows result in COMPLETED', () => {
  const html = renderToStaticMarkup(<PlankTimer state="COMPLETED" elapsedMs={45_000} />)

  expect(html).toContain('Result')
  expect(html).toContain('45s')
})

test('Plank result clamps negative elapsed time to 0 seconds', () => {
  const html = renderToStaticMarkup(<PlankTimer state="COMPLETED" elapsedMs={-1000} />)

  expect(html).toContain('Result: 0s')
})

test('PlankTimer has h2 heading', () => {
  const html = renderToStaticMarkup(<PlankTimer />)

  expect(html).toContain('<h2')
})

test('PlankTimer elapsed display has aria-live="polite"', () => {
  const html = renderToStaticMarkup(<PlankTimer state="RUNNING" />)

  expect(html).toContain('aria-live="polite"')
})

test('PlankTimer IDLE markup has plank-timer, timer-display, btn class names', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" />)

  expect(html).toContain('plank-timer')
  expect(html).toContain('timer-display')
  expect(html).toContain('btn')
})

test('PlankTimer RUNNING markup has plank-timer--running class', () => {
  const html = renderToStaticMarkup(<PlankTimer state="RUNNING" />)

  expect(html).toContain('plank-timer--running')
})

test('PlankTimer progress bar shows correct width in RUNNING state', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="RUNNING" elapsedMs={30_000} targetSec={60} />,
  )

  expect(html).toContain('progress-fill')
  expect(html).toContain('width:50%')
})

test('PlankTimer renders RPE input with 1~10 bounds', () => {
  const html = renderToStaticMarkup(<PlankTimer rpe={6} />)

  expect(html).toContain('id="plank-rpe"')
  expect(html).toContain('RPE (1-10)')
  expect(html).toContain('min="1"')
  expect(html).toContain('max="10"')
})

test('PlankTimer hides RPE input when showRpe=false', () => {
  const html = renderToStaticMarkup(<PlankTimer showRpe={false} />)

  expect(html).not.toContain('id="plank-rpe"')
  expect(html).not.toContain('RPE (1-10)')
})

test('PlankTimer renders custom title via title prop', () => {
  const html = renderToStaticMarkup(<PlankTimer title="Deadhang Timer" />)

  expect(html).toContain('<h2>Deadhang Timer</h2>')
})

test('PlankTimer defaults to "Plank Timer" when title prop is omitted', () => {
  const html = renderToStaticMarkup(<PlankTimer />)

  expect(html).toContain('<h2>Plank Timer</h2>')
})

test('PlankTimer idPrefix prop sets RPE input id and htmlFor', () => {
  const html = renderToStaticMarkup(<PlankTimer idPrefix="deadhang" />)

  expect(html).toContain('id="deadhang-rpe"')
  expect(html).toContain('for="deadhang-rpe"')
})

test('PlankTimer defaults to "plank" idPrefix when prop is omitted', () => {
  const html = renderToStaticMarkup(<PlankTimer />)

  expect(html).toContain('id="plank-rpe"')
})

test('PlankTimer disables Start button when startDisabled=true', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" startDisabled />)

  expect(html).toContain('Start')
  expect(html).toContain('disabled')
})

test('PlankTimer renders tomorrow recommendation target, delta, and reason', () => {
  const html = renderToStaticMarkup(
    <PlankTimer tomorrowTargetSec={63} tomorrowDeltaSec={3} recommendationReasonText="중립 강도(5~6)로 기본 증량" />,
  )

  expect(html).toContain('내일 추천: 63s (+3s)')
  expect(html).toContain('중립 강도(5~6)로 기본 증량')
})
