import { useRef, type PointerEvent as ReactPointerEvent } from 'react'
import { isSwipeIgnoredTarget, type AppView } from '../models/navigation'
import { detectSwipeDirection, getAdjacentView } from '../models/swipe-navigation'

export interface UseSwipeNavigationOptions {
  activeNavViews: AppView[]
  view: AppView
  setView: (view: AppView) => void
}

export interface UseSwipeNavigationReturn {
  handlePointerDown: (event: ReactPointerEvent<HTMLElement>) => void
  handlePointerUp: (event: ReactPointerEvent<HTMLElement>) => void
  handlePointerCancel: () => void
  handlePointerLeave: () => void
  handleLostPointerCapture: () => void
}

export function useSwipeNavigation({ activeNavViews, view, setView }: UseSwipeNavigationOptions): UseSwipeNavigationReturn {
  const swipeStartRef = useRef<{ x: number, y: number, pointerId: number, ignore: boolean } | null>(null)

  function handlePointerDown(event: ReactPointerEvent<HTMLElement>) {
    swipeStartRef.current = {
      x: event.clientX,
      y: event.clientY,
      pointerId: event.pointerId,
      ignore: isSwipeIgnoredTarget(event.target),
    }
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLElement>) {
    const swipeStart = swipeStartRef.current
    if (!swipeStart) return
    if (swipeStart.pointerId !== event.pointerId) {
      swipeStartRef.current = null
      return
    }

    swipeStartRef.current = null
    if (swipeStart.ignore) return

    const direction = detectSwipeDirection({
      startX: swipeStart.x,
      startY: swipeStart.y,
      endX: event.clientX,
      endY: event.clientY,
    })
    if (!direction) return

    const nextView = getAdjacentView(activeNavViews, view, direction)
    if (nextView) {
      setView(nextView)
    }
  }

  function handlePointerCancel() {
    swipeStartRef.current = null
  }

  function handlePointerLeave() {
    swipeStartRef.current = null
  }

  function handleLostPointerCapture() {
    swipeStartRef.current = null
  }

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerCancel,
    handlePointerLeave,
    handleLostPointerCapture,
  }
}
