import { Button } from "@nextui-org/button";
import { ALL_CHORDS, AllTriadic, Chord, getMakeFlavourChoice, Note, noteForDisplay, noteIdentity, noteToMidi, OCTAVE_SIZE, unique } from "noteynotes";
import { useContext, useMemo, useState } from "react";
import CountdownContainer from "~/components/CountdownContainer";
import KeyboardInput from "~/midi/KeyboardInput";
import PedalDetector from "~/midi/PedalDetector";
import { range } from "~/util";
import { ALLOW_ADDITIONAL_EXTENSIONS, getGoalNotes, interpretPerformance, isCorrect, PerformedChord } from "~/util/performance";
import { RandomContext } from "~/util/RandomProvider";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

enum GameState {
  GUESSING = 0,
  CORRECT = 1,
  INCORRECT = 2,
}

export default function PlayChords() {
  const random = useContext(RandomContext)
  const { chooseChord } = useMemo(
    () => getMakeFlavourChoice(AllTriadic, ALL_CHORDS, random),
    []
  )

  const [chord, setChord] = useState<Chord>(Chord.lookup("Am7"))
  const [performedChord, setPerformedChord] = useState<PerformedChord>()
  const [gameState, setGameState] = useState<GameState>(GameState.GUESSING)
  const [pedal, setPedal] = useState<boolean>(false)
  const [noteList, setNoteList] = useState<Note[]>([])

  const isGuessing = gameState === GameState.GUESSING

  const isNoteCorrect = (note: Note, rootNote?: Note) => {
    const midiNote = noteToMidi(note)
    const midiRootNote = rootNote !== undefined ? noteToMidi(rootNote) : undefined

    if (midiRootNote && midiNote < midiRootNote) {
      // this must be the bass note to be correct
      if (!chord.bass) return false
      return noteIdentity(note) === noteIdentity(chord.bass)
    }

    if (chord.containsNote(note)) return true

    if (ALLOW_ADDITIONAL_EXTENSIONS && midiRootNote && midiNote > midiRootNote + OCTAVE_SIZE) {
      // we can treat anything more than an octave above the root note as
      // a creative decision by the user (an extension)
      // these notes are neither correct nor incorrect
      return undefined
    }

    return false
  }

  const minNotes = useMemo(
    () => chord.getBasicNotes().length,
    [chord]
  )

  const correctNotes = useMemo(
    () => {
      if (!performedChord) return undefined
      return noteList.filter(note => isNoteCorrect(note, performedChord.root) === true)
    },
    [performedChord],
  )

  const incorrectNotes = useMemo(
    () => {
      if (!performedChord) return undefined
      return noteList.filter(note => isNoteCorrect(note, performedChord.root) === false)
    },
    [performedChord],
  )

  const goalNotes = useMemo(
    () => {
      if (!performedChord) return undefined
      return getGoalNotes(performedChord, chord)
    },
    [performedChord],
  )

  const submitAnswer = (notes: Note[]) => {
    const performedChord = interpretPerformance(notes, chord)
    setGameState(isCorrect(performedChord, chord) ? GameState.CORRECT : GameState.INCORRECT)
    setPerformedChord(performedChord)
    setNoteList(notes)
    console.log(isCorrect(performedChord, chord), performedChord)
  }

  const nextChord = () => {
    setChord(chooseChord())
    setGameState(GameState.GUESSING)
    setNoteList([])
    setPerformedChord(undefined)
  }

  const feedbackTable = useMemo(() => {
    if (!performedChord) return undefined

    // left column: things we played we shouldn't have played
    const incorrectFeedback: string[] = []
    if (performedChord.bass && noteIdentity(performedChord.bass) !== noteIdentity(chord.bass ?? chord.root)) {
      incorrectFeedback.push(`❌ ${noteForDisplay(performedChord.bass)} is not the bass note.`)
    }
    incorrectFeedback.push(...performedChord
      .accidentals
      .map((playedNote) => `❌ ${noteForDisplay(playedNote)} is not in chord.`))


    // right column: things we should have played that we didn't
    const missingFeedback: string[] = []
    if (!performedChord.bass && chord.bass) {
      missingFeedback.push(`❓ ${noteForDisplay(chord.bass!)} missing.`)
    }
    missingFeedback.push(...performedChord
      .missing
      .map(missingNote => `❓ ${noteForDisplay(missingNote)} missing.`))

    return (
      <table className="text-sm">
        <tbody>
          {range(Math.max(incorrectFeedback.length, missingFeedback.length)).map((i) => (
            <tr key={i}>
              <td>{incorrectFeedback[i]}</td>
              <td>{missingFeedback[i]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    )
  }, [performedChord])

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

      <div className="grid gap-4 grid-cols-2 min-h-24 my-8 mx-32 items-center place-items-center">
        <div className="py-8">
          <h2 className="text-6xl border-b-3 border-dotted inline border-blue-400">
            {chord.forDisplay()}
          </h2>
          <p className="mt-4 font-extralight">Play this chord.</p>
        </div>
        <div>
          {gameState === GameState.CORRECT && (
            <p>Correct!</p>
          )}
          {gameState === GameState.INCORRECT && (
            <>
              <p>Incorrect.</p>
              {feedbackTable}
            </>
          )}
          {!isGuessing && (
            <CountdownContainer onCountdownReached={nextChord} isPaused={pedal} />
          )}
        </div>
      </div>

      <PedalDetector
        onHoldStateChanged={setPedal}
        onTap={(numTaps) => numTaps === 2 && nextChord()}
      />

      {isGuessing && (
        <KeyboardInput
          minNotes={minNotes}
          onFinalize={submitAnswer}
          onNoteAdded={(_, nl) => setNoteList(nl)}
        />
      )}

      <div>
        <Piano
          highlighted={noteList}
          correct={isGuessing ? undefined : correctNotes}
          incorrect={isGuessing ? undefined : incorrectNotes}
          goal={isGuessing ? undefined : goalNotes}
        />
      </div>
    </OneUpContainer>
  );
}
