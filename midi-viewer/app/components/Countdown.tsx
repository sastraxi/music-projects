import { useMemo } from 'react'
import './Countdown.css'

const Countdown = ({
  durationMs,
  delayMs = 0,
}: {
  durationMs: number,
  delayMs?: number,
}) => {
  const style = useMemo(
    () => {
      return {
        "--countdown-playback-duration": `${durationMs}ms`,
        "--countdown-playback-delay": `${delayMs}ms`,
      } as React.CSSProperties
    },
    [durationMs, delayMs])

  return (
    <div className="countdown-container" style={style}>
      <div className="countdown-bar">
        <div className="countdown-pulse" />
      </div>
    </div>
  )
}

export default Countdown
