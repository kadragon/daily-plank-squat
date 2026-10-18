import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import RepsCounter from './reps-counter'

test('RepsCounter shows a large count / target display without a target input', () => {
  const html = renderToStaticMarkup(<RepsCounter title="푸시업 카운터" idPrefix="pushup" exerciseName="푸시업" count={7} targetReps={15} />)

  expect(html).toMatch(/class="reps-display__value">7</)
  expect(html).toMatch(/class="reps-display__target">\/ 15</)
  expect(html).toContain('aria-label="완료 횟수 7회, 목표 15회. 눌러서 직접 입력"')
  expect(html).not.toContain('pushup-target-reps')
  expect(html).not.toContain('목표 횟수')
})

test('RepsCounter renders a large +1 and smaller −1 / +5 buttons', () => {
  const html = renderToStaticMarkup(<RepsCounter count={3} />)

  expect(html).toMatch(/class="btn reps-adjust__major"[^>]*aria-label="1회 추가"[^>]*>\+1</)
  expect(html).toMatch(/class="btn btn--secondary reps-adjust__minor"[^>]*aria-label="1회 빼기"[^>]*>−1</)
  expect(html).toMatch(/class="btn btn--secondary reps-adjust__minor"[^>]*aria-label="5회 추가"[^>]*>\+5</)
})

test('RepsCounter emphasizes the complete button only once count reaches target', () => {
  const below = renderToStaticMarkup(<RepsCounter count={14} targetReps={15} />)
  const reached = renderToStaticMarkup(<RepsCounter count={15} targetReps={15} />)

  expect(below).toContain('btn btn--primary reps-complete"')
  expect(below).not.toContain('reps-complete--ready')
  expect(reached).toContain('reps-complete reps-complete--ready')
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

test('RepsCounter does not render the direct entry input until the count is tapped', () => {
  const html = renderToStaticMarkup(<RepsCounter count={0} />)

  expect(html).not.toContain('<input')
})
