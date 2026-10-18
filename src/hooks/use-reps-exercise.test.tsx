import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, renderHook } from '@testing-library/react'
import { Window } from 'happy-dom'
import { useRepsExercise } from './use-reps-exercise'

const happyWindow = new Window({ url: 'https://localhost/' })
happyWindow.SyntaxError = SyntaxError

if (typeof document === 'undefined') {
  Object.assign(globalThis, {
    window: happyWindow,
    document: happyWindow.document,
    navigator: happyWindow.navigator,
    Element: happyWindow.Element,
    HTMLElement: happyWindow.HTMLElement,
    Node: happyWindow.Node,
  })
}

afterEach(() => {
  cleanup()
})

function renderReps(initialCount: number) {
  const completions: number[] = []
  const view = renderHook(() => useRepsExercise({
    initialCount,
    initialTarget: 20,
    initialSuccess: false,
    initialCompleted: false,
    goalAlerts: { onProgress: () => {} },
    persistReason: 'squat-complete',
    requestPersist: () => {},
    onComplete: (finalCount) => { completions.push(finalCount) },
  }))
  return { view, completions }
}

test('completing at zero reps records the target', () => {
  const { view, completions } = renderReps(0)

  act(() => view.result.current.handleComplete())

  expect(completions).toEqual([20])
  expect(view.result.current.count).toBe(20)
})

test('a count committed in the same tap as completion is kept, not replaced by the target', () => {
  const { view, completions } = renderReps(0)

  act(() => {
    view.result.current.handleDoneRepsChange('15')
    view.result.current.handleComplete()
  })

  expect(completions).toEqual([15])
  expect(view.result.current.count).toBe(15)
})
