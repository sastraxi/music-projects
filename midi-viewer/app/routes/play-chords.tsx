import { Button } from "@nextui-org/button";
import { ALL_CHORDS, AllTriadic, Chord, getMakeFlavourChoice, Note, noteForDisplay, noteIdentity, noteToMidi, OCTAVE_SIZE, unique } from "noteynotes";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import CountdownContainer from "~/components/CountdownContainer";
import { noteSetToList } from "~/midi";
import KeyboardInput from "~/midi/KeyboardInput";
import PedalDetector from "~/midi/PedalDetector";
import { debounce, range } from "~/util";
import { ALLOW_ADDITIONAL_EXTENSIONS, getGoalNotes, interpretPerformance, isCorrect, PerformedChord } from "~/util/performance";
import { RandomContext } from "~/util/RandomProvider";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

/**
 * Extra time between when we reach the threshold number of notes
 * and when we score the answer given by the user.
 */
const FINALIZATION_DEBOUNCE_MS = 300

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

  const [chord, setChordInner] = useState<Chord>(Chord.lookup("Fm11"))
  const [performedChord, setPerformedChord] = useState<PerformedChord>()
  const [gameState, setGameState] = useState<GameState>(GameState.GUESSING)
  const [pedal, setPedal] = useState<boolean>(false)
  const [noteList, setNoteList] = useState<Note[]>([])

  const isGuessing = gameState === GameState.GUESSING

  const setChord = useCallback((newChord: Chord) => {
    console.log('setting chord', newChord.forDisplay())
    setChordInner(newChord)
  }, [setChordInner])

  // TODO: remove this function
  const isNoteCorrect = (note: Note, rootNote?: Note) => {
    const midiNote = noteToMidi(note)
    const midiRootNote = rootNote !== undefined ? noteToMidi(rootNote) : undefined

    if (midiRootNote && midiNote < midiRootNote) {
      // this must be the bass note to be correct
      return noteIdentity(note) === noteIdentity(chord.bass ?? chord.root)
    }

    if (chord.containsNote(note)) {
      return true
    }

    const maxExtension = chord.extensions.length > 0 ? chord.extensions[chord.extensions.length - 1] : OCTAVE_SIZE
    if (ALLOW_ADDITIONAL_EXTENSIONS && midiRootNote && midiNote > midiRootNote + maxExtension) {
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

  // FIXME: build off performedChord
  const correctNotes = useMemo(
    () => {
      if (!performedChord) return undefined
      return noteList.filter(note => isNoteCorrect(note, performedChord.root) === true)
    },
    [noteList, performedChord],
  )

  // FIXME: build off performedChord
  const incorrectNotes = useMemo(
    () => {
      if (!performedChord) return undefined
      return noteList.filter(note => isNoteCorrect(note, performedChord.root) === false)
    },
    [noteList, performedChord],
  )

  const goalNotes = useMemo(
    () => performedChord ? getGoalNotes(performedChord, chord) : undefined,
    [performedChord],
  )

  /**
   * Debounced submitAnswer allows us to wait for any additional notes
   * to be played right after we hit the threshold.
   */
  const submitAnswer = useCallback(
    debounce(
      (notes: Note[], target: Chord) => {
        console.log('answer submitted for', target.forDisplay(), '\nnotes are', notes)
        console.log('ground truth:', target.getBasicNotes())
    
        const performed = interpretPerformance(notes, target)
        setGameState(isCorrect(performed, target) ? GameState.CORRECT : GameState.INCORRECT)
        setPerformedChord(performed)

      },
      FINALIZATION_DEBOUNCE_MS
    ),
    [setGameState, setPerformedChord]
  )

  /**
   * Submits an answer when we have enough notes and the pedal is not down.
   */
  useEffect(() => {
    if (!isGuessing) return
    if (pedal) return
    if (noteList.length < minNotes) return
    submitAnswer(noteList, chord)
  }, [noteList, isGuessing, pedal, chord])

  const addNote = useCallback(
    (note: Note) => {
      if (!isGuessing) return
      setNoteList(currentSet => noteSetToList(new Set(currentSet).add(note)))
    },
    [setNoteList, isGuessing]
  )

  const nextChord = () => {
    setChord(chooseChord())
    setGameState(GameState.GUESSING)
    setPerformedChord(undefined)
    setNoteList([])
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
          <h1 className="text-xs font-extralight">
            PERFORM
          </h1>
          <h2 className="text-2xl">
            Chords
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button
            size="md"
            color="danger"
          >
            End session
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-2 min-h-24 my-8 mx-32 items-center place-items-center">
        <div className="py-16">
          <h2 className="text-7xl border-b-3 border-dotted inline border-blue-400">
            {chord.forDisplay()}
          </h2>
          <p className="mt-8 text-xl font-extralight">
            Play this chord ({minNotes} notes).
          </p>
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

      <KeyboardInput onNoteDown={addNote} />

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
