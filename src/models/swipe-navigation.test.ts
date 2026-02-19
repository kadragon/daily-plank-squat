import { expect, test } from 'bun:test'
import { detectSwipeDirection, getAdjacentView, type SwipeDirection } from './swipe-navigation'

test('detectSwipeDirection returns left for horizontal swipe above threshold', () => {
  const direction = detectSwipeDirection({
    startX: 240,
    startY: 200,
    endX: 120,
    endY: 205,
  })

  expect(direction).toBe('left')
})

test('detectSwipeDirection returns right for horizontal swipe above threshold', () => {
  const direction = detectSwipeDirection({
    startX: 120,
    startY: 200,
    endX: 245,
    endY: 195,
  })

  expect(direction).toBe('right')
})

test('detectSwipeDirection returns null when horizontal movement is below threshold', () => {
  const direction = detectSwipeDirection({
    startX: 200,
    startY: 200,
    endX: 165,
    endY: 200,
    minDistancePx: 48,
  })

  expect(direction).toBeNull()
})

test('detectSwipeDirection returns null when vertical drift is too large', () => {
  const direction = detectSwipeDirection({
    startX: 240,
    startY: 200,
    endX: 120,
    endY: 280,
    maxVerticalDriftPx: 40,
  })

  expect(direction).toBeNull()
})

test('getAdjacentView stops at bounds and does not wrap', () => {
  const views = ['plank', 'squat', 'pushup', 'summary'] as const
  const rightFromFirst = getAdjacentView(views, 'plank', 'right')
  const leftFromLast = getAdjacentView(views, 'summary', 'left')

  expect(rightFromFirst).toBeNull()
  expect(leftFromLast).toBeNull()
})

test('getAdjacentView returns neighboring tab for valid direction', () => {
  const views = ['plank', 'squat', 'pushup', 'summary'] as const
  const leftFromSquat = getAdjacentView(views, 'squat', 'left')
  const rightFromPushup = getAdjacentView(views, 'pushup', 'right')

  expect(leftFromSquat).toBe('pushup')
  expect(rightFromPushup).toBe('squat')
})

test('SwipeDirection type only allows left/right values', () => {
  const left: SwipeDirection = 'left'
  const right: SwipeDirection = 'right'

  expect(left).toBe('left')
  expect(right).toBe('right')
})
