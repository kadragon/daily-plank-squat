import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import App, { computeSquatSuccess } from './app'

test('App renders plank/squat/deadhang detail, today, and history views', () => {
  const plankHtml = renderToStaticMarkup(<App initialView="plank" />)
  const squatHtml = renderToStaticMarkup(<App initialView="squat" />)
  const deadhangHtml = renderToStaticMarkup(<App initialView="deadhang" />)
  const todayHtml = renderToStaticMarkup(<App initialView="today" />)
  const historyHtml = renderToStaticMarkup(<App initialView="history" />)

  expect(plankHtml).toContain('시작')
  expect(squatHtml).toContain('완료 횟수')
  expect(squatHtml).toContain('1회 추가')
  expect(deadhangHtml).toContain('데드행 타이머')
  expect(todayHtml).toContain('exercise-card')
  expect(historyHtml).toContain('운동 통계')
  expect(historyHtml).toContain('날짜별 기록')
})

test('App opens the today tab by default', () => {
  const html = renderToStaticMarkup(<App />)

  expect(html).toContain('today-workout')
})

test('App drives plank view from live plank state', () => {
  const runningHtml = renderToStaticMarkup(
    <App initialView="plank" initialPlankState="RUNNING" />,
  )

  expect(runningHtml).toContain('일시정지')
  expect(runningHtml).toContain('취소')
})

test('App passes computed targets into today exercise cards', () => {
  const todayHtml = renderToStaticMarkup(<App initialView="today" />)

  expect(todayHtml).toContain('0초 / 60초')
  expect(todayHtml).toContain('0회 / 20회')
})

test('Bottom nav exposes labeled tab semantics with SVG icons', () => {
  const html = renderToStaticMarkup(<App initialView="plank" />)

  expect(html).toContain('aria-label="주 메뉴"')
  expect(html).toMatch(/<svg class="app-tabbar__icon"/)
  expect(html).toContain('app-tabbar__label')
})

test('Wake lock notice div has wake-lock-notice class', () => {
  const html = renderToStaticMarkup(
    <App initialView="plank" initialWakeLockNotice="화면을 직접 켜 두세요" />,
  )

  expect(html).toContain('wake-lock-notice')
})

test('computeSquatSuccess succeeds once reps reach or exceed the target', () => {
  expect(computeSquatSuccess(10, 10)).toBe(true)
  expect(computeSquatSuccess(10, 20)).toBe(false)
  expect(computeSquatSuccess(20, 15)).toBe(true)
})

test('App nav shows exactly three tabs in order 오늘 운동, 기록, 설정', () => {
  const html = renderToStaticMarkup(<App initialView="today" />)
  const labels = [...html.matchAll(/<span class="app-tabbar__label">([^<]*)<\/span>/g)].map((match) => match[1])

  expect(labels).toEqual(['오늘 운동', '기록', '설정'])
})

test('Today tab is the active tab while on an exercise detail view', () => {
  for (const view of ['plank', 'squat', 'pushup', 'deadhang', 'dumbbell'] as const) {
    const html = renderToStaticMarkup(<App initialView={view} />)
    const activeLabel = html.match(/aria-current="page"[^>]*>(?:(?!<\/button>)[\s\S])*?<span class="app-tabbar__label">([^<]*)</)?.[1]

    expect(activeLabel).toBe('오늘 운동')
  }
})

test('Exercise detail view has back affordance and enabled exercise chips', () => {
  const html = renderToStaticMarkup(<App initialView="squat" />)

  expect(html).toContain('aria-label="오늘 운동 목록으로 돌아가기"')
  expect(html).toContain('aria-label="운동 선택"')
  expect(html).toMatch(/aria-pressed="true"[^>]*>스쿼트</)
})

test('App applies swipe-priority main classes for workout views and scrollable stage for tab views', () => {
  const workoutHtml = renderToStaticMarkup(<App initialView="squat" />)

  expect(workoutHtml).toContain('main-content--swipe')
  expect(workoutHtml).not.toContain('view-stage--scrollable')
  for (const view of ['today', 'history', 'settings'] as const) {
    const tabHtml = renderToStaticMarkup(<App initialView={view} />)
    expect(tabHtml).toContain('view-stage--scrollable')
    expect(tabHtml).not.toContain('main-content--swipe')
  }
})
