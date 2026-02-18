import { expect, test } from 'bun:test'
import { syncWakeLock } from './use-wake-lock'

test('Wake Lock requested on timer start', async () => {
  let requestedType: string | null = null
  const wakeLock = {
    async request(type: string) {
      requestedType = type
      return {
        released: false,
        async release() {
          this.released = true
        },
      }
    },
  }

  const sentinel = await syncWakeLock('RUNNING', null, wakeLock)

  expect(requestedType).toBe('screen')
  expect(sentinel).not.toBeNull()
})

test('Wake Lock released on complete/cancel', async () => {
  let releaseCalls = 0
  const createSentinel = () => ({
    released: false,
    async release() {
      releaseCalls++
      this.released = true
    },
  })

  const completedSentinel = createSentinel()
  const afterComplete = await syncWakeLock('COMPLETED', completedSentinel)
  expect(completedSentinel.released).toBe(true)
  expect(afterComplete).toBeNull()

  const cancelledSentinel = createSentinel()
  const afterCancel = await syncWakeLock('CANCELLED', cancelledSentinel)
  expect(cancelledSentinel.released).toBe(true)
  expect(afterCancel).toBeNull()
  expect(releaseCalls).toBe(2)
})
