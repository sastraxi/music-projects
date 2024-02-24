import { cumulative, relativeToFirst } from "../util"
import { FullChord, lookupChord } from "./chords"
import { Note, stripOctave } from "./common"
import { Note as TonalNote } from 'tonal'
import { TRIAD_LIBRARY, Triad } from "./triads"

type TriadDetectionResult = {
  triad: Triad
  name: string
  inversion: 0 | 1 | 2
  /**
   * What intervals (from the lowest note) does the triad not account for?
   */
  extraIntervals: number[]
}

/**
 * What triad is represented in these intervals?
 */
const detectTriad = (intervals: number[]): TriadDetectionResult | undefined => {
  let result: TriadDetectionResult | undefined
  for (const [name, triads] of Object.entries(TRIAD_LIBRARY)) {
    for (let inversion = 0; inversion < triads.length; ++inversion) {
      const triad = triads[inversion]
      const cumTriad = cumulative(triad)

      // only consider triads that are fully included in the given intervals
      if (!cumTriad.every(i => intervals.includes(i))) continue
      const extraIntervals = intervals.filter(i => i !== 0 && !cumTriad.includes(i))

      if (!result || result.extraIntervals.length > extraIntervals.length) {
        // we found a (better) match
        console.log(name)
        result = {
          triad,
          name,
          inversion: inversion as 0 | 1 | 2,
          extraIntervals
        }
      }
    }
  }
  return result
}

/**
 * Figure out what chord a smattering of notes best represents.
 * @param notes 
 */
export const detectChord = (notes: Note[]): FullChord | undefined => {
  const midiNotes = [...new Set(notes)].map(TonalNote.midi)
  if (midiNotes.find((note) => note === null || note === undefined)) {
    throw new Error("All inputs to detectChord must have octaves.")
  }

  const sortedNotes = (midiNotes as number[]).sort((a, b) => a - b)

  // detect a triad with and without the lowest note
  const intWithBass = relativeToFirst(sortedNotes)
  // const intWithoutBass = relativeToFirst(sortedNotes.slice(1))

  const detected = detectTriad(intWithBass)
  if (!detected) return undefined

  console.log('triad with bass', detected)
  // console.log('triad without bass', detectTriad(intWithoutBass))

  let rootIndex = 0
  if (detected.inversion === 1) rootIndex = 2
  if (detected.inversion === 2) rootIndex = 1

  const rootNote = stripOctave(TonalNote.fromMidi(sortedNotes[rootIndex]))
  return lookupChord(`${rootNote} ${detected.name}`)
}
