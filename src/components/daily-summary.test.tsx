import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import DailySummary from './daily-summary'

test('Daily summary shows targets from fatigue model', () => {
  const html = renderToStaticMarkup(
    <DailySummary plankTargetSec={60} squatTargetReps={20} tomorrowPlankTargetSec={63} tomorrowSquatTargetReps={21} />,
  )

  expect(html).toContain('플랭크 목표: 60초')
  expect(html).toContain('스쿼트 목표: 20회')
  expect(html).toContain('내일 플랭크 목표: 63초')
  expect(html).toContain('내일 스쿼트 목표: 21회')
})

test('Daily summary shows completion status', () => {
  const html = renderToStaticMarkup(
    <DailySummary plankSuccess squatSuccess={false} />,
  )

  expect(html).toContain('플랭크: 완료')
  expect(html).toContain('스쿼트: 미완료')
})

test('DailySummary has h2 heading', () => {
  const html = renderToStaticMarkup(<DailySummary />)

  expect(html).toContain('<h2')
})

test('DailySummary warning messages have role="alert"', () => {
  const html = renderToStaticMarkup(
    <DailySummary overloadWarning suspiciousSession />,
  )

  expect(html).toContain('role="alert"')
})

test('DailySummary markup has daily-summary and summary-stat class names', () => {
  const html = renderToStaticMarkup(<DailySummary plankTargetSec={60} squatTargetReps={20} />)

  expect(html).toContain('daily-summary')
  expect(html).toContain('summary-stat')
})

test('DailySummary shows pushup target and completion status', () => {
  const html = renderToStaticMarkup(
    <DailySummary pushupTargetReps={15} pushupSuccess />,
  )

  expect(html).toContain('푸시업 목표: 15회')
  expect(html).toContain('푸시업: 완료')
})

test('DailySummary shows deadhang target and completion status', () => {
  const html = renderToStaticMarkup(
    <DailySummary deadhangTargetSec={30} deadhangSuccess />,
  )

  expect(html).toContain('데드행 목표: 30초')
  expect(html).toContain('데드행: 완료')
})

test('DailySummary shows pushup incomplete when not done', () => {
  const html = renderToStaticMarkup(
    <DailySummary pushupTargetReps={15} pushupSuccess={false} />,
  )

  expect(html).toContain('푸시업: 미완료')
})

test('DailySummary shows tomorrow pushup target', () => {
  const html = renderToStaticMarkup(
    <DailySummary tomorrowPushupTargetReps={16} />,
  )

  expect(html).toContain('내일 푸시업 목표: 16회')
})

test('DailySummary shows tomorrow deadhang target', () => {
  const html = renderToStaticMarkup(
    <DailySummary tomorrowDeadhangTargetSec={33} />,
  )

  expect(html).toContain('내일 데드행 목표: 33초')
})

test('DailySummary renders Apple Health export button', () => {
  const html = renderToStaticMarkup(
    <DailySummary healthExportEnabled onExportToHealth={() => {}} />,
  )

  expect(html).toContain('Apple 건강에 기록')
  expect(html).not.toContain('disabled')
})

test('DailySummary disables Apple Health export button when export is unavailable', () => {
  const html = renderToStaticMarkup(<DailySummary healthExportEnabled={false} />)

  expect(html).toContain('Apple 건강에 기록')
  expect(html).toContain('disabled')
})

test('DailySummary renders health export hint when provided', () => {
  const html = renderToStaticMarkup(
    <DailySummary healthExportHint="기록은 가능하지만 측정 환경 경고" />,
  )

  expect(html).toContain('기록은 가능하지만 측정 환경 경고')
})
