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
