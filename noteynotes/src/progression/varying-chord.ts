// import { Chord, MidiNote, NoteWithoutOctave, Triad, TriadName } from ".."

// /**
//  * If our varying chord currently has a given base triad, what
//  * other base triads will we accept in future time-slices?
//  */
// const COMPATIBLE_TRIADS: Record<TriadName, TriadName[]> = {
//   "5": ["maj", "min", "sus2", "sus4"],
//   "sus2": ["5", "maj", "min", "sus4"],
//   "sus4": ["5", "maj", "min", "sus2"],
//   "maj": ["5", "sus2", "sus4"],
//   "min": ["5", "sus2", "sus4"],
// }

// /**
//  * Models a set of related chords, sliced in time.
//  * 
//  * We start a new VaryingChord whenever we can no longer detect a chord
//  * that has the same root note and base triad as the first (with some
//  * special cases).
//  *
//  * We start a new time slice when the best-guess detected chord changes
//  * but it still honours the same rootNote and baseTriad. 
//  */
// export class VaryingChord {

//   /**
//    * What is the root note of this chord?
//    */
//   rootNote: NoteWithoutOctave

//   /**
//    * The current base triad we're tracking. We might move to a different
//    * one (see COMPATIBLE_TRIADS), and if we do so we'll change our base
//    * triad to it if that new triad has more notes in it (special case
//    * for power chords). Otherwise we'll 
//    */
//   baseTriad: TriadName

//   /**
//    * When did this chord start playing?
//    */
//   startMs: number
  
//   /**
//    * The original set of detection results from detect-chord
//    * for each time-slice.
//    */
//   detectionResults: Chord[][]

//   /**
//    * The best-guess chord for each time-slice:
//    * subchords[i] is a member of detectionResults[i].
//    */
//   subchords: Chord[]

//   /**
//    * How long is each time-slice?
//    */
//   lengthsMs: number[]

//   /**
//    * 
//    */
//   initializingNotesHeld: Set<MidiNote>

//   /**
//    * True iff no notes have been released since this varying chord
//    * started.
//    */
//   isInitializing: boolean

//   /**
//    * Treated as another "initializing note", if it was held at some
//    * time during the period when this varying chord was initializing.
//    */
//   isSustain: boolean

//   constructor() {

//   }

//   toString() {
//     // TODO: would like to use the chord name. Do we need this.representativeChord?
//   }

//   /**
//    * A varying chord is considered closed when all of its
//    * initializing notes (+sustain) have 
//    */
//   get open() {

//   }

//   get latest() {

//   }

//   get lengthMs() {

//   }



// }
