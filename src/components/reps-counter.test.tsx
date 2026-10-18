import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import RepsCounter from './reps-counter'

test('RepsCounter renders "푸시업 카운터" heading when title="푸시업 카운터"', () => {
  const html = renderToStaticMarkup(<RepsCounter title="푸시업 카운터" idPrefix="pushup" exerciseName="푸시업" count={0} />)

  expect(html).toContain('푸시업 카운터')
  expect(html).toContain('<h2')
})

test('RepsCounter uses pushup-prefixed ids when idPrefix="pushup"', () => {
  const html = renderToStaticMarkup(<RepsCounter title="푸시업 카운터" idPrefix="pushup" exerciseName="푸시업" count={0} />)

  expect(html).toContain('id="pushup-target-reps"')
  expect(html).toContain('id="pushup-done-reps"')
})

test('RepsCounter hides recommendation when showRecommendation=false', () => {
  const html = renderToStaticMarkup(
    <RepsCounter title="푸시업 카운터" idPrefix="pushup" exerciseName="푸시업" count={0} showRecommendation={false} />,
  )

  expect(html).not.toContain('recommendation-note')
})

test('RepsCounter shows recommendation when showRecommendation=true', () => {
  const html = renderToStaticMarkup(
    <RepsCounter
      title="푸시업 카운터"
      idPrefix="pushup"
      exerciseName="푸시업"
      count={0}
      showRecommendation={true}
      tomorrowTargetReps={21}
      tomorrowDeltaReps={1}
      recommendationReasonText="목표 달성으로 기본 증량"
    />,
  )

  expect(html).toContain('내일 추천: 21회 (+1회)')
  expect(html).toContain('목표 달성으로 기본 증량')
})

test('RepsCounter complete button aria-label reflects exerciseName', () => {
  const html = renderToStaticMarkup(<RepsCounter title="푸시업 카운터" idPrefix="pushup" exerciseName="푸시업" count={0} />)

  expect(html).toContain('aria-label="푸시업 완료"')
})

test('RepsCounter renders reps-counter class', () => {
  const html = renderToStaticMarkup(<RepsCounter count={0} />)

  expect(html).toContain('reps-counter')
})

test('RepsCounter renders reps-counter--goal-reached when count meets target', () => {
  const html = renderToStaticMarkup(<RepsCounter count={15} targetReps={15} />)

  expect(html).toContain('reps-counter--goal-reached')
})

test('RepsCounter renders inline save feedback with polite live region when provided', () => {
  const html = renderToStaticMarkup(
    <RepsCounter
      count={12}
      targetReps={15}
      saveFeedbackText="방금 저장됨"
      saveFeedbackTone="success"
    />,
  )

  expect(html).toContain('방금 저장됨')
  expect(html).toContain('reps-save-feedback')
  expect(html).toContain('reps-save-feedback--success')
  expect(html).toContain('aria-live="polite"')
})

test('RepsCounter does not render RPE input', () => {
  const html = renderToStaticMarkup(<RepsCounter count={0} />)

  expect(html).not.toContain('RPE')
  expect(html).not.toContain('rpe')
})

test('RepsCounter renders type="text" with inputMode="numeric" and pattern', () => {
  const html = renderToStaticMarkup(<RepsCounter count={0} />)

  expect(html).toContain('type="text"')
  expect(html).toContain('inputMode="numeric"')
  expect(html).toContain('pattern="[0-9]*"')
  expect(html).not.toContain('type="number"')
})
