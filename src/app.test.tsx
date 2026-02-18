import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './app'

test('App navigates between plank/squat/summary views', () => {
  const plankHtml = renderToStaticMarkup(<App initialView="plank" />)
  const squatHtml = renderToStaticMarkup(<App initialView="squat" />)
  const summaryHtml = renderToStaticMarkup(<App initialView="summary" />)

  expect(plankHtml).toContain('Start')
  expect(squatHtml).toContain('Done reps')
  expect(summaryHtml).toContain('Plank target:')
})

test('App drives plank view from live plank state', () => {
  const runningHtml = renderToStaticMarkup(
    <App initialView="plank" initialPlankState="RUNNING" />,
  )

  expect(runningHtml).toContain('Pause')
  expect(runningHtml).toContain('Cancel')
})

test('App passes computed summary targets into summary view', () => {
  const summaryHtml = renderToStaticMarkup(<App initialView="summary" />)

  expect(summaryHtml).toContain('Plank target: 60s')
  expect(summaryHtml).toContain('Squat target: 20')
})

test('App wraps active view in <main> landmark', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('<main')
})

test('Active nav button has aria-current="page", others do not', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('aria-current="page"')
  expect((html.match(/aria-current="page"/g) ?? []).length).toBe(1)
})

test('Nav has class="nav" and active button has nav-btn--active', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('class="nav"')
  expect(html).toContain('nav-btn--active')
})

test('Wake lock notice div has wake-lock-notice class', () => {
  const html = renderToStaticMarkup(
    <App initialView="plank" initialWakeLockNotice="Keep screen on manually" />,
  )

  expect(html).toContain('wake-lock-notice')
})
