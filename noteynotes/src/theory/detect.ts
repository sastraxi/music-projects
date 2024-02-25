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
 * How good is this result?
 * Higher scores are better matches.
 */
const score = (result: TriadDetectionResult): number => {
  const powerChordPenalty = result.triad.includes(0) ? 1 : 0
  return -(
    result.extraIntervals.length * 10
    + result.inversion 
    + powerChordPenalty
  )
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

      const candidate: TriadDetectionResult = {
        triad,
        name,
        inversion: inversion as 0 | 1 | 2,
        extraIntervals

      }

      if (!result || score(result) < score(candidate)) {
        // we found a (better) match
        result = candidate
      }
    }
  }
  return result
}

/**
 * Figure out what chord a smattering of notes best represents.
 * @returns undefined if the notes don't form a coherent chord, otherwise our best guess
 */
export const detectChord = (notesWithOctaves: Note[]): FullChord | undefined => {
  const midiNotes = [...new Set(notesWithOctaves)].map(TonalNote.midi)
  if (midiNotes.find((note) => note === null || note === undefined)) {
    throw new Error("All inputs to detectChord must have octaves.")
  }

  const sortedNotes = (midiNotes as number[]).sort((a, b) => a - b)

  // detect triads with and without the lowest note (over chord)
  let withBass = detectTriad(relativeToFirst(sortedNotes.slice(1)))  
  let withoutBass = detectTriad(relativeToFirst(sortedNotes))

  // throw away candidates that have more than one extra interval within the first octave
  if (withBass && withBass.extraIntervals.filter(x => x < 12).length > 1) {
    withBass = undefined
  }
  if (withoutBass && withoutBass.extraIntervals.filter(x => x < 12).length > 1) {
    withoutBass = undefined
  }

  // no candidate passed 
  if (!withBass && !withoutBass) {
    return undefined
  }

  // if both pass, use the one with better score
  if (withBass && withoutBass) {
    if (score(withBass) > score(withoutBass)) {
      withoutBass = undefined
    } else {
      withBass = undefined
    }
  }

  let rootIndex: number
  let chordType: string
  if (withBass) {
    // with bass
    rootIndex = 1
    if (withBass.inversion === 1) rootIndex = 3
    if (withBass.inversion === 2) rootIndex = 2
    const bassNote = stripOctave(TonalNote.fromMidi(sortedNotes[0]))
    chordType = `${withBass.name}/${bassNote}`

  } else {
    // without bass
    rootIndex = 0
    if (withoutBass!.inversion === 1) rootIndex = 2
    if (withoutBass!.inversion === 2) rootIndex = 1
    chordType = withoutBass!.name
  }

  const rootNote = stripOctave(TonalNote.fromMidi(sortedNotes[rootIndex]))
  return lookupChord(`${rootNote} ${chordType}`)
}
