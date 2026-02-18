import type { PlankState } from '../types'

export interface WakeLockSentinelLike {
  released: boolean
  release(): Promise<void>
}

export interface WakeLockLike {
  request(type: 'screen'): Promise<WakeLockSentinelLike>
}

export async function syncWakeLock(
  plankState: PlankState,
  sentinel: WakeLockSentinelLike | null,
  wakeLock?: WakeLockLike,
): Promise<WakeLockSentinelLike | null> {
  if (plankState === 'RUNNING' && sentinel === null && wakeLock) {
    return wakeLock.request('screen')
  }

  if ((plankState === 'COMPLETED' || plankState === 'CANCELLED') && sentinel) {
    await sentinel.release()
    return null
  }

  return sentinel
}

export function useWakeLock() {
  return {}
}
