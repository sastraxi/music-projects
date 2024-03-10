import { cumulative, shortestOf, unique } from "../util"
import { ChordName, ChordSuffix, CONSIDERED_NOTE_NAMES, displayAccidentals, Note, NoteDisplayContext, noteForDisplay, RootAndSuffix, stripOctave } from "./common"
import { TRIAD_LIBRARY, Triad, TriadName } from "./triads"
import { explodeChord } from "../instrument/guitar"
import { Interval, distance, interval, transpose } from "tonal"

export type ChordClass = {
  names: string[]

  /**
   * What is the name (key in TRIAD_LIBRARY) of the triad
   * this chord was built from?
   */
  triadName: string

  /**
   * What should be considered the base triad of this chord?
   * These are the number of semitones in the two non-overlapping
   * subintervals that make up a triad (when starting at some root).
   */
  baseTriad: Triad

  /**
   * In integer notation; semitones above the root note.
   */
  extensions: number[]
}

// /**
//  * Gets a string name for a chord
//  * @param chord 
//  */
// export const nameChord = (chord: Chord, ) => {

// }

export const ALL_CHORD_NAMES: Array<string> = []
export const CHORD_LIBRARY: Record<string, ChordClass> = {}
{
  const add = (names: string[], triadName: TriadName, extensions: number[] = []) => {
    const chordType = {
      names,
      baseTriad: TRIAD_LIBRARY[triadName][0],
      triadName,
      extensions,
    }
    chordType.names.forEach((name) => {
      if (name in CHORD_LIBRARY) throw new Error(`Duplicate chord type name: ${name}`)
      CHORD_LIBRARY[name] = chordType
      CONSIDERED_NOTE_NAMES.forEach((note) => {
        // N.B. we won't enumerate over chords
        ALL_CHORD_NAMES.push(`${note} ${name}`)
      })
    })

  }
  add(['aug'], 'aug')
  add(['aug7'], 'aug', [11])
  add(['maj7♯11', '♯11'], 'aug', [11, 18])  // lydian chord

  add(['', 'maj', 'major'], 'maj')
  add(['6'], 'maj', [9])
  add(['6add9'], 'maj', [9, 14])
  add(['7', 'majm7'], 'maj', [10])
  add(['7♯9'], 'maj', [10, 15])  // hendrix chord
  add(['maj7'], 'maj', [11])
  add(['maj9'], 'maj', [11, 14])
  add(['add9'], 'maj', [14])
  add(['11'], 'maj', [10, 14, 17])
  add(['add11'], 'maj', [17])  // FIXME: is this right or should it be same as maj7 like we had previously?
  add(['maj11'], 'maj', [11, 14, 17])
  add(['maj13'], 'maj', [11, 14, 18, 21])

  add(['b5'], 'b5')

  add(['m', 'min', 'minor'], 'min')
  add(['m6', 'mmaj6'], 'min', [9])
  add(['m6/9'], 'min', [9, 14])
  add(['m7'], 'min', [10])
  add(['mmaj7', 'madd11'], 'min', [11])
  add(['m11'], 'min', [10, 14, 17])

  add(['°', 'dim', 'm♭5'], 'dim')
  add(['°7', 'dim7'], 'dim', [9])
  add(['ø7'], 'dim', [10])  // "half-diminished"
  add(['°M7', 'dimM7', 'm♭5add11'], 'dim', [11])

  add(['5'], '5')

  add(['sus2'], 'sus2')
  add(['7sus2'], 'sus2', [11])

  add(['sus4'], 'sus4')
  add(['7sus4'], 'sus4', [11])
  add(['9sus4'], 'sus4', [10, 14])
}

class ChordNotFoundError extends Error {
  constructor(msg: string) {
    super(msg)
  }
}

export class Chord {

  /**
   * What names are this chord known by?
   * e.g. a major diminished chord is known by both "b5" and "alt"
   *      a major chord is known by both "major" and "maj" and ""
   */
  names: ChordSuffix[]

  /**
   * What is the name (key in TRIAD_LIBRARY) of the triad
   * this chord was built from?
   */
  triadName: string
  
  /**
   * Reference to the base triad intervals.
   * Does not reflect the true notes / inversion this chord was built upon.
   */
  baseTriad: Triad

  /**
   * Octaveless root note of the chord.
   */
  root: Note

  /**
   * Octaveless bass note of the chord, if different than the root.
   */
  bass?: Note

  /**
   * In integer notation; semitones above the root note.
   */
  extensions: number[]

  /**
   * Look up a chord based on its name.
   */
  constructor(name: ChordName | RootAndSuffix) {
    const { root, suffix } = (typeof name === 'string' ? explodeChord(name) : name);

    const [baseSuffix, bassNote] = suffix.split('/')
    const lookupKey = baseSuffix.trim().toLowerCase()
    if (!(lookupKey in CHORD_LIBRARY)) {
      throw new ChordNotFoundError(
        `Could not find ${lookupKey} in chord library (from: ${root} ${suffix})`
      )
    } 

    this.root = stripOctave(root)
    this.bass = bassNote && stripOctave(bassNote) !== this.root ? stripOctave(bassNote) : undefined

    const archetype = CHORD_LIBRARY[lookupKey]

    this.baseTriad = archetype.baseTriad
    this.triadName = archetype.triadName
    this.extensions = archetype.extensions
    this.names = archetype.names
  }

  /**
   * Get the notes that make up this chord, optionally rooting it in a specific octave
   * so that the notes have correct intervalic distances from each other.
   * 
   * @param chord the chord to get notes for
   * @param octave if provided, the notes returned will have correct distances
   *               relative to each other
   */
  getBasicNotes(
    octave?: number
  ): Note[] {
    const rootNote = octave ? `${this.root}${octave}` : this.root
    // we need unique here because of power chords + if a bass note is identical to the root note
    const intervals = unique([
      // the bass note
      ...(this.bass ? [
        -interval(distance(this.bass, this.root)).semitones!
      ] : []),

      // the root note
      0,

      // the triad
      ...cumulative(this.baseTriad),

      // the extensions
      ...(this.extensions ?? []),
    ])
    return intervals.map(semitones =>
      transpose(rootNote, Interval.fromSemitones(semitones))
    )
  }

  /**
   * Throws away extra intervals + bass note.
   */
  getBasicName(): ChordName {
    return `${this.root} ${this.names[0]}`
  }

  /**
   * Returns a string suitable for dispalying this chord to a user.
   */
  forDisplay(context: NoteDisplayContext = {}) {
    const name = context.compact ? shortestOf(this.names)! : this.names[0]
    const root = noteForDisplay(this.root, context)
    const over = this.bass ? `/${noteForDisplay(this.bass, context)}` : ''
    const space = context.compact ? ' ' : ''
    return `${root}${space}${displayAccidentals(name)}${over}`
  }

}

export const isValidChord = (name: ChordName | RootAndSuffix): boolean => {
  try {
    new Chord(name)
    return true
  } catch (e) {
    // TODO: figure out a good way to work around:
    // https://github.com/microsoft/TypeScript/issues/13965
    return false
  }
}

export const chordNameForDisplay = (chord: ChordName, context: NoteDisplayContext = {}) => {
  const { root, suffix } = explodeChord(chord)
  const space = suffix.startsWith('/') ? '' : ' '
  return `${noteForDisplay(root, context)}${space}${displayAccidentals(suffix)}`
}
