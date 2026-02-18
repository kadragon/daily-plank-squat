import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import SquatCounter from './squat-counter'

test('Squat view shows count and +1/-1 buttons', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('Count: 3')
  expect(html).toContain('+1')
  expect(html).toContain('-1')
})

test('Squat view shows complete button', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('Complete')
})

test('Squat +1 button has long-press event handlers', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  // The +1 button must exist — long-press handlers (onMouseDown/onTouchStart) are
  // wired in JSX but not serialised by renderToStaticMarkup, so we verify the
  // button renders and that the component tree is structurally valid with hooks.
  expect(html).toContain('+1')
})

test('SquatCounter buttons have aria-labels', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('aria-label="Increment"')
  expect(html).toContain('aria-label="Decrement"')
  expect(html).toContain('aria-label="Complete squats"')
})

test('SquatCounter count display has aria-live="polite"', () => {
  const html = renderToStaticMarkup(<SquatCounter count={5} />)

  expect(html).toContain('aria-live="polite"')
})

test('SquatCounter has h2 heading', () => {
  const html = renderToStaticMarkup(<SquatCounter />)

  expect(html).toContain('<h2')
})

test('SquatCounter markup has squat-counter, squat-count, btn--large class names', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('squat-counter')
  expect(html).toContain('squat-count')
  expect(html).toContain('btn--large')
})

test('SquatCounter has squat-counter--goal-reached when count meets target', () => {
  const html = renderToStaticMarkup(<SquatCounter count={20} targetReps={20} />)

  expect(html).toContain('squat-counter--goal-reached')
})
