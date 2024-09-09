import { NoteWithOctave, PcSet, Note as TonalNote } from "tonal"
import { ALL_GUITAR_CHORDS_IN_CHORD_LIBRARY, ALL_GUITAR_ROOT_SUFFIX_IN_CHORD_LIBRARY, getGuitarNotes } from "../instrument/guitar"
import { Chord } from "./chords"
import { ChordNotFoundError, DEFAULT_RESTRICTED_MODES, KeyName, MAJOR_MODES_BY_DEGREE, MAJOR_SCALES, Note, RootAndSuffix, combineNote, explodeNote, keynameToNotes, noteIdentity, noteNameEquals, noteToMidi } from "./common"


export type ChordSearchParams = {
  /**
   * The notes of the scale, without octaves.
   */
  scaleNotes: string[],
  maxAccidentals?: number
}

/**
 * 12-bucket histogram, one for each note in the octave.
 * Starts at C.
 */
export type NoteHistogramBuckets = [
  number, number, number, number,
  number, number, number, number,
  number, number, number, number,
]

/**
 * How many semitones are between the two given notes?
 * The result is not well-defined if octaves are not given.
 */
const semitoneDistance = (from: Note, to: Note) =>
  Math.abs(noteToMidi(from) - noteToMidi(to))

/**
 * Which chords are inside of the scale we're interested in?
 */
export const chordsMatchingCondition = ({
  scaleNotes,
}: ChordSearchParams): Array<Chord> => {
  const inScale = PcSet.isNoteIncludedIn(scaleNotes)

  const matchingChords: Array<Chord> = []
  for (const { root, suffix } of ALL_GUITAR_ROOT_SUFFIX_IN_CHORD_LIBRARY) {
    try {
      const chord = Chord.lookup({ root, suffix })
      const notes = getGuitarNotes({ root, suffix }, 0)  // XXX: is first chord most indicative?
      const triad = chord.getBasicNotes()
      if (!triad || !triad.every(inScale)) {
        // can't fit this note into any major scale (or our specific one)
        continue
      }

      // skip chords that don't have the root and bass note in scale
      // TODO: should we look at all notes below root?
      const bassNote = notes[0]
      const rootNote = notes.find(n => noteNameEquals(n, root))
      if (!rootNote) {
        // this indicates an incorrect chord in guitar.json
        console.error(`Incorrect chord in guitar.json: ${root} ${suffix}, but ${notes}`)
        continue
      }
      if (!inScale(bassNote)) {
        continue
      }

      // how many accidentals overall in the chord?
      matchingChords.push(
        chord.withAccidentals(
          notes
            .filter(note => !inScale(note))
            .map(note => semitoneDistance(rootNote, note))
        ))
    } catch (error) {
      if (!(error instanceof ChordNotFoundError)) {
        // we'll only swallow ChordNotFoundErrors
        throw error
      }
    }
  }
  return matchingChords
}


/**
 * N.B. only does keys based on the major scales right now.
 */
export const keysIncludingChord = (
  chord: RootAndSuffix,
  notes: Array<Note>,
  {
    maxAccidentals = 0,
    onlyBaseTriad = true,
    restrictedModes = DEFAULT_RESTRICTED_MODES,
  }: {
    maxAccidentals?: number,
    onlyBaseTriad?: boolean,
    restrictedModes?: Array<string>
  } = {},
) => {

  // we can optionally skip all the non-core notes (outside the base triad)
  // this is helpful if we want to allow extensions on the chord we're basing
  // key selection around (and is in fact why this code exists...)		
  // if we don't have a triad, fall back to the notes
  const consideredNotes = onlyBaseTriad
    ? (Chord.lookup(chord).getBasicNotes() ?? notes)  // TODO: pass in Chord instead
    : notes

  // find all keys that contain all the given scale notes,
  // with a "slop" factor given by numAccidentals.
  // TODO: remove numAccidentals? We aren't using it (always 0).
  const matchingKeys: Array<KeyName> = []
  for (const scale of Object.values(MAJOR_SCALES)) {
    const inScale = PcSet.isNoteIncludedIn(scale)

    const accidentals = consideredNotes.map(inScale)
    const numAccidentals = accidentals
      .reduce((sum, inScale) => sum + (inScale ? 0 : 1), 0)

    if (numAccidentals <= maxAccidentals) {
      scale.forEach((note, degree) => {
        const mode = MAJOR_MODES_BY_DEGREE[degree]
        if (!restrictedModes.includes(mode)) {
          matchingKeys.push(`${note} ${mode}`)
        }
      })
    }
  }

  return matchingKeys
}

/**
 * Is the given chord diatonic in the key?
 */
export const isDiatonic = (chord: Chord, keyName: string) => {
  const chordNotes = chord.getBasicNotes().map(noteIdentity)
  const keyNotes = keynameToNotes(keyName).map(noteIdentity)
  return chordNotes.every(x => keyNotes.includes(x))
}

export const inKeyPredicate = (keyName: string) => {
  const keyNotes = keynameToNotes(keyName).map(noteIdentity)
  return (note: Note) =>
    keyNotes.includes(noteIdentity(note))
}

const ALTERED_DEGREE = ['♭','♮','♯']
const MODIFIERS = 'b♭#♯♮'

const stripAccidentals = (note: Note) =>
  note.replaceAll(MODIFIERS, '')

/**
 * Returns the given note relative to 
 * 
 * @param root 
 * @param key 
 * @param note 
 * 
 * @returns e.g. [']
 */
const notesAsScaleDegrees = (
  notes: NoteWithOctave[],
  options: { root: NoteWithOctave, key: KeyName },
) => {
  const scaleDegrees: string[] = []

  // TODO: cache results for each 

  const keyNotes = keynameToNotes(options.key)
  const keyNotesWithoutAccidentals = keyNotes.map(stripAccidentals)  
  for (const note of notes) {
    // FIXME: is simplify necessary? what about octave when e.g. "B##4"?
    const { name, octave } = explodeNote(TonalNote.simplify(note))
    const noteNameWithoutAccidentals = stripAccidentals(name)
    const scaleDegree = keyNotesWithoutAccidentals.includes(noteNameWithoutAccidentals)
      ? keyNotesWithoutAccidentals.indexOf(name)
      : keyNotesWithoutAccidentals.indexOf(TonalNote.enharmonic(name))

    if (scaleDegree === -1) {
      debugger
    }

    const distance = semitoneDistance(combineNote({ name: keyNotes[scaleDegree], octave }), note)
    const degree = (distance === -1 || distance === 11 ? ALTERED_DEGREE[-1] : ALTERED_DEGREE[1])

    // FIXME: this SUCKS
  }

  return scaleDegrees
}
