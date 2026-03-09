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
}

export default function Settings({
  settings,
  exerciseTargets,
  onToggleExercise,
  onChangeTarget,
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
                  type="number"
                  min={1}
                  step={1}
                  inputMode="numeric"
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
    </div>
  )
}
