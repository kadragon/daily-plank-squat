import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import PlankTimer from './plank-timer'

test('Plank view shows elapsed as MM:SS', () => {
  const html = renderToStaticMarkup(<PlankTimer elapsedMs={61_000} />)

  expect(html).toContain('01:01')
})

test('Plank view shows start button in IDLE', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" />)

  expect(html).toContain('Start')
})

test('Plank view shows pause/cancel in RUNNING', () => {
  const html = renderToStaticMarkup(<PlankTimer state="RUNNING" />)

  expect(html).toContain('Pause')
  expect(html).toContain('Cancel')
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
