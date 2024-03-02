import { Note, noteToMidi } from 'noteynotes'
import { create } from 'zustand'
import { List } from 'immutable'

/*
  each datum is (note, start ms, end ms)
  desired output is an array of note probabilities, one octave
  want more-recent notes and longer-held notes to have more 
*/

type MidiNote = number

const bucketIndex = (midiNote: MidiNote) => midiNote % 12

type HistogramDatum = {
  midiNote: MidiNote
  startMs: number
  endMs: number | undefined
}

/**
 * 12-bucket histogram, one for each note in the octave.
 * Starts at C.
 */
type HistogramBuckets = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

/**
 * Avoids asymptotic behaviour around dt = 0.
 */
const MIN_TIME_DELTA_MS = 0.5 * 1000

const TIME_SCALE = 0.0003
const TIME_EXPONENT = 0.5

/**
 * Increase to make longer notes have more weight; decrease to
 * reduce influence of length on histogram output.
 */
const LENGTH_EXPONENT = 0.9

/**
 * For notes that are older than this, switch to a second histogram mechanism
 * where time is no longer considered. We "freeze" values into a long-context
 * histogram then add it to the dynamic valus provided by the short context.
 * 
 * This approach prevents the algorithm from becoming slower and slower over time.
 */
const LONG_CONTEXT_MS = 30 * 1000

/**
 * When considering the total magnitude of values in our long context buckets,
 * we'll normalize values down if the maximum ends up being greater than this value.
 * This allows us to ensure that newer notes always take priority, but we can
 * still pull "flavour" from history if our short context is inconclusive.
 */
const LONG_CONTEXT_MAX_MAGNITUDE = 2.2

/**
 * What contribution should this datum have to its corresponding bucket?
 */
const weight = (d: HistogramDatum, currentTimestampMs: number): number => {
  const dt = Math.max(currentTimestampMs - d.startMs, MIN_TIME_DELTA_MS)
  const length = d.endMs ? (d.endMs - d.startMs) : dt
  return Math.pow(length, LENGTH_EXPONENT) / Math.pow(TIME_SCALE * dt, TIME_EXPONENT)
}

type NoteHistogramState = {
  openNotes: Record<MidiNote, HistogramDatum>
  shortContext: List<HistogramDatum>
  longContext: HistogramBuckets
  
  /**
   * The current state of the histogram.
   * Recompute this by calling calculate with the current timestamp.
   */
  computed: HistogramBuckets

  /**
   * What is the total magnitude of the computed histogram?
   */
  magnitude: number
}

const INITIAL_STATE: NoteHistogramState = {
  openNotes: {},
  shortContext: List(),
  longContext: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  computed: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  magnitude: 0,
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
          const computed: HistogramBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

          // move items from short context to long context
          // we'll only consider notes that are closed
          let longContextTotal = 0
          const longContext: HistogramBuckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
          for (let i = 0; i < 12; ++i) {
            longContext[i] = state.longContext[i]
            longContextTotal += longContext[i]
          }
          const [shortContext, moveToLongContext] = state.shortContext
            .partition(d => d.endMs !== undefined && d.endMs + LONG_CONTEXT_MS > currentTimestampMs)
          moveToLongContext.forEach((d) => {
            const w = weight(d, currentTimestampMs)
            longContext[bucketIndex(d.midiNote)] += w
            longContextTotal += w
          })

          // our histogram is simply the pairwise addition of our contexts.
          // first bring in our short context
          shortContext.forEach((d) => {
            const w = weight(d, currentTimestampMs)
            computed[bucketIndex(d.midiNote)] += w
          })

          // now the long context
          const longContextScale = longContextTotal > LONG_CONTEXT_MAX_MAGNITUDE
            ? LONG_CONTEXT_MAX_MAGNITUDE / longContextTotal
            : 1.0
          let magnitude = 0
          for (let i = 0; i < 12; ++i) {
            computed[i] += longContext[i] * longContextScale
            magnitude += computed[i]
          }

          return {
            shortContext,
            longContext,
            computed,
            magnitude,
          }
        })
    }
  },
)

