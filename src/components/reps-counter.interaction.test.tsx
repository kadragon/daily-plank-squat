import { afterEach, expect, test } from 'bun:test'
import { cleanup, fireEvent, render } from '@testing-library/react'
import { Window } from 'happy-dom'
import RepsCounter from './reps-counter'

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

function renderCounter(count: number, targetReps = 20) {
  const changes: string[] = []
  const view = render(
    <RepsCounter
      idPrefix="squat"
      count={count}
      targetReps={targetReps}
      onDoneRepsChange={(raw) => { changes.push(raw) }}
    />,
  )
  return { view, changes }
}

test('+1, +5 and −1 buttons report the adjusted count', () => {
  const { view, changes } = renderCounter(7)

  fireEvent.click(view.getByRole('button', { name: '1회 추가' }))
  fireEvent.click(view.getByRole('button', { name: '5회 추가' }))
  fireEvent.click(view.getByRole('button', { name: '1회 빼기' }))

  expect(changes).toEqual(['8', '12', '6'])
})

test('−1 is disabled at zero so the count never goes negative', () => {
  const { view, changes } = renderCounter(0)
  const minus = view.getByRole('button', { name: '1회 빼기' }) as HTMLButtonElement

  expect(minus.disabled).toBe(true)
  fireEvent.click(minus)
  expect(changes).toEqual([])
})

test('Tapping the count opens direct entry and Enter commits the typed value', () => {
  const { view, changes } = renderCounter(3)

  expect(view.container.querySelector('#squat-done-reps')).toBeNull()
  fireEvent.click(view.getByRole('button', { name: /완료 횟수 3/ }))

  const input = view.container.querySelector('#squat-done-reps') as HTMLInputElement | null
  if (!input) throw new Error('direct entry input not found')
  expect(input.value).toBe('3')

  fireEvent.input(input, { target: { value: '14' } })
  fireEvent.submit(input.form as HTMLFormElement)

  expect(changes).toEqual(['14'])
  expect(view.container.querySelector('#squat-done-reps')).toBeNull()
})

test('Direct entry commits on blur', () => {
  const { view, changes } = renderCounter(3)

  fireEvent.click(view.getByRole('button', { name: /완료 횟수 3/ }))
  const input = view.container.querySelector('#squat-done-reps') as HTMLInputElement
  fireEvent.input(input, { target: { value: '9' } })
  fireEvent.blur(input)

  expect(changes).toEqual(['9'])
})

test('Escape closes direct entry without committing', () => {
  const { view, changes } = renderCounter(3)

  fireEvent.click(view.getByRole('button', { name: /완료 횟수 3/ }))
  const input = view.container.querySelector('#squat-done-reps') as HTMLInputElement
  fireEvent.input(input, { target: { value: '99' } })
  fireEvent.keyDown(input, { key: 'Escape' })

  expect(changes).toEqual([])
  expect(view.container.querySelector('#squat-done-reps')).toBeNull()
})

test('A blur fired after Escape or submit does not commit again', () => {
  const { view, changes } = renderCounter(3)

  fireEvent.click(view.getByRole('button', { name: /완료 횟수 3/ }))
  let input = view.container.querySelector('#squat-done-reps') as HTMLInputElement
  fireEvent.input(input, { target: { value: '99' } })
  fireEvent.keyDown(input, { key: 'Escape' })
  fireEvent.blur(input)

  fireEvent.click(view.getByRole('button', { name: /완료 횟수 3/ }))
  input = view.container.querySelector('#squat-done-reps') as HTMLInputElement
  fireEvent.input(input, { target: { value: '5' } })
  fireEvent.submit(input.form as HTMLFormElement)
  fireEvent.blur(input)

  expect(changes).toEqual(['5'])
})

test('Empty or non-numeric direct entry is discarded', () => {
  const { view, changes } = renderCounter(3)

  fireEvent.click(view.getByRole('button', { name: /완료 횟수 3/ }))
  const input = view.container.querySelector('#squat-done-reps') as HTMLInputElement
  fireEvent.input(input, { target: { value: '' } })
  fireEvent.submit(input.form as HTMLFormElement)

  expect(changes).toEqual([])
})
