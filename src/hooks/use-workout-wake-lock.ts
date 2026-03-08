import { useEffect, useRef, useState } from 'react'
import { getWakeLock, syncWakeLock, type WakeLockSentinelLike } from './use-wake-lock'
import type { PlankState } from '../types'

export function useWorkoutWakeLock(plankState: PlankState, deadhangState: PlankState, initialNotice = ''): string {
  const wakeLockSentinelRef = useRef<WakeLockSentinelLike | null>(null)
  const [wakeLockNotice, setWakeLockNotice] = useState(initialNotice)

  useEffect(() => {
    let isDisposed = false
    const wakeLock = getWakeLock()
    const hasRunningTimer = plankState === 'RUNNING' || deadhangState === 'RUNNING'
    const wakeLockState: PlankState = hasRunningTimer ? 'RUNNING' : 'COMPLETED'

    async function sync() {
      try {
        const next = await syncWakeLock(wakeLockState, wakeLockSentinelRef.current, wakeLock)
        if (!isDisposed) {
          wakeLockSentinelRef.current = next
          if (hasRunningTimer && !wakeLock) {
            setWakeLockNotice('Wake Lock is not supported on this device. Keep the screen on manually.')
          } else {
            setWakeLockNotice('')
          }
        }
      } catch {
        if (!isDisposed && hasRunningTimer) {
          setWakeLockNotice('Wake Lock could not be acquired. Keep the screen on manually.')
        }
      }
    }

    void sync()
    return () => {
      isDisposed = true
    }
  }, [plankState, deadhangState])

  return wakeLockNotice
}
