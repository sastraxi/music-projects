import { useCallback, useEffect, useRef, useState } from "react"
import listenForMidi from "./listen-for-midi"

const DEFAULT_TAP_THRESHOLD_MS = 200

export type PedalDetectorProps = {
  tapThresholdMs?: number
  commitThresholdMs?: number
  onTap?: (numTaps: number) => void
  onHoldStateChanged?: (isHeld: boolean) => void
}

type PedalDetectorState = {
  pedalPressed: boolean,
  timeout: number | null
  numTaps: number
}

const PedalDetector = (_props: PedalDetectorProps) => {
  const props = useRef<PedalDetectorProps>({
    tapThresholdMs: DEFAULT_TAP_THRESHOLD_MS,
    commitThresholdMs: 1.5 * DEFAULT_TAP_THRESHOLD_MS,
  })
  props.current = { ...props.current, ..._props }
  const state = useRef<PedalDetectorState>({
    pedalPressed: false,
    timeout: null,
    numTaps: 0,
  })

  /**
   * Called when the sustain pedal has been held longer than tapThresholdMs.
   */
  const tapTimeoutReached = () => {
    if (state.current.numTaps > 0) {
      // N.B. if valid taps are followed quickly by a hold, we ignore the taps
      state.current.numTaps = 0
    }
    props.current.onHoldStateChanged?.(true)
  }

  /**
   * Called when the sustain pedal has been released longer than commitThresholdMs
   */
  const commitTimeoutReached = () => {
    if (state.current.numTaps > 0) {
      // we can have no more taps; notify listeners via callback
      props.current.onTap?.(state.current.numTaps)
      state.current.numTaps = 0
    }
  }

  const midiCallback = (msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data!
    if (command === 176 && midiNote === 64) {
      if (state.current.timeout) {
        window.clearTimeout(state.current.timeout)
      }

      const isNowPressed = velocity > 0
      if (!state.current.pedalPressed && isNowPressed) {
        // activation edge
        state.current.pedalPressed = true
        state.current.numTaps += 1
        state.current.timeout = window.setTimeout(tapTimeoutReached, props.current.tapThresholdMs)

      } else if (state.current.pedalPressed && !isNowPressed) {
        // deactivation edge
        state.current.pedalPressed = false
        if (state.current.numTaps > 0) {
          // user is still plausibly tapping; we count taps on activation edge
          // so for now we do nothing
        } else {
          // user has already passed the tap threshold; treat as end of hold
          props.current.onHoldStateChanged?.(false)
        }
        state.current.timeout = window.setTimeout(commitTimeoutReached, props.current.commitThresholdMs)
      }
    }
  }

  useEffect(() => listenForMidi(midiCallback), [])

  return (<></>)
}

export default PedalDetector
