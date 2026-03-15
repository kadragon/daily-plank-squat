import type { AppSettings, ExerciseId } from '../storage/settings'

interface ExerciseTarget {
  id: ExerciseId
  label: string
  currentTarget: number
  unit: string
}

interface SettingsProps {
  settings: AppSettings
  exerciseTargets: ExerciseTarget[]
  onToggleExercise: (id: ExerciseId, enabled: boolean) => void
  onChangeTarget: (id: ExerciseId, value: number) => void
  onChangeCountdownSec?: (value: number) => void
}

export default function Settings({
  settings,
  exerciseTargets,
  onToggleExercise,
  onChangeTarget,
  onChangeCountdownSec,
}: SettingsProps) {
  return (
    <div className="settings">
      <h2>Settings</h2>
      <section className="settings__exercises">
        <h3>Exercises</h3>
        {exerciseTargets.map((exercise) => {
          const enabled = settings.exercises[exercise.id].enabled
          return (
            <div className="settings__exercise-row" key={exercise.id}>
              <label className="settings__toggle-label">
                <input
                  type="checkbox"
                  aria-label={`${exercise.label} 활성화`}
                  checked={enabled}
                  onChange={(e) => onToggleExercise(exercise.id, e.currentTarget.checked)}
                />
                <span className="settings__toggle-track" />
                {exercise.label}
              </label>
              <div className="settings__target-row">
                <label className="settings__target-label" htmlFor={`settings-target-${exercise.id}`}>
                  Target
                </label>
                <input
                  id={`settings-target-${exercise.id}`}
                  className="settings__target-input"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={exercise.currentTarget}
                  disabled={!enabled}
                  onInput={(e) => {
                    const val = Number((e.currentTarget as HTMLInputElement).value)
                    if (val >= 1) onChangeTarget(exercise.id, val)
                  }}
                />
                <span className="settings__target-unit">{exercise.unit}</span>
              </div>
            </div>
          )
        })}
      </section>
      <section className="settings__timer">
        <h3>Timer</h3>
        <div className="settings__target-row">
          <label className="settings__target-label" htmlFor="settings-countdown-sec">
            Countdown
          </label>
          <input
            id="settings-countdown-sec"
            className="settings__target-input"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={settings.countdownSec}
            onInput={(e) => {
              const raw = (e.currentTarget as HTMLInputElement).value
              if (raw === '') return
              const val = Number(raw)
              if (Number.isFinite(val) && val >= 0 && val <= 10) onChangeCountdownSec?.(val)
            }}
          />
          <span className="settings__target-unit">s</span>
        </div>
      </section>
    </div>
  )
}
