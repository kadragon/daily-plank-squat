import { expect, test } from 'bun:test'
import { renderToStaticMarkup } from 'react-dom/server'
import Settings from './settings'
import type { AppSettings } from '../storage/settings'

function defaultSettings(): AppSettings {
  return {
    exercises: {
      plank: { enabled: true },
      squat: { enabled: true },
      pushup: { enabled: true },
      deadhang: { enabled: true },
      dumbbell: { enabled: true },
    },
  }
}

test('Settings renders exercise toggles for all exercises', () => {
  const html = renderToStaticMarkup(
    <Settings
      settings={defaultSettings()}
      exerciseTargets={[
        { id: 'plank', label: 'Plank', currentTarget: 60, unit: 's' },
        { id: 'squat', label: 'Squat', currentTarget: 20, unit: 'reps' },
        { id: 'pushup', label: 'Pushup', currentTarget: 15, unit: 'reps' },
        { id: 'deadhang', label: 'Deadhang', currentTarget: 30, unit: 's' },
        { id: 'dumbbell', label: 'Dumbbell', currentTarget: 10, unit: 'reps' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
    />,
  )

  expect(html).toContain('Settings')
  expect(html).toContain('Plank')
  expect(html).toContain('Squat')
  expect(html).toContain('Pushup')
  expect(html).toContain('Deadhang')
  expect(html).toContain('Dumbbell')
})

test('Settings renders target inputs with current values', () => {
  const html = renderToStaticMarkup(
    <Settings
      settings={defaultSettings()}
      exerciseTargets={[
        { id: 'plank', label: 'Plank', currentTarget: 60, unit: 's' },
        { id: 'squat', label: 'Squat', currentTarget: 20, unit: 'reps' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
    />,
  )

  expect(html).toContain('id="settings-target-plank"')
  expect(html).toContain('id="settings-target-squat"')
  expect(html).toContain('value="60"')
  expect(html).toContain('value="20"')
})

test('Settings target input renders type="text" with inputMode="numeric"', () => {
  const html = renderToStaticMarkup(
    <Settings
      settings={defaultSettings()}
      exerciseTargets={[
        { id: 'plank', label: 'Plank', currentTarget: 60, unit: 's' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
    />,
  )

  expect(html).toContain('type="text"')
  expect(html).toContain('inputMode="numeric"')
  expect(html).toContain('pattern="[0-9]*"')
  expect(html).not.toContain('type="number"')
})

test('Settings renders countdown seconds setting', () => {
  const html = renderToStaticMarkup(
    <Settings
      settings={{ ...defaultSettings(), countdownSec: 5 }}
      exerciseTargets={[
        { id: 'plank', label: 'Plank', currentTarget: 60, unit: 's' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
      onChangeCountdownSec={() => {}}
    />,
  )

  expect(html).toContain('id="settings-countdown-sec"')
  expect(html).toContain('value="5"')
})

test('Settings disables target input for disabled exercises', () => {
  const settings = defaultSettings()
  settings.exercises.squat.enabled = false

  const html = renderToStaticMarkup(
    <Settings
      settings={settings}
      exerciseTargets={[
        { id: 'squat', label: 'Squat', currentTarget: 20, unit: 'reps' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
    />,
  )

  expect(html).toContain('disabled')
})
