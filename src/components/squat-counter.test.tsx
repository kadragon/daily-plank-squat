import { expect, test } from 'bun:test'
import { Children, isValidElement, type ReactElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import SquatCounter from './squat-counter'

test('Squat view shows count and +1/-1 buttons', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('Count: 3')
  expect(html).toContain('+1')
  expect(html).toContain('-1')
})

test('Squat view shows complete button', () => {
  const html = renderToStaticMarkup(<SquatCounter count={3} />)

  expect(html).toContain('Complete')
})

test('Squat action buttons are wired to callbacks', () => {
  const onIncrement = () => {}
  const onDecrement = () => {}
  const onComplete = () => {}

  const element = SquatCounter({
    count: 3,
    onIncrement,
    onDecrement,
    onComplete,
  })

  const buttons = Children.toArray(element.props.children)
    .filter((child): child is ReactElement => isValidElement(child) && child.type === 'button')

  expect(buttons[0]?.props.onClick).toBe(onIncrement)
  expect(buttons[1]?.props.onClick).toBe(onDecrement)
  expect(buttons[2]?.props.onClick).toBe(onComplete)
})
