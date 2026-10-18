import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Window } from 'happy-dom'
import PlankTimer from './plank-timer'
import type { PlankState } from '../types'

const happyWindow = new Window({ url: 'https://localhost/' })
happyWindow.SyntaxError = SyntaxError

if (typeof document === 'undefined') {
  Object.assign(globalThis, {
    window: happyWindow,
    document: happyWindow.document,
    navigator: happyWindow.navigator,
    localStorage: happyWindow.localStorage,
    Element: happyWindow.Element,
    HTMLElement: happyWindow.HTMLElement,
    Node: happyWindow.Node,
    Event: happyWindow.Event,
    PointerEvent: happyWindow.PointerEvent,
  })
}

afterEach(() => {
  cleanup()
})

const HOLD_MS = 40

function wait(ms: number) {
  return act(() => new Promise<void>((resolve) => setTimeout(resolve, ms)))
}

function renderTimer(state: PlankState) {
  const calls = { start: 0, pause: 0, resume: 0, cancel: 0, next: 0 }
  const view = render(
    <PlankTimer
      state={state}
      cancelHoldMs={HOLD_MS}
      onStart={() => { calls.start += 1 }}
      onPause={() => { calls.pause += 1 }}
      onResume={() => { calls.resume += 1 }}
      onCancel={() => { calls.cancel += 1 }}
      onNext={() => { calls.next += 1 }}
    />,
  )
  return { view, calls }
}

test('primary button role and label follow state and route to the matching handler', () => {
  const idle = renderTimer('IDLE')
  fireEvent.click(idle.view.getByRole('button', { name: '시작' }))
  expect(idle.calls.start).toBe(1)
  cleanup()

  const running = renderTimer('RUNNING')
  fireEvent.click(running.view.getByRole('button', { name: '일시정지' }))
  expect(running.calls.pause).toBe(1)
  cleanup()

  const paused = renderTimer('PAUSED')
  fireEvent.click(paused.view.getByRole('button', { name: '재개' }))
  expect(paused.calls.resume).toBe(1)
})

test('short tap on cancel during RUNNING does not cancel', async () => {
  const { view, calls } = renderTimer('RUNNING')
  const cancel = view.getByRole('button', { name: '취소' })

  fireEvent.pointerDown(cancel, { pointerId: 1, button: 0 })
  fireEvent.pointerUp(cancel, { pointerId: 1, button: 0 })
  fireEvent.click(cancel)
  await wait(HOLD_MS * 2)

  expect(calls.cancel).toBe(0)
})

test('pointer long press on cancel during RUNNING and PAUSED cancels', async () => {
  for (const state of ['RUNNING', 'PAUSED'] as const) {
    const { view, calls } = renderTimer(state)

    fireEvent.pointerDown(view.getByRole('button', { name: '취소' }), { pointerId: 1, button: 0 })
    await wait(HOLD_MS * 2)

    expect(calls.cancel).toBe(1)
    cleanup()
  }
})

test('keyboard hold on cancel during RUNNING cancels', async () => {
  const { view, calls } = renderTimer('RUNNING')

  fireEvent.keyDown(view.getByRole('button', { name: '취소' }), { key: ' ' })
  await wait(HOLD_MS * 2)

  expect(calls.cancel).toBe(1)
})

test('cancel hold timer is cleared when the timer unmounts mid-press', async () => {
  const { view, calls } = renderTimer('RUNNING')

  fireEvent.pointerDown(view.getByRole('button', { name: '취소' }), { pointerId: 1, button: 0 })
  view.unmount()
  await wait(HOLD_MS * 2)

  expect(calls.cancel).toBe(0)
})

test('cancel during COUNTDOWN is a plain tap', () => {
  const { view, calls } = renderTimer('COUNTDOWN')

  fireEvent.click(view.getByRole('button', { name: '취소' }))

  expect(calls.cancel).toBe(1)
})

test('다음 운동 button after completion calls onNext', () => {
  const { view, calls } = renderTimer('COMPLETED')

  fireEvent.click(view.getByRole('button', { name: '다음 운동' }))

  expect(calls.next).toBe(1)
})
