import { Chord, MidiNote, Note, noteBelow, noteFromMidi, noteIdentity, noteToMidi, OCTAVE_SIZE, withOctave } from "noteynotes"
import { sum } from "."

export const ALLOW_ADDITIONAL_EXTENSIONS = true

/**
 * The performance of some target chord.
 */
export type PerformedChord = {
  bass?: Note
  
  /**
   * The note (with octave) that extensions are interpreted off of.
   */
  root: Note

  /**
   * Notes of the chord's triad and extensions in order of the target chord's
   * getBasicNotes(withBass = false). If an element was not played, that array
   * item is undefined.
   */
  basicNotes: Array<Note | undefined>

  /**
   * Notes that cannot be interpreted as additional extensions
   * that contribute to error.
   */
  accidentals: Array<Note>

  /**
   * Which (octaveless) notes did we not encounter that make up the basic
   * part of the target chord?
   */
  missing: Array<Note>
}

/**
 * Can we consider this performed chord as an instance of the given target chord?
 */
export const isCorrect = (candidate: PerformedChord, chord: Chord) => {
  if (noteIdentity(candidate.root) !== noteIdentity(chord.root)) {
    return false
  }
  if (candidate.bass && noteIdentity(candidate.bass) !== noteIdentity(chord.bass ?? chord.root)) {
    return false
  }
  if (candidate.basicNotes.some(x => !x)) {
    return false
  }

  // filter out accidentals more than an octave above the root if allowing additional extensions
  // the theory is that these notes don't take away from the core character of the chord...
  const accidentals = ALLOW_ADDITIONAL_EXTENSIONS
    ? candidate.accidentals.filter(n => noteToMidi(n) < noteToMidi(candidate.root) + OCTAVE_SIZE)
    : candidate.accidentals 
  
  return accidentals.length === 0
}

/**
 * Constructs a PerformedChord from a given set of notes played e.g. on a keyboard.
 */
export const interpretPerformance = (sortedNotes: Note[], targetChord: Chord): PerformedChord => {
  if (sortedNotes.length < 2) {
    throw new Error("Cannot interpret a chord performance of fewer than two notes.")
  }

  const numNotesInTriad = targetChord.baseTriad.length + 1
  const targetBasicNotes = targetChord.getBasicNotes(undefined, false)

  let bass: Note | undefined
  if (
    sortedNotes.length > targetBasicNotes.length && (
      // first played note is not in the triad
      !targetBasicNotes.map(noteIdentity)
        .slice(0, numNotesInTriad)
        .includes(noteIdentity(sortedNotes[0])) ||
      // there's a big jump between the first and second notes (>= 1 octave)
      noteToMidi(sortedNotes[1]) >= noteToMidi(sortedNotes[0]) + OCTAVE_SIZE
    )
  ) {
    // interpret first note as bass note (over chord)
    bass = sortedNotes[0]
  }

  const playedNonBassNotes = bass ? sortedNotes.slice(1) : sortedNotes
  const basicNotes = targetBasicNotes.map(
    targetNote => playedNonBassNotes.find(
      playedNote => noteIdentity(playedNote) === noteIdentity(targetNote)
    ))
  const root = basicNotes[0] ?? playedNonBassNotes[0]
  const missing = basicNotes
    .map((x, i) => x === undefined ? targetBasicNotes[i] : undefined)
    .filter(x => !!x) as Note[]
  
  // XXX: should we treat extensions differently?
  // I like that we can play them lower if we'd like...
  return {
    bass,
    root,
    basicNotes,
    accidentals: playedNonBassNotes.filter(x => !basicNotes.includes(x)),
    missing,
  }
}

/**
 * Returns a sorted set of Notes that contains the minimum changes
 * to make the response a valid instance of the target chord.
 */
export const getGoalNotes = (response: PerformedChord, target: Chord): Note[] => {
  const notes: MidiNote[] = []

  // put in all the cromulent notes
  notes.push(...response.basicNotes.filter(x => x !== undefined).map(noteToMidi))

  const noteSetToApproach = response.accidentals.length === 0
    ? notes
    : response.accidentals.map(noteToMidi)

  // for each missing note, we need to put it in at the octave
  // which minimizes the distance to the accidentals/notes we played
  const distance = (candidateNote: MidiNote) =>
    sum(noteSetToApproach.map(n => Math.abs(n - candidateNote)))

  // FIXME: this is hacky and slow but my brain is revolting on me
  for (const missingNote of response.missing) {

    // determine the best octave for this note
    let bestNote = undefined, bestDistance = Infinity
    for (let octave = 0; octave < 8; ++octave) {
      const note = noteToMidi(withOctave(missingNote, octave))
      const dist = distance(note)
      if (dist < bestDistance) {
        bestNote = note
        bestDistance = dist
      }
    }

    // insert it
    notes.push(bestNote!)
  }

  // finally, add the bass note (so that it didn't mess w/ distance calc before)
  if (target.bass) {
    notes.push(noteToMidi(noteBelow(target.bass, response.root)))
  }

  return notes.sort().map(noteFromMidi)
}
