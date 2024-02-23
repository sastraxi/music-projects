import type { MetaFunction } from "@remix-run/node";
import { combineChord } from "noteynotes";
import { chordsMatchingCondition } from 'noteynotes';

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export default function Index() {

  const chords = chordsMatchingCondition({ scaleNotes: ["A", "C", "F", "F#"] })

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <h1>Welcome to Remix</h1>
      { chords.map(({ chord }) => combineChord(chord))}
    </div>
  );
}
