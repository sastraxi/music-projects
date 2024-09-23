import { Button } from "@nextui-org/button";
import { ALL_CHORDS, AllTriadic, Chord, detectChords, detectKey, FLAVOUR_CHOICES, getMakeFlavourChoice, Note, noteForDisplay, noteFromMidi, noteToMidi, relativeToFirst, toKeyName } from "noteynotes";
import { useCallback, useEffect, useMemo, useState } from "react";
import CountdownContainer from "~/components/CountdownContainer";
import KeyboardInput from "~/midi/KeyboardInput";
import PedalDetector from "~/midi/PedalDetector";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

enum GameState {
  GUESSING = 0,
  CORRECT = 1,
  INCORRECT = 2,
}

const CHORDS = [
  Chord.lookup("C"),
  Chord.lookup("Dbm"),
  Chord.lookup("Fmmaj7"),
]

export default function PlayChords() {
  const { chooseChord, candidateChords } = useMemo(
    () => getMakeFlavourChoice(AllTriadic, ALL_CHORDS),
    []
  )

  const [pedal, setPedal] = useState<boolean>(false)
  const [noteList, setNoteList] = useState<Note[]>([])
  const [gameState, setGameState] = useState<GameState>(GameState.GUESSING)
  const [chord, setChord] = useState<Chord>(chooseChord())

  const isNoteCorrect = useCallback((note: Note) => {
    return false
  }, [chord, noteList])

  const advanceToFinal = (notes: Note[]) => {
    setNoteList(notes)
    setGameState(GameState.CORRECT)
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
          <h2 className="text-5xl border-b-3 border-dotted inline border-blue-400">
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
          onFinalize={advanceToFinal}
          onNoteAdded={(n, nl) => setNoteList(nl)}
          onIdle={() => console.log("Idle!")}
        />
      )}

      <div className="mt-4">
        <Piano
          highlighted={noteList}
          isHighlightedNoteCorrect={gameState !== GameState.GUESSING ? isNoteCorrect : undefined}
        />
      </div>
    </OneUpContainer>
  );
}
