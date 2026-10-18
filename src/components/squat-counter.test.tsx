import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import SquatCounter from './squat-counter'

test('Squat view shows target and done reps numeric inputs', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('목표 횟수')
  expect(html).toContain('완료 횟수')
  expect(html).toContain('type="text"')
  expect(html).toContain('inputMode="numeric"')
})

test('Squat view shows complete button', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('완료')
})

test('Squat view no longer renders +1/-1 buttons', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).not.toContain('Increment squats')
  expect(html).not.toContain('Decrement squats')
})

test('SquatCounter controls have aria-labels', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('aria-label="목표 횟수"')
  expect(html).toContain('aria-label="완료 횟수"')
  expect(html).toContain('aria-label="스쿼트 완료"')
})

test('SquatCounter done reps value is rendered', () => {
  const html = renderToStaticMarkup(<SquatCounter count={5} />)

  expect(html).toContain('value="5"')
})

test('SquatCounter has h2 heading', () => {
  const html = renderToStaticMarkup(<SquatCounter />)

  expect(html).toContain('<h2')
})

test('SquatCounter markup has reps-counter, reps-input, and btn class names', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('reps-counter')
  expect(html).toContain('reps-input')
  expect(html).toContain('btn')
})

test('SquatCounter has reps-counter--goal-reached when count meets target', () => {
  const html = renderToStaticMarkup(<SquatCounter count={20} targetReps={20} />)

  expect(html).toContain('reps-counter--goal-reached')
})
