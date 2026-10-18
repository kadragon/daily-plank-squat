import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import WorkoutOverview from './workout-overview'

test('WorkoutOverview renders both summary and stats sections', () => {
  const html = renderToStaticMarkup(
    <WorkoutOverview
      plankTargetSec={60}
      squatTargetReps={20}
      fatigue={0.5}
    />,
  )

  expect(html).toContain('오늘 요약')
  expect(html).toContain('운동 통계')
})

test('WorkoutOverview passes through summary props', () => {
  const html = renderToStaticMarkup(
    <WorkoutOverview
      plankTargetSec={60}
      squatTargetReps={20}
      pushupTargetReps={15}
      deadhangTargetSec={30}
      dumbbellTargetReps={10}
      plankSuccess={true}
      squatSuccess={false}
    />,
  )

  expect(html).toContain('플랭크 목표: 60초')
  expect(html).toContain('플랭크: 완료')
  expect(html).toContain('스쿼트: 미완료')
  expect(html).toContain('덤벨 컬 목표: 10회')
})
