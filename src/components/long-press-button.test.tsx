import { afterEach, expect, test } from 'bun:test'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { Window } from 'happy-dom'
import LongPressButton from './long-press-button'

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

function renderButton() {
  let calls = 0
  const view = render(
    <LongPressButton label="취소" description="길게 눌러 취소" holdMs={HOLD_MS} onLongPress={() => { calls += 1 }} />,
  )
  return { view, button: view.getByRole('button', { name: '취소' }), calls: () => calls }
}

test('LongPressButton fires after holding the pointer for holdMs', async () => {
  const { button, calls } = renderButton()

  fireEvent.pointerDown(button, { pointerId: 1, button: 0 })
  await wait(HOLD_MS * 2)

  expect(calls()).toBe(1)
})

test('LongPressButton click or short tap does not fire', async () => {
  const { button, calls } = renderButton()

  fireEvent.click(button)
  fireEvent.pointerDown(button, { pointerId: 1, button: 0 })
  fireEvent.pointerUp(button, { pointerId: 1, button: 0 })
  await wait(HOLD_MS * 2)

  expect(calls()).toBe(0)
})

test('LongPressButton clears the pending timer when the pointer leaves', async () => {
  const { button, calls } = renderButton()

  fireEvent.pointerDown(button, { pointerId: 1, button: 0 })
  fireEvent.pointerLeave(button, { pointerId: 1 })
  await wait(HOLD_MS * 2)

  expect(calls()).toBe(0)
})

test('LongPressButton clears the pending timer on unmount', async () => {
  const { view, button, calls } = renderButton()

  fireEvent.pointerDown(button, { pointerId: 1, button: 0 })
  view.unmount()
  await wait(HOLD_MS * 2)

  expect(calls()).toBe(0)
})

test('LongPressButton fires on a held Space or Enter key and ignores a quick key tap', async () => {
  const { button, calls } = renderButton()

  fireEvent.keyDown(button, { key: 'Enter' })
  fireEvent.keyUp(button, { key: 'Enter' })
  await wait(HOLD_MS * 2)
  expect(calls()).toBe(0)

  fireEvent.keyDown(button, { key: ' ' })
  fireEvent.keyDown(button, { key: ' ', repeat: true })
  await wait(HOLD_MS * 2)
  fireEvent.keyUp(button, { key: ' ' })
  expect(calls()).toBe(1)

  fireEvent.keyDown(button, { key: 'Enter' })
  await wait(HOLD_MS * 2)
  expect(calls()).toBe(2)
})

test('LongPressButton shows fill progress while pressed and describes the gesture', () => {
  const { view, button } = renderButton()

  expect(button.className).not.toContain('long-press-btn--pressing')
  fireEvent.pointerDown(button, { pointerId: 1, button: 0 })
  expect(button.className).toContain('long-press-btn--pressing')
  fireEvent.pointerUp(button, { pointerId: 1, button: 0 })
  expect(button.className).not.toContain('long-press-btn--pressing')

  expect(button.getAttribute('data-swipe-ignore')).toBe('true')
  const descriptionId = button.getAttribute('aria-describedby')
  expect(descriptionId).toBeTruthy()
  expect(view.container.querySelector(`[id="${descriptionId}"]`)?.textContent).toBe('길게 눌러 취소')
})
