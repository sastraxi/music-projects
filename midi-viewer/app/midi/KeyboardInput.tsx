import { useCallback, useEffect, useRef } from "react"
import listenForMidi from "./listen-for-midi"
import { Note, noteFromMidi } from "noteynotes"

const DEFAULT_IDLE_MS = 7500

export type KeyboardInputProps = {
  onNoteDown?: (note: Note) => void
  onNoteUp?: (note: Note) => void
  onIdle?: () => void
  
  idleMs?: number
}

type KeyboardInputState = {
  idleTimeout?: number
}

/**
 * Purely additive keyboard input component. When there are enough notes,
 * returns the note set via "onFinalize" callback.
 */
const KeyboardInput = (_props: KeyboardInputProps) => {
  const props = useRef<KeyboardInputProps>({
    idleMs: DEFAULT_IDLE_MS,
    ..._props,
  })
  props.current = { ...props.current, ..._props }
  const state = useRef<KeyboardInputState>({})

  const scheduleIdle = () => {
    if (state.current.idleTimeout) {
      window.clearTimeout(state.current.idleTimeout)
    }
    state.current.idleTimeout = window.setTimeout(() => {
      // no input for some time; send a callback
      props.current.onIdle?.()
    }, props.current.idleMs)
  }

  /**
   * General entry point for MIDI events from the keyboard.
   */
  const midiCallback = useCallback((msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data!
    if (command === 144) {
      // regular keyboard note, either on/off
      const note = noteFromMidi(midiNote)
      if (velocity > 0) {
        props.current.onNoteDown?.(note)
      } else {
        props.current.onNoteUp?.(note)
      }
    }
  }, [])

  useEffect(() => listenForMidi(midiCallback), [])
  useEffect(scheduleIdle, [])
  useEffect(() => () => {
    if (state.current.idleTimeout) window.clearTimeout(state.current.idleTimeout)
  }, [])

  return (<></>)
}

export default KeyboardInput
