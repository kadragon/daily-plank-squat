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
