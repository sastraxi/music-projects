import { useEffect, useState } from "react"
import Countdown from "./Countdown"

const DEFAULT_COUNTDOWN_MS = 2000

export type CountdownProps = {
  totalMs?: number
  onCountdownReached: () => void
  isPaused?: boolean
  pausedMessage?: string,
  children?: React.ReactNode
}

/**
 * Container that visualizes a countdown timer below its children.
 * Counting down begins immediately once "active" is set to true.
 * The countdown is reset (and held indefiintely) as long as the sustain pedal is pressed.
 */
const CountdownContainer = ({
  totalMs = DEFAULT_COUNTDOWN_MS,
  isPaused = false,
  pausedMessage = "Release pedal to continue.",
  onCountdownReached,
  children,
}: CountdownProps) => {
  // XXX: assumes pedal is not down when mounted!
  const [initialTimeMs, setInitialTimeMs] = useState<number>(performance.now())
  const [goalTimeout, setGoalTimeout] = useState<number | null>()

  // reset timer whenever we change our props or hit the sustain pedal
  useEffect(() => setInitialTimeMs(performance.now()), [totalMs, onCountdownReached, isPaused])

  // whenever the timer resets, schedule callback on countdown completion
  useEffect(() => {
    if (goalTimeout) window.clearTimeout(goalTimeout)
    if (!isPaused) {
      setGoalTimeout(window.setTimeout(onCountdownReached, totalMs))
    }
  }, [initialTimeMs])

  // always clean up timers
  useEffect(() => () => {
    if (goalTimeout) window.clearTimeout(goalTimeout)
  }, [])

  return (
    <div>
      <div className="mb-4">
        { children }
      </div>
      <div>
        {!isPaused && <Countdown durationMs={totalMs} />}
        {isPaused && <p className="text-xs">{pausedMessage}</p> }
      </div>
    </div>
  )
}

export default CountdownContainer
