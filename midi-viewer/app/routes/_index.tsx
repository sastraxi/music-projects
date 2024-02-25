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
    }
  }, [])

  useEffect(() => {
    return listenForMidi(midiCallback)
  }, [])

  const resolvedChord = useMemo(() =>
    detectChord(notes.map(({ note }) => note)),
    [notes])

  // if (resolvedChord) {
  //   setChordHistory([...chordHistory.slice(0, chordHistory.length - 1), resolvedChord])
  // } else {
  //   if (chordHistory[chordHistory.length - 1] !== undefined) {
  //     // we had a chord here; move on
  //     setChordHistory([...chordHistory, undefined])
  //   } else {
  //     // we never resolved to a chord
  //   }
  //   setNotes([])
  // }

  const notesString = notes?.map(({ note }) => note).join(', ') ?? ''

  return (
    <div style={{ fontFamily: "system-ui, sans-serif" }}>
      <h1>Name that chord (MIDI)!</h1>
      {resolvedChord && <h2>Chord: {chordForDisplay(resolvedChord)}</h2>}
      <h3>{notesString}</h3>
      <button onClick={() => setNotes([])}>
        Reset
      </button>
    </div>
  );
}
