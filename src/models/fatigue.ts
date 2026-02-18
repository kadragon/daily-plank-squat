import type { ExerciseRecord, SquatRecord, FatigueParams } from '../types'

export function computeNextTarget(
  _baseTarget: number,
  _history: ExerciseRecord[],
  _params: FatigueParams,
): number {
  return _baseTarget
}

export function computeSquatTarget(
  _baseTarget: number,
  _history: SquatRecord[],
  _params: FatigueParams,
): number {
  return _baseTarget
}
