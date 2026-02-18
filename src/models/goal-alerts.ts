export type GoalExercise = 'plank' | 'squat'

type PlayGoalSound = (goal: GoalExercise) => void

export interface GoalAlerts {
  onPlankProgress(actualSec: number, targetSec: number): void
  onSquatProgress(actualCount: number, targetCount: number): void
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
    onSquatProgress(actualCount, targetCount) {
      if (!squatAlerted && actualCount >= targetCount) {
        squatAlerted = true
        playGoalSound('squat')
      }
    },
  }
}
