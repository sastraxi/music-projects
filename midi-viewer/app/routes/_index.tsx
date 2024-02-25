import type { MetaFunction } from "@remix-run/node";
import { Note, noteFromMidi, chordsMatchingCondition, combineChord, chordForDisplay, detectChord, FullChord } from "noteynotes";
import { useCallback, useEffect, useMemo, useState } from "react";
import { listenForMidi } from "~/midi";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
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
  const [chordHistory, setChordHistory] = useState<(FullChord | undefined)[]>([undefined])

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
          return [...notes, candidate];
        }
        return notes;
      })
    } else if (command === 176 && note === 64 && velocity > 0) {
      // sustain pedal; use it to switch chords for now
      // FIXME: chord history should be zustand state
      if (chordHistory[chordHistory.length - 1] !== undefined) {
        setChordHistory((chordHistory) => [...chordHistory, undefined])
      }
      setNotes([])
    }
  }, [])

  useEffect(() => {
    return listenForMidi(midiCallback)
  }, [])

  const resolvedChord = useMemo(() =>
    detectChord(notes.map(({ note }) => note)),
    [notes])

  // save the last chord we successfully resolved to
  useEffect(() => {
    if (notes.length < 2) return
    if (resolvedChord) {
      // FIXME: chord history should be zustand state   
      setChordHistory([...chordHistory.slice(0, chordHistory.length - 1), resolvedChord])
    }
  }, [notes])

  // TODO: tapping sustain pedal once commits the current chord to history
  //  ... double-tapping deletes the latest chord
  //  ... notes played right before the tap(s) should be considered part of the next batch of notes

  // TODO: expect users to "nail" the initial notes
  //  ... needs a different approach to chords where we can have monads and dyads + build on top of what's there

  // TODO: both bass note and extensions should be dynamic over the chord lifetime
  //  ... need to auto-switch based on a _dissonance threshold_
  //  ... record their history (per base chord) and show them on the UI (MIDI)

  const notesString = notes?.map(({ note }) => note).join(', ') ?? ''

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h1>Name that chord (MIDI)!</h1>
      <button onClick={() => setNotes([])}>
        Clear current chord
      </button>
      <h2>
        {resolvedChord && <span>Chord: {chordForDisplay(resolvedChord)}</span>}
        <span> ({notesString})</span>
      </h2>
      
      <h3>Chord history:</h3>
      <ul>
        {chordHistory.filter(x => x).map((chord, index) => <li key={index}>{chordForDisplay(chord!)}</li>)}
      </ul>
    </div>
  );
}
