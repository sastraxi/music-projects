import { useCallback, useEffect, useRef, useState } from "react"
import listenForMidi from "./listen-for-midi"

const DEFAULT_TAP_THRESHOLD_MS = 200

export type PedalDetectorProps = {
  tapThresholdMs?: number
  commitThresholdMs?: number
  onTap?: (numTaps: number) => void
  onHoldStateChanged?: (isHeld: boolean) => void
}

const PedalDetector = ({
  tapThresholdMs = DEFAULT_TAP_THRESHOLD_MS,
  commitThresholdMs = 2 * DEFAULT_TAP_THRESHOLD_MS,
  onTap,
  onHoldStateChanged,
}: PedalDetectorProps) => {
  const [pedalPressed, setPedalPressed] = useState(false)
  const [currentTimeout, setCurrentTimeout] = useState<number | null>(null)
  const numTaps = useRef(0)  // ref so we can get latest values in callbacks

  /**
   * Called when the sustain pedal has been held longer than tapThresholdMs.
   */
  const tapTimeoutReached = useCallback(() => {
    if (numTaps.current > 0) {
      // N.B. if valid taps are followed quickly by a hold, we ignore the taps
      numTaps.current = 0
    }
    onHoldStateChanged?.(true)
  }, [numTaps, onHoldStateChanged])

  /**
   * Called when the sustain pedal has been released longer than commitThresholdMs
   */
  const commitTimeoutReached = useCallback(() => {
    if (numTaps.current > 0) {
      // we can have no more taps; notify listeners via callback
      onTap?.(numTaps.current)
      numTaps.current = 0
    }
  }, [numTaps, onTap])

  const midiCallback = (msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data!
    if (command === 176 && midiNote === 64) {
      if (currentTimeout) {
        window.clearTimeout(currentTimeout)
      }

      const isNowPressed = velocity > 0
      if (!pedalPressed && isNowPressed) {
        // activation edge
        setPedalPressed(true)
        numTaps.current += 1
        setCurrentTimeout(window.setTimeout(tapTimeoutReached, tapThresholdMs))

      } else if (pedalPressed && !isNowPressed) {
        // deactivation edge
        setPedalPressed(false)
        if (numTaps.current > 0) {
          // user is still plausibly tapping; we count taps on activation edge
          // so for now we do nothing
        } else {
          // user has already passed the tap threshold; treat as end of hold
          onHoldStateChanged?.(false)
        }
        setCurrentTimeout(window.setTimeout(commitTimeoutReached, commitThresholdMs))
      }
    }
  }

  useEffect(() => listenForMidi(midiCallback), [midiCallback])

  return (<></>)
}

export default PedalDetector
