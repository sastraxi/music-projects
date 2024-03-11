import { cumulative, eq, mod, relativeToFirst, sum, unique } from "../util"
import { CHORDS_BY_TRIAD, Chord } from "./chords"
import { Note, OCTAVE_SIZE, midiIdentity, noteFromIdentity, noteFromMidi } from "./common"
import { Note as TonalNote } from 'tonal'
import { TRIAD_LIBRARY,  TriadName } from "./triads"

/**
 * Higher scores are better.
 * Penalize chords with accidentals near the root
 */
const scoreChord = (chord: Chord) => -(
  sum(chord.accidentals.map(x => 100 - x))
)

// which index represents the root note in a given inversion?
const inversionToRoot = (inversion: number, triadLength: number): number => {
  if (triadLength === 3) {
    if (inversion === 0) return 0
    if (inversion === 1) return 2
    return 1
  } else {
    // power chord triads
    // FIXME: there's gotta be a better way.
    return inversion
  }
}

/**
 * Figure out which chord(s) a smattering of notes might represents.
 */
export const detectChords = (notesWithOctaves: Note[]): Chord[] => {
  const midiNotes = [...new Set(notesWithOctaves)].map(TonalNote.midi)
  if (midiNotes.find((note) => note === null || note === undefined)) {
    throw new Error("All inputs to detectChords must have octaves.")
  }
  const sortedNotes = (midiNotes as number[]).sort((a, b) => a - b)

  // TODO: consider trying an implicit fifth
  // TODO: consider adding a maj7sus (R+5+7) triad to the library

  const candidates: Chord[] = [{
    bass: undefined,
    sortedMidiNotes: sortedNotes,
  }, {
    bass: sortedNotes[0],
    sortedMidiNotes: sortedNotes.slice(1),
  }].flatMap(({ bass, sortedMidiNotes }) => {
    let results: Chord[] = []

    // if we don't have at least two notes, we can't form note relationships
    if (sortedMidiNotes.length < 2) return []

    // the first three unique notes we see should make up our base triad
    const triadNoteIdentities = unique(sortedMidiNotes.map(midiIdentity))
      .slice(0, 3)
      .sort()

    const coreIntervals = relativeToFirst(triadNoteIdentities)
      .map(mod(OCTAVE_SIZE))  // no negatives
      .slice(1)               // get rid of root "interval" (0)

    // find the triad (and inversion) that makes sense for this note set
    for (const [name, triads] of Object.entries(TRIAD_LIBRARY)) {
      for (let inversion = 0; inversion < triads.length; ++inversion) {
        const triad = triads[inversion]
        const cumTriad = cumulative(triad)

        // we need an exact match for our base triad.
        if (!eq(coreIntervals, cumTriad)) continue

        // our root note is the first note that is enharmonically equivalent to the triad root
        const rootIdentity = triadNoteIdentities[inversionToRoot(inversion, triad.length)]
        const rootIndex = sortedMidiNotes.findIndex(x => midiIdentity(x) === rootIdentity)        
      
        // TODO: remove debug logging
        // console.log(coreIntervals, cumTriad)
        // console.log(sortedMidiNotes.length, rootIdentity, rootIndex)
        // if (rootIndex === -1) {
        //   debugger
        //   throw new Error("How did we get here?")
        // }

        // intervals our chord does not account for
        const extraIntervals = sortedMidiNotes
          .filter(i => !triadNoteIdentities.includes(midiIdentity(i)))
          .map(x => x - sortedMidiNotes[rootIndex])

        // FIXME: need better typing here
        for (const entry of CHORDS_BY_TRIAD[name as TriadName]!) {
          if (entry.extensions.every(x => extraIntervals.includes(x))) {
            // accidentals are intervals that aren't part of (or octaves of) the base triad
            const accidentals = extraIntervals.filter(x => !entry.extensions.includes(x))
            results.push(new Chord(
              entry,
              noteFromIdentity(rootIdentity),
              bass ? noteFromMidi(bass) : undefined,
              accidentals,
            ))
          }
        }
      }
    }

    return results
  })

  // results in order of descending score
  return candidates.sort((a, b) => scoreChord(b) - scoreChord(a))
}
