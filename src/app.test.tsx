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
