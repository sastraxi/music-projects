import { Button, Card, CardBody, CardHeader, Spacer } from "@nextui-org/react";
import type { MetaFunction } from "@remix-run/node";
import { Note, noteFromMidi,  chordForDisplay, detectChord, FullChord, noteForDisplay } from "noteynotes";
import { useCallback, useEffect, useState } from "react";
import NoteHistogram from "~/components/NoteHistogram";
import { listenForMidi } from "~/midi";
import { useChords } from "~/state/chords";
import { useNoteHistogram } from "~/state/note-histogram";
import { useNoteSet } from "~/state/note-set";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

export const meta: MetaFunction = () => {
  return [
    { title: "MIDI Viewer" },
    { name: "description", content: "Visualize chords played over Web MIDI" },
  ];
};

export default function Index() {
  const [pendingChord, setPendingChord] = useState<FullChord | undefined>()
  const [tapTimestamps, setTapTimestamps] = useState<number[]>([])
  const [timeOffset, setTimeOffset] = useState<number | undefined>(0)
  const { sortedNotes, noteSet, includeNote, excludeNote, reset: resetNotes } = useNoteSet()
  const { chords, push, reset: resetChords, removeChord } = useChords()
  const { noteOn, noteOff, reset: resetHistogram, maximum: histogramMaximum } = useNoteHistogram()

  const hasNote = (note: Note) => noteSet.has(note)

  const pushTap = (ts: number) => setTapTimestamps(prev => [...prev, ts])

  const midiCallback = useCallback((msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data
    
    // try to follow the midi clock
    // if (timeOffset === undefined) {
    //   setTimeOffset(msg.timeStamp - performance.now())
    // }

    if (command === 144 && velocity > 0) {
      // turn this note on
      const note = noteFromMidi(midiNote)
      noteOn(note, msg.timeStamp)
      includeNote(note, msg.timeStamp)

    } else if (command === 144 && velocity === 0) {
      // note off; only connected to histogram for now
      const note = noteFromMidi(midiNote)
      noteOff(note, msg.timeStamp)

    } else if (command === 176 && midiNote === 64 && velocity > 0) {
      // sustain pedal; use it to switch chords for now
      pushTap(msg.timeStamp)
    }
  }, [])

  // TODO: callback should live outside of zustand and just be mounted / unmounted here
  // if the callback function is static we won't have duplicated notes
  // need to figure out how to interact with zustand outside of hooks
  // FIXME: for now, we've just disabled strict mode
  useEffect(() => {
    return listenForMidi(midiCallback)
  }, [])

  useEffect(() => {
    if (tapTimestamps.length === 0) return
    if (pendingChord) {
      push(pendingChord)
      setPendingChord(undefined)
    }
    resetNotes()
    setTapTimestamps([])
  }, [tapTimestamps])

  useEffect(() => {
    if (noteSet.size < 2) {
      setPendingChord(undefined)
    }
    const resolvedChord = detectChord(sortedNotes)
    setPendingChord(resolvedChord)
  }, [sortedNotes])

  // next:
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

  const notesString = Array.from(sortedNotes)
    .map(note => noteForDisplay(note, { showOctave: true }))
    .join(', ')

  const toggleNote = (note: Note, timestamp: number) => {
    if (!hasNote(note)) {
      includeNote(note, timestamp)
    } else {
      excludeNote(note)
    }
  }

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
            onClick={() => pushTap(performance.now() + (timeOffset ?? 0))}
            isDisabled={pendingChord === undefined}
          >
            {pendingChord ? "Save chord (tap sustain)" : "No chord detected"}
          </Button>
          <Button
            size="lg"
            onClick={() => { setPendingChord(undefined); resetNotes() }}
            isDisabled={sortedNotes.length === 0}
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
          highlighted={sortedNotes}
          onClick={note => toggleNote(note, performance.now() + (timeOffset ?? 0))}
        />
      </div>

      <div className="flex flex-row justify-center items-center min-h-8 mt-4">
        <h2 className="text-2xl text-right pl-1">
          {notesString}
        </h2>
      </div>

      <div className="flex flex-row justify-between items-center mt-8 mb-4">
        <h1 className="text-xl">
          Note histogram
        </h1>
        <div className="flex space-x-2">
          <Button size="md" onClick={resetHistogram} isDisabled={histogramMaximum === 0}>
            Reset
          </Button>
        </div>
      </div>
      { timeOffset !== undefined &&
        <NoteHistogram timeOffset={timeOffset} />
      }
  
      <div className="flex flex-row justify-between items-center mt-8">
        <h1 className="text-xl">
          Chord history
        </h1>
        <div className="flex space-x-2">
          <Button size="md" color="danger" className="bg-pink-800" onClick={resetChords} isDisabled={chords.length === 0}>
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
