import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import listenForMidi from "./listen-for-midi"
import { Note, noteFromMidi, noteToMidi } from "noteynotes"

const DEFAULT_IDLE_MS = 4000
const DEFAULT_FINALIZE_THRESHOLD_MS = 500

const EMPTY_SET = new Set<Note>()

const sortPred = (a: Note, b: Note) => noteToMidi(a) - noteToMidi(b)

export type KeyboardInputProps = {
  minNotes: number

  onNote?: (note: Note) => void
  onFinalize?: (notes: Note[]) => void
  onIdle?: () => void
  
  idleMs?: number
  finalizeThresholdMs?: number
}

type KeyboardInputState = {
  /**
   * The note set is only ever added to, or reset back to empty.
   */
  noteSet: Set<Note>
  isSustain: boolean
  idleTimeout: number | null
  finalizeTimeout: number | null

}

/**
 * Purely additive keyboard input component. When there are enough notes,
 * returns the note set via "onFinalize" callback.
 */
const KeyboardInput = (_props: KeyboardInputProps) => {
  const props = useRef<KeyboardInputProps>({
    idleMs: DEFAULT_IDLE_MS,
    finalizeThresholdMs: DEFAULT_FINALIZE_THRESHOLD_MS,
    ..._props,
  })
  props.current = { ...props.current, ..._props }
  const state = useRef<KeyboardInputState>({
    noteSet: EMPTY_SET,
    isSustain: false,
    idleTimeout: null,
    finalizeTimeout: null,
  })

  const debounceIdle = () => {
    if (state.current.idleTimeout) {
      window.clearTimeout(state.current.idleTimeout)
    }
    state.current.idleTimeout = window.setTimeout(() => {
      // no input for some time; send a callback
      props.current.onIdle?.()
    }, props.current.idleMs)
  }

  /**
   * Communicates the completed chord / set of notes back to the listener.
   * Finalization only occurs when the minimum note amount has been achieved.
   * We won't finalize when the sustain pedal is held.
   */
  const finalize = () => {
    if (state.current.isSustain) return
    if (state.current.noteSet.size < props.current.minNotes) return
  
    props.current.onFinalize?.(Array.from(state.current.noteSet).sort(sortPred))
    state.current.noteSet = EMPTY_SET

    if (state.current.finalizeTimeout) {
      window.clearTimeout(state.current.finalizeTimeout)
      state.current.finalizeTimeout = null
    }
  }

  /**
   * Schedules finalization to happen in the near future.
   */
  const debounceFinalize = () => {
    if (state.current.finalizeTimeout) {
      window.clearTimeout(state.current.finalizeTimeout)
      state.current.finalizeTimeout = null
    }
    state.current.finalizeTimeout = window.setTimeout(finalize, props.current.finalizeThresholdMs)
  }

  /**
   * When we reach the minimum number of notes, begins finalization after delay.
   */
  const tryFinalize = () => {
    if (state.current.noteSet.size >= props.current.minNotes) {
      debounceFinalize()
    }
  }

  /**
   * General entry point for MIDI events from the keyboard.
   */
  const midiCallback = (msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data!
    if (command === 144) {
      // regular keyboard note, either on/off
      const note = noteFromMidi(midiNote)
      if (velocity > 0) {
        state.current.noteSet = new Set(state.current.noteSet).add(note)
        props.current.onNote?.(note)
        tryFinalize()
      }
    } else if (command === 176 && midiNote === 64) {
      // sustain pedal
      // we won't finalize as long as the sustain is being held
      state.current.isSustain = velocity > 0
      tryFinalize()
    }
    debounceIdle()
  }
  useEffect(() => listenForMidi(midiCallback), [])

  return (<></>)
}

export default KeyboardInput
