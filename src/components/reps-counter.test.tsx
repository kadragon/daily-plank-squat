import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import RepsCounter from './reps-counter'

test('RepsCounter renders "Pushup Counter" heading when title="Pushup Counter"', () => {
  const html = renderToStaticMarkup(<RepsCounter title="Pushup Counter" idPrefix="pushup" exerciseName="pushups" count={0} />)

  expect(html).toContain('Pushup Counter')
  expect(html).toContain('<h2')
})

test('RepsCounter uses pushup-prefixed ids when idPrefix="pushup"', () => {
  const html = renderToStaticMarkup(<RepsCounter title="Pushup Counter" idPrefix="pushup" exerciseName="pushups" count={0} />)

  expect(html).toContain('id="pushup-target-reps"')
  expect(html).toContain('id="pushup-done-reps"')
})

test('RepsCounter complete button aria-label reflects exerciseName', () => {
  const html = renderToStaticMarkup(<RepsCounter title="Pushup Counter" idPrefix="pushup" exerciseName="pushups" count={0} />)

  expect(html).toContain('aria-label="Complete pushups"')
})

test('RepsCounter renders reps-counter class', () => {
  const html = renderToStaticMarkup(<RepsCounter count={0} />)

  expect(html).toContain('reps-counter')
})

test('RepsCounter renders reps-counter--goal-reached when count meets target', () => {
  const html = renderToStaticMarkup(<RepsCounter count={15} targetReps={15} />)

  expect(html).toContain('reps-counter--goal-reached')
})

test('RepsCounter renders inline save feedback with polite live region when provided', () => {
  const html = renderToStaticMarkup(
    <RepsCounter
      count={12}
      targetReps={15}
      saveFeedbackText="Saved just now"
      saveFeedbackTone="success"
    />,
  )

  expect(html).toContain('Saved just now')
  expect(html).toContain('reps-save-feedback')
  expect(html).toContain('reps-save-feedback--success')
  expect(html).toContain('aria-live="polite"')
})
