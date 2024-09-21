import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import listenForMidi from "./listen-for-midi"
import { Note, noteFromMidi, noteToMidi } from "noteynotes"

const DEFAULT_IDLE_MS = 4000
const DEFAULT_FINALIZE_THRESHOLD_MS = 500

const EMPTY_SET = new Set<Note>()

const sortPred = (a: Note, b: Note) => noteToMidi(a) - noteToMidi(b)

export type KeyboardInputProps = {
  minNotes?: number

  onNote?: (note: Note) => void
  onFinalize?: (notes: Note[]) => void
  onIdle?: () => void
  
  idleMs?: number
  finalizeThresholdMs?: number
}

/**
 * Purely additive keyboard input component. When there are enough notes,
 * returns the note set via "onFinalize" callback.
 */
const KeyboardInput = ({
  minNotes = 1,

  onNote,
  onFinalize,
  onIdle,
  
  idleMs = DEFAULT_IDLE_MS,
  finalizeThresholdMs = DEFAULT_FINALIZE_THRESHOLD_MS,
}: KeyboardInputProps) => {
  /**
   * The note set is only ever added to, or reset back to empty.
   */
  const [noteSet, setNoteSet] = useState<Set<Note>>(EMPTY_SET)
  const [isSustain, setSustain] = useState(false)
  
  /**
   * Adds to the note set.
   */
  const noteOn = useCallback((note: Note) =>
    setNoteSet(ns => new Set(ns).add(note)),
    [setNoteSet]
  )

  // N.B. useRef lets us honour onIdle changes between when we set the timeout + when it fires
  const [idleTimeout, setIdleTimeout] = useState<number | null>(null)
  const idleCallback = useRef(onIdle)
  idleCallback.current = onIdle

  const debounceIdle = useCallback(() => {
    if (idleTimeout) {
      window.clearTimeout(idleTimeout)
    }
    setIdleTimeout(window.setTimeout(() => {
      // no input for some time; send a callback
      idleCallback.current?.()
    }, idleMs))
  }, [idleTimeout, setIdleTimeout])

  /**
   * Reset the idle timeout whenever user input occurs.
   */
  useEffect(debounceIdle, [isSustain, noteSet])

  // N.B. useRef lets us honour onFinalize changes between when we set the timeout + when it fires
  const [finalizeTimeout, setFinalizeTimeout] = useState<number | null>(null)
  const finalizeCallback = useRef(onFinalize)
  finalizeCallback.current = onFinalize

  /**
   * Communicates the completed chord / set of notes back to the listener.
   * Finalization only occurs when the minimum note amount has been achieved.
   * We won't finalize when the sustain pedal is held.
   */
  const finalize = useCallback(() => {
    if (isSustain) return
    if (noteSet.size < minNotes) return
  
    finalizeCallback.current?.(Array.from(noteSet).sort(sortPred))
    setNoteSet(EMPTY_SET)
    
    if (finalizeTimeout) {
      window.clearTimeout(finalizeTimeout)
      setFinalizeTimeout(null)
    }
  }, [finalizeTimeout, setFinalizeTimeout, isSustain, noteSet, setNoteSet])

  /**
   * Schedules finalization to happen in the near future.
   */
  const debounceFinalize = useCallback(() => {
    if (finalizeTimeout) {
      window.clearTimeout(finalizeTimeout)
      setFinalizeTimeout(null)
    }
    setFinalizeTimeout(window.setTimeout(finalize, finalizeThresholdMs))
  }, [finalize, finalizeTimeout, setFinalizeTimeout])

  /**
   * When we reach the minimum number of notes, begins finalization after delay.
   */
  useEffect(() => {
    if (noteSet.size >= minNotes) {
      debounceFinalize()
    }
  }, [isSustain, noteSet, minNotes])
    
  /**
   * General entry point for MIDI events from the keyboard.
   */
  const midiCallback = (msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data!

    const isFinalizing = finalizeTimeout !== null

    if (command === 144) {
      // regular keyboard note, either on/off
      const note = noteFromMidi(midiNote)
      if (velocity > 0) {
        noteOn(note)
        onNote?.(note)
      }
    } else if (command === 176 && midiNote === 64) {
      // sustain pedal
      // we won't finalize as long as the sustain is being held
      setSustain(velocity > 0)
    }
  }
  useEffect(() => listenForMidi(midiCallback), [midiCallback])

  return (<></>)
}

export default KeyboardInput
