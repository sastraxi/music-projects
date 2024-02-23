import type { MetaFunction } from "@remix-run/node";
import { Note, chordsMatchingCondition, combineChord } from "noteynotes";
import { useEffect, useState } from "react";
import { listenForMidi } from "~/midi";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {
  const [notes, setNotes] = useState<Note[]>();

  useEffect(() => {
    return listenForMidi((msg) => {
      const [command, note, velocity] = msg.data
      if (command === 144) {
        setNotes([...(notes ?? []), note])
      }
    })
  }, [])

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      <h2>Chord: ???</h2>
      <ul>
        {notes?.map(note => <li>{note}</li>) }
      </ul>
      <button onClick={() => setNotes([])}>
        Reset
      </button>
    </div>
  );
}
