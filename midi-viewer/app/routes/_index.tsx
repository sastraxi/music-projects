import { Button } from "@nextui-org/react";
import type { MetaFunction } from "@remix-run/node";
import { Note, noteFromMidi, chordsMatchingCondition, combineChord, chordForDisplay, detectChord, FullChord } from "noteynotes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listenForMidi } from "~/midi";
import { useChords } from "~/state/chords";

export const meta: MetaFunction = () => {
  return [
    { title: "MIDI Viewer" },
    { name: "description", content: "Visualize chords played over Web MIDI" },
  ];
};

type TimestampedNote = {
  note: Note
  timestamp: number
}

const noteEquals = (a: TimestampedNote, b: TimestampedNote) => {
  return a.note === b.note && a.timestamp === b.timestamp;
}

export default function Index() {
  const [notes, setNotes] = useState<TimestampedNote[]>([])
  const [pendingChord, setPendingChord] = useState<FullChord | undefined>()
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([])
  const { chords, push, reset } = useChords()

  /**
   * 
   * @param ts NaN signifies a synthetic tap event (i.e. from UI, not MIDI)
   * @returns 
   */
  const pushTap = (ts: number) => setTapTimestamps(prev => [...prev, ts])

  const midiCallback = useCallback((msg: MIDIMessageEvent) => {
    const [command, note, velocity] = msg.data
    if (command === 144 && velocity > 0) {
      setNotes((notes) => {
        const candidate = {
          note: noteFromMidi(note),
          timestamp: msg.timeStamp,
        }
        const lastNote = notes[notes.length - 1]
        if (!lastNote || !noteEquals(lastNote, candidate)) {
          const newNotes = [...notes, candidate]
          if (newNotes.length >= 2) {
            const resolvedChord = detectChord(newNotes.map(({ note }) => note))
            if (resolvedChord) {
              setPendingChord(resolvedChord)
            }
          }
          return newNotes;
        }
        return notes;
      })
    } else if (command === 176 && note === 64 && velocity > 0) {
      // sustain pedal; use it to switch chords for now
      pushTap(msg.timeStamp)
    }
  }, [])

  useEffect(() => {
    return listenForMidi(midiCallback)
  }, [])

  useEffect(() => {
    if (tapTimestamps.length === 0) return
    if (pendingChord) {
      push(pendingChord)
      setPendingChord(undefined)
    }
    setNotes([])
    setTapTimestamps([])
  }, [tapTimestamps])

  // next:
  // TODO: "long context" --> guessed scale based on recent notes
  // TODO: "long context" --> guessed key based on scale + tonal centre? note movement / clustering?
  // TODO: UI that shows recent chords and their functions
  // TODO: needs a different approach to chords where we can have monads and dyads + build on top of what's there
  // TODO: checkmark on UI when chords is locked in
  // TODO: UI that shows a keyboard viz of the notes you're playing
  // TODO: delete a specific chord from history

  // later:
  // TODO: notes played right before the tap should be considered part of the next batch of notes
  // TODO: double-tapping drops the pending chord without committing it
  // TODO: both bass note and extensions should be dynamic over the chord lifetime
  // TODO: need to auto-switch extensions based on a _dissonance threshold_
  // TODO: record their history (per base chord) and show them on the UI (MIDI)

  const notesString = notes?.map(({ note }) => note).join(', ') ?? ''

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h1 className="text-3xl font-bold underline">
        Name that chord!
      </h1>
      <div>
        <Button color="primary" onClick={() => pushTap(NaN)}>
          Push / clear
        </Button>
        <Button onClick={() => reset()}>
          Reset chords
        </Button>        
      </div>
      <h2>
        {pendingChord && <span>Chord: {chordForDisplay(pendingChord)}</span>}
        <span> ({notesString})</span>
      </h2>
      
      <h3>Chord history:</h3>
      <ul>
        {chords.map((chord, index) => <li key={index}>{chordForDisplay(chord!)}</li>)}
      </ul>
    </div>
  );
}
