import { cumulative, shortestOf, unique } from "../util"
import { ChordName, ChordNotFoundError, ChordSuffix, CONSIDERED_NOTE_NAMES, displayAccidentals, explodeChord, Note, NoteDisplayContext, noteForDisplay, noteIdentity, RootAndSuffix, stripOctave } from "./common"
import { TRIAD_LIBRARY, Triad, TriadName } from "./triads"
import { Interval, Note as TonalNote, distance, interval, transpose } from "tonal"

export type ChordArchetype = {
  names: string[]

  /**
   * What is the name (key in TRIAD_LIBRARY) of the triad
   * this chord was built from?
   */
  triadName?: TriadName

  /**
   * What should be considered the base triad of this chord?
   * These are the number of semitones in the two non-overlapping
   * subintervals that make up a triad (when starting at some root).
   */
  baseTriad: Triad

  /**
   * In integer notation; semitones above the root note.
   * These are extensions considered part of the inherent propert of the chord;
   * combine with a Chord's accidentals to get the full set of intervals that
   * exist outside of a chord's root / bass / base triad notes.
   */
  extensions: number[]
}

export const ALL_CHORD_NAMES: Array<string> = []
export const CHORDS_BY_TRIAD: Partial<Record<TriadName, ChordArchetype[]>> = {}
export const CHORD_LIBRARY: Record<string, ChordArchetype> = {}
{
  const add = (names: string[], triadName: TriadName, extensions: number[] = []) => {
    const chordType: ChordArchetype = {
      names,
      baseTriad: TRIAD_LIBRARY[triadName][0],
      triadName,
      extensions,
    }
    chordType.names.forEach((name) => {
      if (name in CHORD_LIBRARY) {
        throw new Error(`Duplicate chord type name: ${name}`)
      }
      CHORD_LIBRARY[name] = chordType
      CONSIDERED_NOTE_NAMES.forEach((note) => {
        // N.B. we won't enumerate over chords
        ALL_CHORD_NAMES.push(`${note} ${name}`)
      })
    })    
    if (!CHORDS_BY_TRIAD[triadName]) {
      CHORDS_BY_TRIAD[triadName] = []
    }
    CHORDS_BY_TRIAD[triadName]!.push(chordType)
  }
  add(['aug'], 'aug')
  add(['aug7'], 'aug', [11])
  add(['maj7#11', '#11'], 'aug', [11, 18])  // lydian chord

  add(['', 'maj', 'major'], 'maj')
  add(['6'], 'maj', [9])
  add(['6add9'], 'maj', [9, 14])
  add(['7', 'majm7'], 'maj', [10])
  add(['7#9'], 'maj', [10, 15])  // hendrix chord
  add(['maj7'], 'maj', [11])
  add(['maj9', '9'], 'maj', [11, 14])
  add(['add9'], 'maj', [14])
  add(['11'], 'maj', [10, 14, 17])
  add(['add11'], 'maj', [17])  // FIXME: is this right or should it be same as maj7 like we had previously?
  add(['maj11'], 'maj', [11, 14, 17])
  add(['maj13'], 'maj', [11, 14, 18, 21])

  // FIXME: is b5 useful on its own?
  // add(['b5'], 'b5')

  add(['7b5', 'maj7b5', 'M7b5'], 'b5', [11])

  add(['m', 'min', 'minor'], 'min')
  add(['m6', 'mmaj6'], 'min', [9])
  add(['m6/9', 'm69'], 'min', [9, 14])
  add(['m7'], 'min', [10])
  add(['mmaj7', 'madd11'], 'min', [11])
  add(['m11'], 'min', [10, 14, 17])

  add(['°', 'dim', 'm♭5'], 'dim')
  add(['°7', 'dim7'], 'dim', [9])
  add(['ø7', 'm7b5'], 'dim', [10])  // "half-diminished"
  add(['°M7', 'dimM7', 'm♭5add11'], 'dim', [11])

  add(['5'], '5')

  add(['sus2'], 'sus2')
  add(['7sus2'], 'sus2', [11])

  add(['sus4'], 'sus4')
  add(['7sus4'], 'sus4', [11])
  add(['9sus4'], 'sus4', [10, 14])
}

// prevent e.g. m6/9 from being parsed as an over chord
const SUFFIX_WITH_BASS_NOTE = /^(.+)[/]([^\d]+)$/

export class Chord {

  archetype: ChordArchetype

  /**
   * What names are this chord known by?
   * e.g. a major diminished chord is known by both "b5" and "alt"
   *      a major chord is known by both "major" and "maj" and ""
   */
  names: ChordSuffix[]

  /**
   * What is the name (key in TRIAD_LIBRARY) of the triad
   * this chord was built from?
   * 
   * If this is undefined, there is no triad (just the root alone).
   */
  triadName?: TriadName
  
  /**
   * Reference to the (relative) base triad intervals. Does not
   * necessarily reflect the inversion this chord was built upon.
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
   * Notes not included in the base triad but accounted for in the
   * chord name. Represented as semitones above the root note.
   * 
   * These are extensions considered part of the inherent propert of the chord;
   * combine with a Chord's accidentals to get the full set of intervals that
   * exist outside of a chord's root / bass / base triad notes.
   */
  extensions: number[]

  /**
   * Notes not included in the base triad and considered as extra
   * notes on top of the resolved chord name. Represented as semitones
   * above the root note.
   * 
   * Notes in the base triad but in different octaves should not be
   * counted here.
   */
  accidentals: number[]

  constructor(
    archetype: ChordArchetype,
    root: Note,
    bass?: Note,
    accidentals?: number[]
  ) {
    this.archetype = archetype
    this.names = archetype.names
    this.triadName = archetype.triadName
    this.baseTriad = archetype.baseTriad
    this.extensions = archetype.extensions
    this.root = stripOctave(root)
    this.bass = bass && stripOctave(bass) !== this.root ? stripOctave(bass) : undefined
    this.accidentals = accidentals ?? []
  }

  /**
   * Look up a chord based on its name.
   */
  static lookup(name: Chord | ChordName | RootAndSuffix): Chord {
    if (name instanceof Chord) {
      return name
    }

    const { root, suffix } = (typeof name === 'string' ? explodeChord(name) : name);

    const match = suffix.match(SUFFIX_WITH_BASS_NOTE)
    const baseSuffix = !!match ? match[1] : suffix
    const bassNote = !! match ? match[2] : undefined
    const lookupKey = baseSuffix.trim()
    if (!(lookupKey in CHORD_LIBRARY)) {
      throw new ChordNotFoundError(
        `Could not find ${lookupKey} in chord library (from: ${root} ${suffix})`
      )
    } 

    return new Chord(CHORD_LIBRARY[lookupKey], root, bassNote)
  }

  /**
   * A clone of this Chord with a different value for accidentals.
   */
  withAccidentals(accidentals?: number[]): Chord {
    return new Chord(
      this.archetype,
      this.root,
      this.bass,
      accidentals,
    )
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
    octave?: number,
    includeBass = true,
  ): Note[] {
    const rootNote = octave ? `${this.root}${octave}` : this.root
    // we need unique here because of power chords + if a bass note is identical to the root note
    const intervals = unique([
      // the bass note
      ...((includeBass && this.bass) ? [
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
    ).map(TonalNote.simplify)
  }

  /**
   * Returns true if this chord contains the given note.
   * By default, only the base triad + extensions are considered.
   */
  containsNote(
    note: Note,
    includeBass = false,
  ): boolean {
    return this.getBasicNotes(undefined, includeBass)
      .map(noteIdentity)
      .includes(noteIdentity(note))
  }

  /**
   * Throws away extra intervals, accidentals, and bass note.
   */
  getBasicName(): ChordName {
    return `${this.root} ${this.names[0]}`
  }

  /**
   * Throws away extra intervals, accidentals, and bass note.
   */
  getRootAndSuffix(): RootAndSuffix {
    return {
      root: this.root,
      suffix: this.names[0]
    }
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

export const ALL_CHORDS: Array<Chord> = []
{
  for (const chordName of ALL_CHORD_NAMES) {
    // TODO: over chords!
    ALL_CHORDS.push(Chord.lookup(chordName))
  }
}

export const isValidChord = (name: ChordName | RootAndSuffix): boolean => {
  try {
    Chord.lookup(name)
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
