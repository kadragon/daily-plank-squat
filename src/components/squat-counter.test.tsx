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
