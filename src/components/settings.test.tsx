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
        { id: 'plank', label: '플랭크', currentTarget: 60, unit: '초' },
        { id: 'squat', label: '스쿼트', currentTarget: 20, unit: '회' },
        { id: 'pushup', label: '푸시업', currentTarget: 15, unit: '회' },
        { id: 'deadhang', label: '데드행', currentTarget: 30, unit: '초' },
        { id: 'dumbbell', label: '덤벨 컬', currentTarget: 10, unit: '회' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
    />,
  )

  expect(html).toContain('설정')
  expect(html).toContain('플랭크')
  expect(html).toContain('스쿼트')
  expect(html).toContain('푸시업')
  expect(html).toContain('데드행')
  expect(html).toContain('덤벨 컬')
})

test('Settings renders target inputs with current values', () => {
  const html = renderToStaticMarkup(
    <Settings
      settings={defaultSettings()}
      exerciseTargets={[
        { id: 'plank', label: '플랭크', currentTarget: 60, unit: '초' },
        { id: 'squat', label: '스쿼트', currentTarget: 20, unit: '회' },
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
        { id: 'plank', label: '플랭크', currentTarget: 60, unit: '초' },
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
        { id: 'plank', label: '플랭크', currentTarget: 60, unit: '초' },
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
        { id: 'squat', label: '스쿼트', currentTarget: 20, unit: '회' },
      ]}
      onToggleExercise={() => {}}
      onChangeTarget={() => {}}
    />,
  )

  expect(html).toContain('disabled')
})
