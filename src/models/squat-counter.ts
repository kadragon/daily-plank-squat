export type { RepsCounter as SquatCounter } from './reps-counter'
export {
  createRepsCounter as createSquatCounter,
  increment,
  decrement,
  complete,
  sanitizeDoneReps,
  sanitizeTargetReps,
  sanitizeRawInput,
} from './reps-counter'
