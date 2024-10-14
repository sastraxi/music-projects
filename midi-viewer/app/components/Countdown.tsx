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
      const maxPulseDuration = 2000; // 2 seconds
      const minPulseDuration = 500; // 0.5 seconds
      const pulseDuration = Math.max(
        minPulseDuration,
        maxPulseDuration * (durationMs / 60000) // Assuming 60 seconds is the max duration
      );

      return {
        "--countdown-playback-duration": `${durationMs}ms`,
        "--countdown-playback-delay": `${delayMs}ms`,
        "--countdown-pulse-duration": `${pulseDuration}ms`,
      } as React.CSSProperties
    },
    [durationMs, delayMs])

  return (
    <div className="countdown-container" style={style}>
      <div className="countdown-glow"></div>
      <div className="countdown-bar"></div>
      <div className="countdown-pulse"></div>
    </div>
  )
}

export default Countdown
