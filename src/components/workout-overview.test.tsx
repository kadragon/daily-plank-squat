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

  expect(html).toContain('Daily Summary')
  expect(html).toContain('Workout Stats')
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

  expect(html).toContain('Plank target: 60s')
  expect(html).toContain('Plank: Complete')
  expect(html).toContain('Squat: Incomplete')
  expect(html).toContain('Dumbbell target: 10')
})
