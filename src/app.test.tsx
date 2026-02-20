import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import App, { computeSquatSuccess } from './app'

test('App navigates between plank/squat/summary/stats views', () => {
  const plankHtml = renderToStaticMarkup(<App initialView="plank" />)
  const squatHtml = renderToStaticMarkup(<App initialView="squat" />)
  const summaryHtml = renderToStaticMarkup(<App initialView="summary" />)
  const statsHtml = renderToStaticMarkup(<App initialView="stats" />)

  expect(plankHtml).toContain('Start')
  expect(squatHtml).toContain('Done reps')
  expect(summaryHtml).toContain('Plank target:')
  expect(statsHtml).toContain('Workout Stats')
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

test('Bottom nav has app-tabbar class and active button has app-tabbar__button--active', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('class="nav app-tabbar"')
  expect(html).toContain('app-tabbar__button--active')
})

test('Bottom nav exposes exercise navigation semantics', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('aria-label="Exercise navigation"')
  expect(html).toContain('app-tabbar__icon')
  expect(html).toContain('app-tabbar__label')
})

test('Wake lock notice div has wake-lock-notice class', () => {
  const html = renderToStaticMarkup(
    <App initialView="plank" initialWakeLockNotice="Keep screen on manually" />,
  )

  expect(html).toContain('wake-lock-notice')
})

test('computeSquatSuccess recalculates status when target changes', () => {
  expect(computeSquatSuccess(10, 10)).toBe(true)
  expect(computeSquatSuccess(10, 20)).toBe(false)
})

test('App nav includes pushup tab between squat and summary', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('Pushup')
  // Nav order: Plank, Squat, Pushup, Summary
  const plankIdx = html.indexOf('Plank')
  const squatIdx = html.indexOf('Squat')
  const pushupIdx = html.indexOf('Pushup')
  const summaryIdx = html.indexOf('Summary')

  expect(plankIdx).toBeLessThan(squatIdx)
  expect(squatIdx).toBeLessThan(pushupIdx)
  expect(pushupIdx).toBeLessThan(summaryIdx)
})

test('App nav includes stats tab after summary', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  const summaryIdx = html.indexOf('Summary')
  const statsIdx = html.indexOf('Stats')

  expect(summaryIdx).toBeLessThan(statsIdx)
})

test('App renders RepsCounter for pushup view with correct props', () => {
  const html = renderToStaticMarkup(<App initialView="pushup" />)

  expect(html).toContain('Pushup Counter')
  expect(html).toContain('id="pushup-target-reps"')
  expect(html).toContain('id="pushup-done-reps"')
})

test('App renders pushup view with editable reps inputs before completion', () => {
  const html = renderToStaticMarkup(<App initialView="pushup" />)
  expect(html).toContain('Pushup Counter')
  expect(html).toContain('id="pushup-done-reps"')
})

test('App applies swipe-priority main classes for workout views and scrollable stage for summary', () => {
  const workoutHtml = renderToStaticMarkup(<App initialView="squat" />)
  const summaryHtml = renderToStaticMarkup(<App initialView="summary" />)

  expect(workoutHtml).toContain('main-content--swipe')
  expect(workoutHtml).not.toContain('view-stage--scrollable')
  expect(summaryHtml).toContain('view-stage--scrollable')
  expect(summaryHtml).not.toContain('main-content--swipe')
})

test('computeSquatSuccess (reused) computes pushup success correctly', () => {
  expect(computeSquatSuccess(15, 15)).toBe(true)
  expect(computeSquatSuccess(10, 15)).toBe(false)
  expect(computeSquatSuccess(20, 15)).toBe(true)
})
