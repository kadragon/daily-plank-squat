import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import App from './app'

test('App navigates between plank/squat/summary views', () => {
  const plankHtml = renderToStaticMarkup(<App initialView="plank" />)
  const squatHtml = renderToStaticMarkup(<App initialView="squat" />)
  const summaryHtml = renderToStaticMarkup(<App initialView="summary" />)

  expect(plankHtml).toContain('Start')
  expect(squatHtml).toContain('Count:')
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
