import { Button } from "@nextui-org/button";
import { ALL_CHORDS, AllTriadic, Chord, detectChords, detectKey, FLAVOUR_CHOICES, getMakeFlavourChoice, Note, noteForDisplay, noteFromMidi, noteIdentity, noteToMidi, OCTAVE_SIZE, relativeToFirst, toKeyName } from "noteynotes";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import CountdownContainer from "~/components/CountdownContainer";
import KeyboardInput from "~/midi/KeyboardInput";
import PedalDetector from "~/midi/PedalDetector";
import { RandomContext } from "~/util/RandomProvider";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

enum GameState {
  GUESSING = 0,
  CORRECT = 1,
  INCORRECT = 2,
}

/**
 * Returns the lowest note that is the root of the given chord,
 * or undefined if no such note was played (i.e. in the note list).
 * Assumes the list is sorted.
 */
const getRootFromPerformance = (noteList: Note[], chord: Chord) =>
  noteList.find(n => noteIdentity(n) === noteIdentity(chord.root))

export default function PlayChords() {
  const random = useContext(RandomContext)
  const { chooseChord } = useMemo(
    () => getMakeFlavourChoice(AllTriadic, ALL_CHORDS, random),
    []
  )

  const allowExtensions = true
  const [pedal, setPedal] = useState<boolean>(false)
  const [noteList, setNoteList] = useState<Note[]>([])
  const [gameState, setGameState] = useState<GameState>(GameState.GUESSING)
  const [chord, setChord] = useState<Chord>(chooseChord())

  const isNoteCorrect = (note: Note, rootNote?: Note) => {
    const midiNote = noteToMidi(note)
    const midiRootNote = rootNote !== undefined ? noteToMidi(rootNote) : undefined

    if (allowExtensions && midiRootNote && midiNote > midiRootNote + OCTAVE_SIZE) {
      // we can treat anything more than an octave above the root note as
      // a creative decision by the user (an extension)
      // these notes are neither correct nor incorrect
      return undefined
    }

    if (midiRootNote && midiNote < midiRootNote) {
      // this must be the bass note to be correct
      if (!chord.bass) return false
      return noteIdentity(note) === noteIdentity(chord.bass)
    }

    return chord.containsNote(note)

  }

  const noteDiscriminant = useCallback(
    (note: Note) => isNoteCorrect(note, getRootFromPerformance(noteList, chord)),
    [noteList, chord]
  )

  const submitAnswer = (notes: Note[]) => {
    setNoteList(notes)
    const rootNote = getRootFromPerformance(noteList, chord)
    const isCorrect = notes.every(note => isNoteCorrect(note, rootNote) !== false)
    setGameState(isCorrect ? GameState.CORRECT : GameState.INCORRECT)
  }

  const nextChord = () => {
    setChord(chooseChord())
    setGameState(GameState.GUESSING)
    setNoteList([])
  }

  return (
    <OneUpContainer>
      <div className="flex flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl">
            Perform
          </h1>
          <h2 className="text-sm">
            PLAY CHORDS
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button
            size="lg"
            color="danger"
          >
            End session
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 w-96 min-h-24 my-8 mx-auto items-center">
        <div className="align-middle">
          <h2 className="text-6xl border-b-3 border-dotted inline border-blue-400">
            {chord.forDisplay()}
          </h2>
          <p className="mt-4 font-extralight">Play this chord.</p>
        </div>
        <div className="align-middle">
          {gameState === GameState.CORRECT && (
            <p>Correct!</p>
          )}
          {gameState === GameState.INCORRECT && (
            <p>Incorrect.</p>
          )}
          {gameState !== GameState.GUESSING && (
            <CountdownContainer onCountdownReached={nextChord} isPaused={pedal}>
              <p className="text-sm">Advancing to next chord...</p>
            </CountdownContainer>
          )}
        </div>
      </div>

      <PedalDetector
        onHoldStateChanged={setPedal}
        onTap={numTaps => console.log(`Tapped ${numTaps} time(s)`)}
      />

      {gameState === GameState.GUESSING && (
        <KeyboardInput
          minNotes={3}
          onFinalize={submitAnswer}
          onNoteAdded={(_, nl) => setNoteList(nl)}
          onIdle={() => console.log("Idle!")}
        />
      )}

      <div className="mt-4">
        <Piano
          highlighted={noteList}
          isHighlightedNoteCorrect={gameState !== GameState.GUESSING ? noteDiscriminant : undefined}
        />
      </div>
    </OneUpContainer>
  );
}
