import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import PlankTimer from './plank-timer'

test('PlankTimer IDLE shows full target time', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" targetSec={60} />)

  expect(html).toContain('01:00')
})

test('PlankTimer shows countdown at halfway', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="RUNNING" elapsedMs={30_000} targetSec={60} />,
  )

  expect(html).toContain('00:30')
})

test('Plank view shows start button in IDLE', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" />)

  expect(html).toContain('시작')
})

test('Plank view shows pause/cancel in RUNNING and no manual complete button', () => {
  const html = renderToStaticMarkup(<PlankTimer state="RUNNING" />)

  expect(html).toContain('일시정지')
  expect(html).toContain('취소')
  expect(html).not.toContain('완료')
})

test('Plank view shows resume/cancel in PAUSED', () => {
  const html = renderToStaticMarkup(<PlankTimer state="PAUSED" />)

  expect(html).toContain('재개')
  expect(html).toContain('취소')
})

test('Plank view shows result in COMPLETED', () => {
  const html = renderToStaticMarkup(<PlankTimer state="COMPLETED" elapsedMs={45_000} />)

  expect(html).toContain('결과')
  expect(html).toContain('45초')
})

test('Plank result clamps negative elapsed time to 0 seconds', () => {
  const html = renderToStaticMarkup(<PlankTimer state="COMPLETED" elapsedMs={-1000} />)

  expect(html).toContain('결과: 0초')
})

test('PlankTimer elapsed display has aria-live="polite"', () => {
  const html = renderToStaticMarkup(<PlankTimer state="RUNNING" />)

  expect(html).toContain('aria-live="polite"')
})

test('PlankTimer progress ring reports 50% in RUNNING state', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="RUNNING" elapsedMs={30_000} targetSec={60} />,
  )

  expect(html).toContain('timer-ring__fill')
  expect(html).toContain('role="progressbar"')
  expect(html).toContain('aria-valuenow="50"')
  expect(html).not.toContain('progress-bar')
})

test('PlankTimer primary button color class follows state', () => {
  expect(renderToStaticMarkup(<PlankTimer state="IDLE" />)).toContain('timer-primary--go')
  expect(renderToStaticMarkup(<PlankTimer state="RUNNING" />)).toContain('timer-primary--pause')
  expect(renderToStaticMarkup(<PlankTimer state="PAUSED" />)).toContain('timer-primary--go')
})

test('PlankTimer cancel in RUNNING and PAUSED is described as a long press', () => {
  for (const state of ['RUNNING', 'PAUSED'] as const) {
    const html = renderToStaticMarkup(<PlankTimer state={state} />)

    expect(html).toContain('aria-describedby=')
    expect(html).toContain('길게 눌러 취소')
  }
})

test('PlankTimer shows 다음 운동 only after the session ends and only with onNext', () => {
  const noop = () => {}

  expect(renderToStaticMarkup(<PlankTimer state="COMPLETED" onNext={noop} />)).toContain('다음 운동')
  expect(renderToStaticMarkup(<PlankTimer state="CANCELLED" onNext={noop} />)).toContain('다음 운동')
  expect(renderToStaticMarkup(<PlankTimer state="RUNNING" onNext={noop} />)).not.toContain('다음 운동')
  expect(renderToStaticMarkup(<PlankTimer state="COMPLETED" />)).not.toContain('다음 운동')
})

test('PlankTimer renders custom title via title prop', () => {
  const html = renderToStaticMarkup(<PlankTimer title="데드행 타이머" />)

  expect(html).toContain('<h2>데드행 타이머</h2>')
})

test('PlankTimer defaults to "플랭크 타이머" when title prop is omitted', () => {
  const html = renderToStaticMarkup(<PlankTimer />)

  expect(html).toContain('<h2>플랭크 타이머</h2>')
})

test('PlankTimer disables Start button when startDisabled=true', () => {
  const html = renderToStaticMarkup(<PlankTimer state="IDLE" startDisabled />)

  expect(html).toContain('시작')
  expect(html).toContain('disabled')
})

test('PlankTimer hides recommendation when state is IDLE', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="IDLE" tomorrowTargetSec={63} tomorrowDeltaSec={3} recommendationReasonText="목표 달성으로 기본 증량" />,
  )

  expect(html).not.toContain('recommendation-note')
})

test('PlankTimer shows recommendation when state is COMPLETED', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="COMPLETED" tomorrowTargetSec={63} tomorrowDeltaSec={3} recommendationReasonText="목표 달성으로 기본 증량" />,
  )

  expect(html).toContain('내일 추천: 63초 (+3초)')
  expect(html).toContain('목표 달성으로 기본 증량')
})

test('PlankTimer shows recommendation when state is CANCELLED', () => {
  const html = renderToStaticMarkup(
    <PlankTimer state="CANCELLED" tomorrowTargetSec={63} tomorrowDeltaSec={3} recommendationReasonText="목표 달성으로 기본 증량" />,
  )

  expect(html).toContain('recommendation-note')
})

test('PlankTimer COUNTDOWN state shows Cancel button', () => {
  const html = renderToStaticMarkup(<PlankTimer state="COUNTDOWN" countdownMs={5000} />)

  expect(html).toContain('취소')
  expect(html).not.toContain('일시정지')
  expect(html).not.toContain('시작')
})

test('PlankTimer tells the user when a rerun kept the earlier result', () => {
  const kept = renderToStaticMarkup(<PlankTimer state="CANCELLED" elapsedMs={10_000} keptResultSec={60} />)
  expect(kept).toContain('취소됨: 10초')
  expect(kept).toContain('더 좋은 이전 기록(60초)을 유지했어요')

  const replaced = renderToStaticMarkup(<PlankTimer state="CANCELLED" elapsedMs={45_000} />)
  expect(replaced).not.toContain('이전 기록')
})
