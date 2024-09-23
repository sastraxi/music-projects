import { useMemo } from 'react'
import { Progress } from "@nextui-org/progress"

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
        "--countdown-playback-start": "0px",
        "--countdown-playback-end": "50px",
        "--countdown-playback-duration": `${durationMs}ms`,
        "--countdown-playback-display": "initial",
        "--countdown-playback-delay": `${delayMs}ms`,
      } as React.CSSProperties
    },
    [durationMs, delayMs])

  return (
    <div className="relative" style={style}>
      <Progress
      />
      <div
        className="play-cursor"
      />
    </div>
  )
}

export default Countdown
