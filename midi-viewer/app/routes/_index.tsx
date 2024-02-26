import { Button, Card, CardBody, CardHeader, Spacer } from "@nextui-org/react";
import type { MetaFunction } from "@remix-run/node";
import { Note, noteFromMidi,  chordForDisplay, detectChord, FullChord, noteForDisplay } from "noteynotes";
import { useCallback, useEffect, useState } from "react";
import { listenForMidi } from "~/midi";
import { useChords } from "~/state/chords";
import { remove } from "~/util";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

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

  const withToggledNote = (notes: TimestampedNote[], note: TimestampedNote) => {
    const foundIndex = notes.findIndex(candidate => candidate.note === note.note)
    if (foundIndex === -1) {
      // add this note
      return [...notes, note]        
    } else {
      // remove this note
      return remove(notes, foundIndex)
    }
  }

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
          // FIXME: this "double note" sensing logic is broken.
          // move this out of the render logic?
          return withToggledNote(notes, candidate)
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

  useEffect(() => {
    if (notes.length < 2) {
      setPendingChord(undefined)
    }
    const resolvedChord = detectChord(notes.map(({ note }) => note))
    setPendingChord(resolvedChord)
  }, [notes])

  // next:
  // TODO: "long context" --> guessed scale based on recent notes
  // TODO: "long context" --> guessed key based on scale + tonal centre? note movement / clustering?
  // TODO: show function of recent chord in key context
  // TODO: needs a different approach to chords where we can have monads and dyads + build on top of what's there
  // TODO: checkmark on UI when chords is locked in

  // later:
  // TODO: notes played right before the tap should be considered part of the next batch of notes
  // TODO: double-tapping drops the pending chord without committing it
  // TODO: both bass note and extensions should be dynamic over the chord lifetime
  // TODO: need to auto-switch extensions based on a _dissonance threshold_
  // TODO: record their history (per base chord) and show them on the UI (MIDI)

  const actualNotes = notes?.map(({ note }) => note) ?? undefined
  const notesString = actualNotes?.map(note => noteForDisplay(note)).join(', ') ?? ''

  const manuallyToggleNote = (note: Note) =>
    setNotes(notes => withToggledNote(notes, { note, timestamp: -1 }))

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
            {pendingChord ? "Save chord (tap sustain)" : "No chord detected"}
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

      <div className="mt-4">
        <Piano
          highlighted={actualNotes}
          onClick={manuallyToggleNote}
        />
      </div>

      <div className="flex flex-row justify-center items-center min-h-8 mt-4">
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
          <p className="text-sm mt-4 text-gray-400">
            Chords you save will appear here.
          </p>
        )}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {chords.map((chord, index) => (
          <Card key={index}>
            <CardHeader className="justify-between">
              <p className="text-2xl">{chordForDisplay(chord)}</p>
              <Button isIconOnly size="sm" title="Delete" onClick={() => removeChord(index)}>
                ✕
              </Button>
            </CardHeader>
          </Card>
        ))}
      </div>
    </OneUpContainer>
  );
}
