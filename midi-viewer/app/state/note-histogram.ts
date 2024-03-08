import { Note, NoteHistogramBuckets, noteToMidi } from 'noteynotes'
import { create } from 'zustand'
import { List } from 'immutable'

/*
  each datum is (note, start ms, end ms)
  desired output is an array of note probabilities, one octave
  want more-recent notes and longer-held notes to have more "juhj"
*/

type MidiNote = number

const bucketIndex = (midiNote: MidiNote) => midiNote % 12

type HistogramDatum = {
  midiNote: MidiNote
  startMs: number
  endMs: number | undefined
}

/**
 * Avoids asymptotic behaviour around dt = 0.
 */
const MIN_TIME_DELTA_MS = 0.5 * 1000

const TIME_SCALE = 0.0003

const TIME_EXPONENT = 0.3

/**
 * Increase to make longer notes have more weight; decrease to
 * reduce influence of length on histogram output.
 */
const LENGTH_EXPONENT = 0.6

/**
 * Consider notes shorter than this to be this length.
 */
const MIN_LENGTH_MS = 200

/**
 * For notes that are older than this, switch to a second histogram mechanism
 * where time is no longer considered. We "freeze" values into a long-context
 * histogram then add it to the dynamic values provided by the short context.
 * 
 * This approach prevents the algorithm from becoming slower and slower over time.
 */
const LONG_CONTEXT_MS = 45 * 1000

/**
 * How should long context values decay towards zero over time?
 */
const LONG_CONTEXT_DECAY_PER_SECOND = 0.993

/**
 * Consider buckets to be zeroed out below this value.
 */
const EPSILON = 0.0006

/**
 * What contribution should this datum have to its corresponding bucket?
 */
const weight = (d: HistogramDatum, currentTimestampMs: number): number => {
  const dt = Math.max(currentTimestampMs - d.startMs, MIN_TIME_DELTA_MS)
  const length = Math.max(d.endMs ? (d.endMs - d.startMs) : dt, MIN_LENGTH_MS)
  return Math.pow(length, LENGTH_EXPONENT) / Math.pow(TIME_SCALE * dt, TIME_EXPONENT)
}

type NoteHistogramState = {
  openNotes: Record<MidiNote, HistogramDatum>
  shortContext: List<HistogramDatum>
  longContext: NoteHistogramBuckets
  
  /**
   * The current state of the histogram.
   * Recompute this by calling calculate with the current timestamp.
   */
  computed: NoteHistogramBuckets

  /**
   * What is the total magnitude of the computed histogram?
   */
  magnitude: number

  /**
   * What is the highest value attained by the computed histogram?
   */
  maximum: number

  /**
   * When did we last compute the histogram?
   */
  lastComputeTimestampMs: number | undefined
}

const INITIAL_STATE: NoteHistogramState = {
  openNotes: {},
  shortContext: List(),
  longContext: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  computed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  magnitude: 0,
  maximum: 0,
  lastComputeTimestampMs: undefined,
}

//////////////////////////////////////////////////////////

type NoteHistogramStateAndMutators = NoteHistogramState & {
  reset: () => void

  noteOn: (note: Note, timestampMs: number) => void
  noteOff: (note: Note, timestampMs: number) => void

  /**
   * Adds a note and closes it. Equivalent to noteOn(note, timestampMs) followed by
   * noteOff(note, timestampMs, timestampMs + lengthMs).
   * @param note 
   * @param timestampMs 
   * @param lengthMs 
   * @returns 
   */
  noteInstant: (note: Note, timestampMs: number, lengthMs: number) => void

  /**
   * Updates the computed histogram values.
   */
  calculate: (timestampMs: number) => void
}

export const useNoteHistogram = create<NoteHistogramStateAndMutators>()(
  (set) => {
    const addDatum = (datum: HistogramDatum) => set((prev) => {
      const isOpen = (datum.endMs === undefined)
      let openNotes = prev.openNotes
      if (isOpen) {
        if (datum.midiNote in prev.openNotes) {
          throw new Error(`Cannot add MIDI note ${datum.midiNote}; already open`)
        }
        openNotes = { ...prev.openNotes, [datum.midiNote]: datum }
      }
      return {
        openNotes,
        shortContext: prev.shortContext.push(datum)
      }
    })

    const noteOff = (note: Note, timestampMs: number) => set((prev) => {
      const midiNote = noteToMidi(note)
      const foundIndex = prev.shortContext.findLastIndex(datum => datum.midiNote === midiNote)      
      if (!(midiNote in prev.openNotes) || foundIndex === -1) {
        throw new Error(`Cannot close MIDI note ${midiNote}; not open`)
      }

      const openNotes = { ...prev.openNotes }
      delete openNotes[midiNote]

      const datum = prev.shortContext.get(foundIndex)!
      const shortContext = prev.shortContext.set(foundIndex, {
        ...datum,
        endMs: timestampMs,
      })
    
      return {
        openNotes,
        shortContext,
      }
    })
    
    return {
      ...INITIAL_STATE,
      
      reset: () => set(() => INITIAL_STATE),

      noteOn: (note: Note, timestampMs: number) =>
        addDatum({
          midiNote: noteToMidi(note),
          startMs: timestampMs,
          endMs: undefined,
        }),

      noteOff,
    
      noteInstant: (note: Note, timestampMs: number, lengthMs: number) => 
        addDatum({
          midiNote: noteToMidi(note),
          startMs: timestampMs,
          endMs: timestampMs + lengthMs,
        }),

      calculate: (currentTimestampMs: number) =>
        set((state) => {
          // our histogram is simply the pairwise addition of "short" + "long" contexts.
          const computed: NoteHistogramBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

          // long context: decay
          const longContext: NoteHistogramBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]          
          const decay = (state.lastComputeTimestampMs !== undefined
            ? Math.pow(LONG_CONTEXT_DECAY_PER_SECOND, (currentTimestampMs - state.lastComputeTimestampMs) / 1000)
            : 1.0)

          for (let i = 0; i < 12; ++i) {
            longContext[i] = state.longContext[i] * decay
            if (longContext[i] < EPSILON) longContext[i] = 0
            computed[i] += longContext[i]
          }

          // items might move from short context to long context in this "tick"
          // only consider notes that have end timestamps
          const [moveToLongContext, shortContext] = state.shortContext
            .partition(d => d.endMs === undefined || d.endMs + LONG_CONTEXT_MS > currentTimestampMs)

          // contributions from notes moving to long-term context
          moveToLongContext.forEach((d) => {
            const w = weight(d, currentTimestampMs)
            longContext[bucketIndex(d.midiNote)] += w
            computed[bucketIndex(d.midiNote)] += w
          })

          // contributions from notes staying in short-term context
          shortContext.forEach((d) => {
            const w = weight(d, currentTimestampMs)
            computed[bucketIndex(d.midiNote)] += w
          })

          // statistics
          let magnitude = 0
          let maximum = 0
          for (let i = 0; i < 12; ++i) {
            magnitude += computed[i]
            if (maximum < computed[i]) maximum = computed[i]
          }

          return {
            shortContext,
            longContext,
            computed,
            magnitude,
            maximum,
            lastComputeTimestampMs: currentTimestampMs,
          }
        })
    }
  },
)

