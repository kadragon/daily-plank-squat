export type { RepsCounter as SquatCounter } from './reps-counter'
export {
  createRepsCounter as createSquatCounter,
  increment,
  decrement,
  complete,
  sanitizeDoneReps,
  sanitizeTargetReps,
} from './reps-counter'
