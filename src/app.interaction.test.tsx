import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Window } from 'happy-dom'
import App from './app'

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
    requestAnimationFrame: happyWindow.requestAnimationFrame.bind(happyWindow),
    cancelAnimationFrame: happyWindow.cancelAnimationFrame.bind(happyWindow),
  })
}

afterEach(() => {
  cleanup()
  happyWindow.localStorage.clear()
})

function swipe(main: HTMLElement, startX: number, endX: number, y = 220) {
  fireEvent.pointerDown(main, {
    clientX: startX,
    clientY: y,
    pointerId: 1,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(main, {
    clientX: endX,
    clientY: y,
    pointerId: 1,
    pointerType: 'touch',
  })
}

test('Swipe left from plank moves to squat', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 260, 120)

  expect(view.getByText('Squat Counter')).toBeTruthy()
})

test('Swipe right on first tab is a no-op', () => {
  const view = render(<App initialView="plank" />)
  const main = view.container.querySelector('main')
  if (!main) throw new Error('main element not found')

  swipe(main, 120, 260)

  expect(view.getByText('Plank Timer')).toBeTruthy()
})

test('Swipe started from input does not navigate', () => {
  const view = render(<App initialView="squat" />)
  const doneInput = view.container.querySelector('#squat-done-reps')
  if (!doneInput) throw new Error('squat done reps input not found')

  fireEvent.pointerDown(doneInput, {
    clientX: 260,
    clientY: 260,
    pointerId: 1,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(doneInput, {
    clientX: 120,
    clientY: 260,
    pointerId: 1,
    pointerType: 'touch',
  })

  expect(view.getByText('Squat Counter')).toBeTruthy()
})

test('Tap navigation fallback switches tabs and updates active state', () => {
  const view = render(<App initialView="plank" />)
  const pushupTab = Array.from(view.container.querySelectorAll('button'))
    .find((button) => button.textContent?.trim() === 'Pushup')
  if (!pushupTab) throw new Error('pushup tab button not found')

  fireEvent.click(pushupTab)

  expect(view.getByText('Pushup Counter')).toBeTruthy()
  expect(pushupTab.getAttribute('aria-current')).toBe('page')
})
