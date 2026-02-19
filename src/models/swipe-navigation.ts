export type SwipeDirection = 'left' | 'right'

export interface SwipeInput {
  startX: number
  startY: number
  endX: number
  endY: number
  minDistancePx?: number
  maxVerticalDriftPx?: number
}

const DEFAULT_MIN_DISTANCE_PX = 48
const DEFAULT_MAX_VERTICAL_DRIFT_PX = 40

export function detectSwipeDirection({
  startX,
  startY,
  endX,
  endY,
  minDistancePx = DEFAULT_MIN_DISTANCE_PX,
  maxVerticalDriftPx = DEFAULT_MAX_VERTICAL_DRIFT_PX,
}: SwipeInput): SwipeDirection | null {
  const deltaX = endX - startX
  const deltaY = endY - startY
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)

  if (absX < minDistancePx) return null
  if (absY > maxVerticalDriftPx) return null
  if (absY > absX) return null

  return deltaX < 0 ? 'left' : 'right'
}

export function getAdjacentView<TView extends string>(
  orderedViews: readonly TView[],
  currentView: TView,
  direction: SwipeDirection,
): TView | null {
  const index = orderedViews.indexOf(currentView)
  if (index < 0) return null

  const nextIndex = direction === 'left' ? index + 1 : index - 1
  if (nextIndex < 0 || nextIndex >= orderedViews.length) return null

  return orderedViews[nextIndex]
}
