import { cumulative, relativeToFirst, shortestOf, unique } from "../util"
import { CONSIDERED_NOTE_NAMES, Note, NoteDisplayContext, explodeNote, noteForDisplay, stripOctave } from "./common"
import { AUGMENTED_TRIAD, DIMINISHED_TRIAD, MAJOR_DIM_TRIAD, MAJOR_TRIAD, MINOR_TRIAD, POWER_TRIAD, SUS2_TRIAD, SUS4_TRIAD, Triad } from "./triads"
import { Chord, ExplodedChord, explodeChord } from "../instrument/guitar"
import { Interval, distance, interval, transpose, Note as TonalNote } from "tonal"

/**
 * A member of the CHORD_LIBRARY
 */
export type ChordType = {
  /**
   * What names are this chord known by?
   * e.g. a major diminished chord is known by both "b5" and "alt"
   *      a major chord is known by both "major" and "maj" and ""
   */
  names: string[]

  /**
   * What should be considered the base triad of this chord?
   * These are the number of semitones in the two non-overlapping
   * subintervals that make up a triad (when starting at some root).
   */
  baseTriad: Triad

  /**
   * In integer notation; semitones above the root note.
   */
  extensions?: number[]
}

export type FullChord = {
  rootNote: Note
  bassNote?: Note
  type: ChordType
  extraIntervals?: number[]
}

export const ALL_CHORD_NAMES: Array<string> = []
export const CHORD_LIBRARY: Record<string, ChordType> = {}
{
  const add = (names: string[], baseTriad: Triad, extensions?: number[]) => {
    const chordType = { names, baseTriad, extensions }
    chordType.names.forEach((name) => {
      if (name in CHORD_LIBRARY) throw new Error(`Duplicate chord type name: ${name}`)
      CHORD_LIBRARY[name] = chordType
      CONSIDERED_NOTE_NAMES.forEach((note) => {
        // N.B. we won't enumerate over chords
        ALL_CHORD_NAMES.push(`${note} ${name}`)
      })
    })

  }
  add(['aug'], AUGMENTED_TRIAD)
  add(['aug7'], AUGMENTED_TRIAD, [11])
  add(['maj7♯11', '♯11'], AUGMENTED_TRIAD, [11, 18])  // lydian chord

  add(['', 'maj', 'major'], MAJOR_TRIAD)
  add(['6'], MAJOR_TRIAD, [9])
  add(['6add9'], MAJOR_TRIAD, [9, 14])
  add(['7', 'majm7'], MAJOR_TRIAD, [10])
  add(['7♯9'], MAJOR_TRIAD, [10, 15])  // hendrix chord
  add(['maj7'], MAJOR_TRIAD, [11])
  add(['maj9'], MAJOR_TRIAD, [11, 14])
  add(['add9'], MAJOR_TRIAD, [14])
  add(['11'], MAJOR_TRIAD, [10, 14, 17])
  add(['add11'], MAJOR_TRIAD, [17])  // FIXME: is this right or should it be same as maj7 like we had previously?
  add(['maj11'], MAJOR_TRIAD, [11, 14, 17])
  add(['maj13'], MAJOR_TRIAD, [11, 14, 18, 21])

  add(['b5'], MAJOR_DIM_TRIAD)

  add(['m', 'min', 'minor'], MINOR_TRIAD)
  add(['m6', 'mmaj6'], MINOR_TRIAD, [9])
  add(['m6/9'], MINOR_TRIAD, [9, 14])
  add(['m7'], MINOR_TRIAD, [10])
  add(['mmaj7', 'madd11'], MINOR_TRIAD, [11])
  add(['m11'], MINOR_TRIAD, [10, 14, 17])

  add(['°', 'dim', 'm♭5'], DIMINISHED_TRIAD)
  add(['°7', 'dim7'], DIMINISHED_TRIAD, [9])
  add(['ø7'], DIMINISHED_TRIAD, [10])  // "half-diminished"
  add(['°M7', 'dimM7', 'm♭5add11'], DIMINISHED_TRIAD, [11])

  add(['5'], POWER_TRIAD)

  add(['sus2'], SUS2_TRIAD)
  add(['7sus2'], SUS2_TRIAD, [11])

  add(['sus4'], SUS4_TRIAD)
  add(['7sus4'], SUS4_TRIAD, [11])
  add(['9sus4'], SUS4_TRIAD, [10, 14])
}

class ChordNotFoundError extends Error {
  constructor(msg: string) {
    super(msg)
  }
}


export const lookupChord = (chord: Chord | ExplodedChord): FullChord => {
  const { root, suffix } = (typeof chord === 'string' ? explodeChord(chord) : chord);
  const [baseSuffix, bassNote] = suffix.split('/')
  const lookupKey = baseSuffix.trim().toLowerCase()
  if (!(lookupKey in CHORD_LIBRARY)) {
    throw new ChordNotFoundError(
      `Could not find ${lookupKey} in chord library (from: ${root} ${suffix})`
    )
  }
  return {
    rootNote: stripOctave(root),
    bassNote: bassNote ? stripOctave(bassNote) : undefined,
    type: CHORD_LIBRARY[lookupKey],
  }
}

export const isValidChord = (chord: Chord | ExplodedChord): boolean => {
  try {
    lookupChord(chord)
    return true
  } catch (e) {
    // TODO: figure out a good way to work around:
    // https://github.com/microsoft/TypeScript/issues/13965
    return false
  }
}

/**
 * Get the notes that make up this chord, optionally rooting it in a specific octave
 * so that the notes have correct intervalic distances from each other.
 * 
 * @param chord the chord to get notes for
 * @param octave if provided, the notes returned will have correct distances
 *               relative to each other
 */
export const getBasicChordNotes = (
  chord: FullChord,
  octave?: number
): Note[] => {
  const rootNote = octave ? `${chord.rootNote}${octave}` : chord.rootNote
  // we need unique here because of power chords + if a bass note is identical to the root note
  const intervals = unique([
    // the bass note
    ...(chord.bassNote ? [
      -interval(distance(chord.bassNote, chord.rootNote)).semitones!
    ] : []),

    // the root note
    0,

    // the triad
    ...cumulative(chord.type.baseTriad),

    // the extensions
    ...(chord.type.extensions ?? []),
  ])
  return intervals.map(semitones =>
    transpose(rootNote, Interval.fromSemitones(semitones))
  )
}

export const chordForDisplay = (chord: FullChord, context: NoteDisplayContext = {}) => {
  const name = context.compact ? shortestOf(chord.type.names)! : chord.type.names[0]
  const root = noteForDisplay(chord.rootNote, context)
  const over = chord.bassNote ? `/${noteForDisplay(chord.bassNote, context)}` : ''
  const space = context.compact ? ' ' : ''
  const extra = chord.extraIntervals?.length ? ` +${chord.extraIntervals.join(',')}` : ''
  return `${root}${space}${name}${over}${extra}`
}
