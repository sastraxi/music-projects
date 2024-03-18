import { Button } from "@nextui-org/button";
import { Switch } from "@nextui-org/switch";
import type { MetaFunction } from "@remix-run/cloudflare";
import { Chord, detectChords, detectKey, noteForDisplay, noteFromMidi, noteToMidi, relativeToFirst, toKeyName } from "noteynotes";
import { useCallback, useEffect, useState } from "react";
import DetectedKey from "~/components/DetectedKey";
import { listenForMidi } from "~/midi";
import { useChords } from "~/state/chords";
import { useKey } from "~/state/key";
import { useNoteHistogram } from "~/state/note-histogram";
import { useNoteSet } from "~/state/note-set";
import { useUiState } from "~/state/ui";
import { subscriptText } from "~/util";
import ChordCard from "~/view/ChordCard";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

const U_2009_THIN_SPACE = ' '

export const meta: MetaFunction = () => {
  return [
    { title: "MIDI Viewer" },
    { name: "description", content: "Visualize chords played over Web MIDI" },
  ];
};

export default function Index() {
  const [isLatching, setLatching] = useState<boolean>(false)
  const [pendingChord, setPendingChord] = useState<Chord>()
  const [timeOffset, setTimeOffset] = useState<number>(0)
  const [isKeyLocked, setKeyLocked] = useState<boolean>(false)
  
  const { sortedNotes, includeNote, excludeNote, toggleNote, reset: resetNotes } = useNoteSet()
  const { chords, push, reset: resetChords, removeChord } = useChords()
  const { noteOn, noteOff, noteInstant, reset: resetHistogram, maximum: histogramMaximum, computed: computedHistogram } = useNoteHistogram()
  const { setGuessedKeys, chosenKey, setChosenKey } = useKey()
  const { notesBarVisible, toggleNotesBarVisibility } = useUiState()

  const saveChord = () => {
    if (pendingChord) {
      push(pendingChord)
      setPendingChord(undefined)
    }
  }

  const midiCallback = useCallback((msg: MIDIMessageEvent) => {
    const [command, midiNote, velocity] = msg.data
    
    // try to follow the midi clock
    // if (timeOffset === undefined) {
    //   setTimeOffset(msg.timeStamp - performance.now())
    // }

    if (command === 144 && velocity > 0) {
      // note on
      const note = noteFromMidi(midiNote)
      noteOn(note, msg.timeStamp)
      if (isLatching) {
        toggleNote(note)
      } else {
        includeNote(note)
      }

    } else if (command === 144 && velocity === 0) {
      // note off
      const note = noteFromMidi(midiNote)
      noteOff(note, msg.timeStamp)
      if (!isLatching) {
        excludeNote(note)
      }

    } else if (command === 176 && midiNote === 64) {
      // sustain pedal; use it to control latching mode
      // const shouldLatch = velocity > 0
      // if (isLatching !== shouldLatch) {
      //   setLatching(shouldLatch)
      //   if (!shouldLatch) resetNotes()
      // }
    }
  }, [isLatching, toggleNote])

  // TODO: callback should live outside of zustand and just be mounted / unmounted here
  // if the callback function is static we won't have duplicated notes
  // need to figure out how to interact with zustand outside of hooks
  useEffect(() => {
    return listenForMidi(midiCallback)
  }, [midiCallback])

  useEffect(() => {
    if (sortedNotes.length < 2) {
      setPendingChord(undefined)
    } else {
      const resolvedChords = detectChords(sortedNotes)
      if (resolvedChords.length > 1) {
        console.log('multiple chords detected, choosing first...', resolvedChords)
      }
      if (resolvedChords.length === 0) {
        // TODO: should relativeToFirst chop off the first 0?
        // FIXME: display w.r.t. current key (e.g. flat4 nat7)
        const intervals = relativeToFirst(sortedNotes.map(noteToMidi)).slice(1)
        const firstFewIntervals = intervals.slice(0, 6)
        const nameParts = [
          ...firstFewIntervals.map(x => `${x}`).map(subscriptText),
          ...(firstFewIntervals.length < intervals.length ? [subscriptText('+')] : []),
        ]
        const name = U_2009_THIN_SPACE + nameParts.join(U_2009_THIN_SPACE) + U_2009_THIN_SPACE
        const fallbackChord = new Chord({
          baseTriad: [0],
          extensions: intervals,
          names: [name],
          triadName: undefined,
        }, sortedNotes[0])
        setPendingChord(fallbackChord)
      } else {
        setPendingChord(resolvedChords[0])
      }
    }
  }, [sortedNotes])

  // note histogram ==> keys
  // TODO: move key guessing + interval out of react; just subscribe to enable / disable a pure JS thing
  useEffect(() => {
    const guessedKeys = histogramMaximum === 0 ? [] : detectKey(computedHistogram).slice(0, 5)
    setGuessedKeys(guessedKeys)
    if (!isKeyLocked && guessedKeys.length > 0) {
      setChosenKey(guessedKeys[0])
    }
  }, [computedHistogram])

  const keyName = chosenKey ? toKeyName(chosenKey) : undefined
  const notesString = Array.from(sortedNotes)
    .map(note => noteForDisplay(note, { showOctave: true, keyName }))
    .join(', ')

  return (
    <OneUpContainer>
      <div className="flex flex-row justify-between items-center">
        <h1 className="text-2xl">
          MIDI chord visualizer
        </h1>
        <div className="flex space-x-2">
          <Button
            color={notesBarVisible ? "primary" : "default"}
            onClick={toggleNotesBarVisibility}
            className="text-3xl rounded-3xl min-w-0 p-4 pt-3"
            title="Toggle notes bar"
            size="lg"
          >
            ♪
          </Button>
          <Button
            color={isLatching ? "warning" : "default"}
            onClick={() => { setLatching(!isLatching); if (isLatching) resetNotes() }}
            className="text-3xl rounded-3xl min-w-0 p-1 pt-[2px] pl-[3px]"
            title="Toggle latching mode"
            size="lg"
          >
            🧊
          </Button>
          <Button
            size="lg"
            color="primary"
            onClick={saveChord}
            isDisabled={sortedNotes.length < 2}
          >
            Save chord
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
        <span style={{ textShadow: "6px 6px 0px rgba(0,0,0,0.4)" }}>
          {pendingChord?.forDisplay({ keyName }) ?? "--"}
        </span>
      </div>

      <div className="mt-4">
        <Piano
          highlighted={sortedNotes}
          onClick={note => { 
            toggleNote(note)
            noteInstant(note, performance.now() + (timeOffset ?? 0), 100)
          }}
        />
      </div>

      {notesBarVisible && (
        <div className="flex flex-row justify-center items-center min-h-8 mt-4">
          <h2 className="text-2xl text-right pl-1">
            {notesString}
          </h2>
        </div>
      )}

      <div className="flex flex-row justify-between items-center mt-8 mb-2">
        <h1 className="text-xl">
          Key / mode
        </h1>
        <Switch
            className="ml-3 pt-1"
            size="sm"
            isSelected={isKeyLocked}
            onValueChange={setKeyLocked}
          >
            <span className={isKeyLocked ? "text-sky-600" : ""}>
              Lock{isKeyLocked ? 'ed' : ''}
            </span>
        </Switch>
        <div className="flex-grow" />
        <div className="flex space-x-2">
          <Button size="md" onClick={resetHistogram} isDisabled={histogramMaximum === 0}>
            Reset histogram
          </Button>
          <Button size="md" color="danger" className="bg-pink-800" onClick={resetChords} isDisabled={chords.length === 0}>
            Clear chords
          </Button>
        </div>
      </div>
      { timeOffset !== undefined &&
        <DetectedKey timeOffset={timeOffset} />
      }
      {chords.length === 0 && (
          <p className="text-sm mt-4 text-gray-400">
            Chords you save will appear here.
          </p>
        )}
      <div className="grid grid-cols-4 gap-4 mt-4">
        {chords.map((chord, index) => (
          <ChordCard key={`chord-${index}`} chord={chord} keyName={keyName} removeChord={() => removeChord(index)} />
        ))}
      </div>
    </OneUpContainer>
  );
}
