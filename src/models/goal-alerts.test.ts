import { test, expect } from 'bun:test'
import { createGoalAlerts } from './goal-alerts'

test('Sound plays on plank goal reached', () => {
  const played: string[] = []
  const alerts = createGoalAlerts((goal) => played.push(goal))

  alerts.onPlankProgress(60, 60)

  expect(played).toEqual(['plank'])
})

test('Sound plays on squat goal reached', () => {
  const played: string[] = []
  const alerts = createGoalAlerts((goal) => played.push(goal))

  alerts.onSquatProgress(20, 20)

  expect(played).toEqual(['squat'])
})

test('No repeat alert if goal already reached', () => {
  const played: string[] = []
  const alerts = createGoalAlerts((goal) => played.push(goal))

  alerts.onPlankProgress(60, 60)
  alerts.onPlankProgress(61, 60)

  expect(played).toEqual(['plank'])
})

test('GoalAlerts has onPushupProgress that fires at target', () => {
  const played: string[] = []
  const alerts = createGoalAlerts((goal) => played.push(goal))

  alerts.onPushupProgress(15, 15)

  expect(played).toEqual(['pushup'])
})

test('Pushup goal alert does not repeat after first trigger', () => {
  const played: string[] = []
  const alerts = createGoalAlerts((goal) => played.push(goal))

  alerts.onPushupProgress(15, 15)
  alerts.onPushupProgress(16, 15)

  expect(played).toEqual(['pushup'])
})
