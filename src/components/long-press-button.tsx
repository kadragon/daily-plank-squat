import { useEffect, useId, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'

interface LongPressButtonProps {
  label: string
  description: string
  holdMs?: number
  className?: string
  onLongPress?: () => void
}

function isActivationKey(key: string): boolean {
  return key === ' ' || key === 'Enter'
}

// Fires only after a deliberate hold (pointer or Space/Enter); a click or short tap does nothing.
export default function LongPressButton({
  label,
  description,
  holdMs = 600,
  className = '',
  onLongPress,
}: LongPressButtonProps) {
  const descriptionId = useId()
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onLongPressRef = useRef(onLongPress)
  const [pressing, setPressing] = useState(false)

  useEffect(() => {
    onLongPressRef.current = onLongPress
  }, [onLongPress])

  useEffect(() => () => {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
  }, [])

  function startHold() {
    if (holdTimerRef.current) return
    setPressing(true)
    holdTimerRef.current = setTimeout(() => {
      holdTimerRef.current = null
      setPressing(false)
      onLongPressRef.current?.()
    }, holdMs)
  }

  function cancelHold() {
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current)
    holdTimerRef.current = null
    setPressing(false)
  }

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    // Touch pointers are implicitly captured; release so sliding off fires pointerleave and aborts.
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    startHold()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isActivationKey(event.key)) return
    // Suppress the native click/scroll; the hold timer is the only activation path.
    event.preventDefault()
    if (event.repeat) return
    startHold()
  }

  function handleKeyUp(event: KeyboardEvent<HTMLButtonElement>) {
    if (!isActivationKey(event.key)) return
    event.preventDefault()
    cancelHold()
  }

  const style = { '--long-press-ms': `${holdMs}ms` } as CSSProperties

  return (
    <>
      <button
        type="button"
        className={`btn btn--danger long-press-btn${pressing ? ' long-press-btn--pressing' : ''}${className ? ` ${className}` : ''}`}
        style={style}
        aria-describedby={descriptionId}
        data-swipe-ignore="true"
        onPointerDown={handlePointerDown}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onPointerCancel={cancelHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
      >
        <span className="long-press-btn__fill" aria-hidden="true" />
        <span className="long-press-btn__label">{label}</span>
      </button>
      <span id={descriptionId} className="visually-hidden">{description}</span>
    </>
  )
}
