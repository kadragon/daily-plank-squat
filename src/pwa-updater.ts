export interface RegisterSWOptionsLike {
  immediate?: boolean
  onNeedRefresh?: () => void
  onOfflineReady?: () => void
  onRegisteredSW?: (swScriptUrl: string, registration: ServiceWorkerRegistration | undefined) => void
}

export type RegisterSWLike = (
  options?: RegisterSWOptionsLike,
) => (reloadPage?: boolean) => Promise<void>

export interface PwaUpdaterOptions {
  updateIntervalMs?: number
  refreshMessage?: string
  confirmRefresh?: (message: string) => boolean
  scheduleInterval?: typeof setInterval
  clearScheduledInterval?: typeof clearInterval
  visibilityDocument?: Pick<
    Document,
    'visibilityState' | 'addEventListener' | 'removeEventListener'
  > | null
}

const DEFAULT_REFRESH_MESSAGE = '새 버전이 준비되었습니다. 지금 새로고침할까요?'
const DEFAULT_UPDATE_INTERVAL_MS = 10 * 60_000

export function createPwaUpdater(
  register: RegisterSWLike,
  options: PwaUpdaterOptions = {},
): () => void {
  const confirmRefresh = options.confirmRefresh ?? (() => true)
  const refreshMessage = options.refreshMessage ?? DEFAULT_REFRESH_MESSAGE
  const updateIntervalMs = options.updateIntervalMs ?? DEFAULT_UPDATE_INTERVAL_MS
  const scheduleInterval = options.scheduleInterval ?? globalThis.setInterval
  const clearScheduledInterval =
    options.clearScheduledInterval ?? globalThis.clearInterval
  const visibilityDocument =
    options.visibilityDocument ??
    (typeof document !== 'undefined' ? document : null)

  let intervalId: ReturnType<typeof setInterval> | null = null
  let registrationRef: ServiceWorkerRegistration | undefined

  const updateSW = register({
    immediate: true,
    onRegisteredSW: (_swScriptUrl, registration) => {
      registrationRef = registration
      registrationRef?.update()
      intervalId = scheduleInterval(() => {
        registrationRef?.update()
      }, updateIntervalMs)
    },
    onNeedRefresh: () => {
      if (confirmRefresh(refreshMessage)) {
        void updateSW(true)
      }
    },
  })

  const handleVisibilityChange = () => {
    if (visibilityDocument?.visibilityState === 'visible') {
      registrationRef?.update()
    }
  }
  visibilityDocument?.addEventListener('visibilitychange', handleVisibilityChange)

  return () => {
    if (intervalId !== null) {
      clearScheduledInterval(intervalId)
      intervalId = null
    }
    visibilityDocument?.removeEventListener(
      'visibilitychange',
      handleVisibilityChange,
    )
  }
}
