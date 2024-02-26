import { Button, Card, CardBody, CardHeader, Spacer } from "@nextui-org/react";
import type { MetaFunction } from "@remix-run/node";
import { Note, noteFromMidi,  chordForDisplay, detectChord, FullChord } from "noteynotes";
import { useCallback, useEffect, useState } from "react";
import { listenForMidi } from "~/midi";
import { useChords } from "~/state/chords";
import OneUpContainer from "~/view/OneUpContainer";

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
  const { chords, push, reset, removeChord } = useChords()

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
    <OneUpContainer>
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-2xl">
          MIDI chord visualizer
        </h1>
        <div className="flex space-x-2">
          <Button
            size="lg"
            color="primary"
            onClick={() => pushTap(NaN)}
            isDisabled={pendingChord === undefined}
          >
            {pendingChord ? "Save chord (tap sustain)" : "Play some notes!"}
          </Button>
          <Button
            size="lg"
            onClick={() => { setPendingChord(undefined); setNotes([]) }}
            isDisabled={notes.length === 0}
          >
            Reset
          </Button>
        </div>
      </div>

      <div className="text-8xl flex justify-center bg-pink-950 p-16 rounded-xl my-4">
        <span style={{ textShadow: "6px 6px 0px rgba(0,0,0,0.4)" }}>{pendingChord ? chordForDisplay(pendingChord) : "--"}</span>
      </div>

      <div className="flex flex-row justify-between items-center min-h-8">
        <h2 className="text-2xl text-left pr-1">
          {notesString}
        </h2>
        <h2 className="text-2xl text-right pl-1">
          {notesString}
        </h2>
      </div>
    
      <div className="flex flex-row justify-between items-center mt-8">
        <h1 className="text-xl">
          Chord history
        </h1>
        <div className="flex space-x-2">
          <Button size="md" color="danger" className="bg-pink-800" onClick={() => reset()} isDisabled={chords.length === 0}>
            Clear all
          </Button>
        </div>
      </div>
      {chords.length === 0 && (
          <p className="text-sm mt-4 text-slate-400">
            Chords you save will appear here.
          </p>
        )}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {chords.map((chord, index) => (
          <Card key={index}>
            <CardHeader className="justify-between">
              <p className="text-2xl">{chordForDisplay(chord!)}</p>
              <Button isIconOnly size="sm" title="Delete" onClick={() => removeChord(index)}>✕</Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </OneUpContainer>
  );
}
