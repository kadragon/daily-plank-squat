import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import App, { computeSquatSuccess } from './app'

test('App navigates between plank/squat/deadhang/overview views', () => {
  const plankHtml = renderToStaticMarkup(<App initialView="plank" />)
  const squatHtml = renderToStaticMarkup(<App initialView="squat" />)
  const deadhangHtml = renderToStaticMarkup(<App initialView="deadhang" />)
  const overviewHtml = renderToStaticMarkup(<App initialView="overview" />)

  expect(plankHtml).toContain('시작')
  expect(squatHtml).toContain('완료 횟수')
  expect(deadhangHtml).toContain('데드행 타이머')
  expect(overviewHtml).toContain('플랭크 목표:')
  expect(overviewHtml).toContain('운동 통계')
})

test('App drives plank view from live plank state', () => {
  const runningHtml = renderToStaticMarkup(
    <App initialView="plank" initialPlankState="RUNNING" />,
  )

  expect(runningHtml).toContain('일시정지')
  expect(runningHtml).toContain('취소')
})

test('App passes computed summary targets into overview view', () => {
  const overviewHtml = renderToStaticMarkup(<App initialView="overview" />)

  expect(overviewHtml).toContain('플랭크 목표: 60초')
  expect(overviewHtml).toContain('스쿼트 목표: 20회')
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

  expect(html).toContain('aria-label="운동 탐색"')
  expect(html).toContain('app-tabbar__icon')
  expect(html).toContain('app-tabbar__label')
})

test('Wake lock notice div has wake-lock-notice class', () => {
  const html = renderToStaticMarkup(
    <App initialView="plank" initialWakeLockNotice="화면을 직접 켜 두세요" />,
  )

  expect(html).toContain('wake-lock-notice')
})

test('computeSquatSuccess recalculates status when target changes', () => {
  expect(computeSquatSuccess(10, 10)).toBe(true)
  expect(computeSquatSuccess(10, 20)).toBe(false)
})

test('App nav includes pushup, deadhang, and dumbbell tabs between squat and overview', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('푸시업')
  expect(html).toContain('데드행')
  expect(html).toContain('덤벨 컬')
  // Nav order: 플랭크, 스쿼트, 푸시업, 데드행, 덤벨 컬, 요약
  const plankIdx = html.indexOf('플랭크')
  const squatIdx = html.indexOf('스쿼트')
  const pushupIdx = html.indexOf('푸시업')
  const deadhangIdx = html.indexOf('데드행')
  const dumbbellIdx = html.indexOf('덤벨 컬')
  const overviewIdx = html.indexOf('요약')

  expect(plankIdx).toBeLessThan(squatIdx)
  expect(squatIdx).toBeLessThan(pushupIdx)
  expect(pushupIdx).toBeLessThan(deadhangIdx)
  expect(deadhangIdx).toBeLessThan(dumbbellIdx)
  expect(dumbbellIdx).toBeLessThan(overviewIdx)
})

test('App nav includes overview tab', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('요약')
})

test('App renders RepsCounter for pushup view with correct props', () => {
  const html = renderToStaticMarkup(<App initialView="pushup" />)

  expect(html).toContain('푸시업 카운터')
  expect(html).toContain('id="pushup-target-reps"')
  expect(html).toContain('id="pushup-done-reps"')
})

test('App renders pushup view with editable reps inputs before completion', () => {
  const html = renderToStaticMarkup(<App initialView="pushup" />)
  expect(html).toContain('푸시업 카운터')
  expect(html).toContain('id="pushup-done-reps"')
})

test('App applies swipe-priority main classes for workout views and scrollable stage for overview', () => {
  const workoutHtml = renderToStaticMarkup(<App initialView="squat" />)
  const overviewHtml = renderToStaticMarkup(<App initialView="overview" />)

  expect(workoutHtml).toContain('main-content--swipe')
  expect(workoutHtml).not.toContain('view-stage--scrollable')
  expect(overviewHtml).toContain('view-stage--scrollable')
  expect(overviewHtml).not.toContain('main-content--swipe')
})

test('computeSquatSuccess (reused) computes pushup success correctly', () => {
  expect(computeSquatSuccess(15, 15)).toBe(true)
  expect(computeSquatSuccess(10, 15)).toBe(false)
  expect(computeSquatSuccess(20, 15)).toBe(true)
})

test('No RPE inputs are rendered in any workout view', () => {
  const plankHtml = renderToStaticMarkup(<App initialView="plank" />)
  const squatHtml = renderToStaticMarkup(<App initialView="squat" />)
  const pushupHtml = renderToStaticMarkup(<App initialView="pushup" />)
  const deadhangHtml = renderToStaticMarkup(<App initialView="deadhang" />)

  expect(plankHtml).not.toContain('id="plank-rpe"')
  expect(squatHtml).not.toContain('id="squat-rpe"')
  expect(pushupHtml).not.toContain('id="pushup-rpe"')
  expect(deadhangHtml).not.toContain('id="deadhang-rpe"')
})

test('Recommendation is hidden in IDLE plank state', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).not.toContain('recommendation-note')
})

test('Recommendation is hidden in squat view before completion', () => {
  const html = renderToStaticMarkup(<App initialView="squat" />)

  expect(html).not.toContain('recommendation-note')
})
