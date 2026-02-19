import { expect, test } from 'bun:test'
import { createPwaUpdater } from './pwa-updater'

test('registration update runs immediately and on interval', () => {
  const updateCalls: string[] = []
  const registration = {
    update: () => {
      updateCalls.push('update')
      return Promise.resolve()
    },
  } as unknown as ServiceWorkerRegistration

  let scheduledCallback: (() => void) | null = null
  let clearedId: number | null = null

  let onRegisteredSW: ((swUrl: string, reg: ServiceWorkerRegistration | undefined) => void) | undefined

  const cleanup = createPwaUpdater(
    (options) => {
      onRegisteredSW = options.onRegisteredSW
      return async () => {
        // no-op for this test
      }
    },
    {
      updateIntervalMs: 1234,
      scheduleInterval: (callback, _delay) => {
        scheduledCallback = callback
        return 99 as unknown as ReturnType<typeof setInterval>
      },
      clearScheduledInterval: (id) => {
        clearedId = Number(id)
      },
    },
  )

  onRegisteredSW?.('/sw.js', registration)

  expect(updateCalls).toEqual(['update'])

  scheduledCallback?.()
  expect(updateCalls).toEqual(['update', 'update'])

  cleanup()
  expect(clearedId).toBe(99)
})

test('registration update runs when app returns to foreground', () => {
  const updateCalls: string[] = []
  const registration = {
    update: () => {
      updateCalls.push('update')
      return Promise.resolve()
    },
  } as unknown as ServiceWorkerRegistration

  let onRegisteredSW: ((swUrl: string, reg: ServiceWorkerRegistration | undefined) => void) | undefined
  let visibilityHandler: (() => void) | null = null
  let removedVisibilityHandler: (() => void) | null = null

  const fakeDocument = {
    visibilityState: 'hidden',
    addEventListener: (
      type: string,
      callback: EventListenerOrEventListenerObject,
    ) => {
      if (type === 'visibilitychange') {
        visibilityHandler = callback as () => void
      }
    },
    removeEventListener: (
      type: string,
      callback: EventListenerOrEventListenerObject,
    ) => {
      if (type === 'visibilitychange') {
        removedVisibilityHandler = callback as () => void
      }
    },
  } as unknown as Pick<
    Document,
    'visibilityState' | 'addEventListener' | 'removeEventListener'
  >

  const cleanup = createPwaUpdater(
    (options) => {
      onRegisteredSW = options.onRegisteredSW
      return async () => {
        // no-op for this test
      }
    },
    {
      visibilityDocument: fakeDocument,
    },
  )

  onRegisteredSW?.('/sw.js', registration)
  expect(updateCalls).toEqual(['update'])

  fakeDocument.visibilityState = 'visible'
  visibilityHandler?.()
  expect(updateCalls).toEqual(['update', 'update'])

  cleanup()
  expect(removedVisibilityHandler).toBe(visibilityHandler)
})
