import type { MetaFunction } from "@remix-run/node";
import { Note, noteFromMidi, chordsMatchingCondition, combineChord } from "noteynotes";
import { useCallback, useEffect, useState } from "react";
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
  const [notes, setNotes] = useState<TimestampedNote[]>([]);

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
  }, []);

  useEffect(() => {
    return listenForMidi(midiCallback)
  }, []);

  const notesString = notes?.map(({ note }) => note).join(', ') ?? '';

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <h2>Chord: ???</h2>
      <h3>{notesString}</h3>
      <button onClick={() => setNotes([])}>
        Reset
      </button>
    </div>
  );
}
