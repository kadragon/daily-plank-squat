export type GoalExercise = 'plank' | 'squat'

type PlayGoalSound = (goal: GoalExercise) => void

export interface GoalAlerts {
  onPlankProgress(actualSec: number, targetSec: number): void
  onSquatProgress(actualReps: number, targetReps: number): void
}

export function playGoalFeedback(): void {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([300, 100, 300])
  }

  if (typeof window !== 'undefined' && typeof window.AudioContext !== 'undefined') {
    const context = new window.AudioContext()
    const oscillator = context.createOscillator()
    const gain = context.createGain()

    oscillator.type = 'sine'
    oscillator.frequency.value = 880
    gain.gain.value = 0.05

    oscillator.connect(gain)
    gain.connect(context.destination)

    oscillator.start()
    oscillator.stop(context.currentTime + 0.12)

    oscillator.onended = () => {
      void context.close()
    }
  }
}

export function createGoalAlerts(playGoalSound: PlayGoalSound): GoalAlerts {
  let plankAlerted = false
  let squatAlerted = false

  return {
    onPlankProgress(actualSec, targetSec) {
      if (!plankAlerted && actualSec >= targetSec) {
        plankAlerted = true
        playGoalSound('plank')
      }
    },
    onSquatProgress(actualReps, targetReps) {
      if (!squatAlerted && actualReps >= targetReps) {
        squatAlerted = true
        playGoalSound('squat')
      }
    },
  }
}
