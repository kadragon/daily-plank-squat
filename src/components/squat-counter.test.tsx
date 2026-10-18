import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import SquatCounter from './squat-counter'

test('Squat view shows count / target display and no target input', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} targetReps={20} />)

  expect(html).toContain('완료 횟수 3회, 목표 20회')
  expect(html).not.toContain('목표 횟수')
  expect(html).not.toContain('squat-target-reps')
})

test('Squat view shows complete button', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('>완료</button>')
})

test('Squat view renders +1/−1/+5 tap buttons', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('>+1</button>')
  expect(html).toContain('>−1</button>')
  expect(html).toContain('>+5</button>')
})

test('SquatCounter controls have aria-labels', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('aria-label="1회 추가"')
  expect(html).toContain('aria-label="1회 빼기"')
  expect(html).toContain('aria-label="5회 추가"')
  expect(html).toContain('aria-label="스쿼트 완료"')
})

test('SquatCounter done reps value is rendered', () => {
  const html = renderToStaticMarkup(<SquatCounter count={5} />)

  expect(html).toMatch(/class="reps-display__value">5</)
})

test('SquatCounter has h2 heading', () => {
  const html = renderToStaticMarkup(<SquatCounter />)

  expect(html).toContain('<h2')
})

test('SquatCounter markup has reps-counter, reps-display, and btn class names', () => {
  const html = renderToStaticMarkup(<SquatCounter count={0} />)

  expect(html).toContain('reps-counter')
  expect(html).toContain('reps-display')
  expect(html).toContain('btn')
})

test('SquatCounter has reps-counter--goal-reached when count meets target', () => {
  const html = renderToStaticMarkup(<SquatCounter count={20} targetReps={20} />)

  expect(html).toContain('reps-counter--goal-reached')
})
