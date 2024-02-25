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
      setChordHistory((chordHistory) => [...chordHistory, undefined])
      setNotes([])
    }
  }, [])

  useEffect(() => {
    return listenForMidi(midiCallback)
  }, [])

  const resolvedChord = useMemo(() =>
    detectChord(notes.map(({ note }) => note)),
    [notes])

  useEffect(() => {
    if (notes.length < 2) return
    if (resolvedChord) {
      setChordHistory([...chordHistory.slice(0, chordHistory.length - 1), resolvedChord])
    } else {
      // TODO: find a better way to do chord history. Want to have access to the previous resolved chord too
      // one thing we want is to create a new chord if just the bass note changes... this can be done e.g. throwing away all but most recent note under the root note
      // this probably shouldn't be done in a react component...
      if (chordHistory[chordHistory.length - 1] !== undefined) {
        // we had a chord here; move on but keep the last note
        setChordHistory([...chordHistory, undefined])
        setNotes(notes.slice(-1))
      } else {
        // we never resolved to a chord
      }
    }
  }, [notes])

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
