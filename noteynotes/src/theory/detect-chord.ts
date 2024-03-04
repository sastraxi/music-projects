import { cumulative, eq, relativeToFirst, sum } from "../util"
import { CHORD_LIBRARY, ChordType, FullChord, lookupChord } from "./chords"
import { Note, OCTAVE_SIZE, stripOctave } from "./common"
import { Note as TonalNote } from 'tonal'
import { TRIAD_LIBRARY, Triad } from "./triads"

type TriadDetectionResult = {
  /**
   * The first inversion of the detected triad.
   */
  triad: Triad
  name: string
  inversion: 0 | 1 | 2
  /**
   * What intervals (sorted from the lowest not) does the triad not account for?
   * Does not include octaves based on the base triad either.
   */
  extraIntervals: number[]
}

type ChordAndExtensions = {
  type: ChordType
  /**
   * Intervals in the note set that do not appear in this chord type.
   */
  unusedIntervals: number[]
  /**
   * Intervals this chord type that did not appear in the note set.
   */
  missingIntervals: number[]
}

/**
 * Higher scores are better.
 * Penalize chords with lots of unused intervals, but penalize required chord intervals more.
 */
const scoreChord = (cnc: ChordAndExtensions) => -(5 * sum(cnc.missingIntervals) + sum(cnc.unusedIntervals))

/**
 * Name a chord based on its base triad and extensions (non-triadic intervals).
 */
const findChord = ({
  name,
  triad,
  extraIntervals,
}: TriadDetectionResult): ChordAndExtensions | undefined => {
  let bestCandidate: ChordAndExtensions | undefined = undefined

  for (const entry of Object.values(CHORD_LIBRARY)) {
    if (
      eq(triad, entry.baseTriad)  // FIXME: maybe just identity?
      // !(entry.extensions ?? []).some(x => !extraIntervals.includes(x))  // ignore chords that require extensions we don't have
    ) {  
      const candidate: ChordAndExtensions = {
        type: entry,  // use first name of chord
        unusedIntervals: extraIntervals.filter(x => !(entry.extensions ?? []).includes(x)),
        missingIntervals: (entry.extensions ?? []).filter(x => !extraIntervals.includes(x)),
      }
      if (!bestCandidate || scoreChord(bestCandidate) < scoreChord(candidate)) {
        bestCandidate = candidate
      }
    }
  }

  if (!bestCandidate) {
    console.warn(`Could not find a chord for ${triad.join('-')} w intervals ${extraIntervals.join(',')}. Was "${name}"`)
  }

  return bestCandidate
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

// which index represents the root note in a given inversion?
const inversionToRoot = (inversion: 0 | 1 | 2): number => {
  if (inversion === 0) return 0
  if (inversion === 1) return 2
  return 1
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
      
      // all intervals that aren't part of (or octaves of) the base triad
      const extraIntervals = intervals.filter(i => i !== 0 && !cumTriad.includes(i % OCTAVE_SIZE))

      const candidate: TriadDetectionResult = {
        triad: triads[0],  // always return first inversion here
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

  // throw away candidates that have any extra intervals below the perfect fifth
  // FIXME: is this right? used to use OCTAVE_SIZE
  if (withBass && withBass.extraIntervals.filter(x => x < 7).length > 0) {
    withBass = undefined
  }
  if (withoutBass && withoutBass.extraIntervals.filter(x => x < 7).length > 0) {
    withoutBass = undefined
  }

  let withBassChord = withBass ? findChord(withBass) : undefined
  let withoutBassChord = withoutBass ? findChord(withoutBass) : undefined

  // no candidate passed 
  if (!withBassChord && !withoutBassChord) {
    return undefined
  }

  // if both pass, use the one with better "findChord" score
  // FIXME: having both "detectTriad" and "findChord" --> lots of duplication
  let rootNote: string
  let chord: ChordAndExtensions | undefined
  let bassNote: string | undefined
  if (withBassChord && withoutBassChord) {
    // prefer the chord that isn't an over chord
    if (scoreChord(withBassChord) <= scoreChord(withoutBassChord)) {
      withBassChord = undefined
    } else {
      withoutBassChord = undefined
    }
  }

  if (withBassChord) {
    // account for bass note
    let rootIndex = inversionToRoot(withBass!.inversion) + 1
    rootNote = stripOctave(TonalNote.fromMidi(sortedNotes[rootIndex]))
    bassNote = stripOctave(TonalNote.fromMidi(sortedNotes[0]))
    chord = withBassChord
  } else {
    // without bass
    let rootIndex = inversionToRoot(withoutBass!.inversion)
    rootNote = stripOctave(TonalNote.fromMidi(sortedNotes[rootIndex]))
    bassNote = undefined
    chord = withoutBassChord
  }

  // could not find a chord that matches
  if (!chord) return undefined

  if (bassNote === rootNote) bassNote = undefined
  return {
    rootNote,
    bassNote,
    type: chord.type,
    extraIntervals: chord.unusedIntervals,
  }
}
