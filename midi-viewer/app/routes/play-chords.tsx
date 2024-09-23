import { Button } from "@nextui-org/button";
import { ALL_CHORDS, AllTriadic, Chord,  getMakeFlavourChoice, Note, noteForDisplay, noteIdentity, noteToMidi, OCTAVE_SIZE, unique } from "noteynotes";
import { useCallback, useContext, useMemo, useState } from "react";
import CountdownContainer from "~/components/CountdownContainer";
import KeyboardInput from "~/midi/KeyboardInput";
import PedalDetector from "~/midi/PedalDetector";
import { range } from "~/util";
import { RandomContext } from "~/util/RandomProvider";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";


enum GameState {
  GUESSING = 0,
  CORRECT = 1,
  INCORRECT = 2,
}

const CHORD_EXEMPLAR_OCTAVE = 3

/**
 * Returns either the lowest or second-lowest note, depending on
 * whether or not the lowest note is in the core triad of the chord.
 */
const getRootFromPerformance = (noteList: Note[], chord: Chord) => {
  const triadIdentities = chord.getBasicNotes().map(noteIdentity)
  if (noteList.length <= 1 || triadIdentities.includes(noteIdentity(noteList[0]))) {
    return noteList[0]
  } else {
    return noteList[1]
  }
}

// FIXME: the above is flawed. What we want to do is segment the note list into
// [bass? | root | triad | extensions | accidentals]
// --> if first note is not in triad, it's a bass note
// --> if first note is more than an octave away from 2nd note, it's a bass note
// --> find lowest notes for each triad note
// --> based on found root note, look for exact extensions
// --> then everything else is accidentals. Let caller determine if they invalidate the performance.

export default function PlayChords() {
  const random = useContext(RandomContext)
  const { chooseChord } = useMemo(
    () => getMakeFlavourChoice(AllTriadic, ALL_CHORDS, random),
    []
  )

  const allowExtensions = true
  const [chord, setChord] = useState<Chord>(Chord.lookup("A"))
  const [gameState, setGameState] = useState<GameState>(GameState.GUESSING)
  const isGuessing = gameState === GameState.GUESSING

  const chordExemplarNotes = useMemo(
    () => chord.getBasicNotes(CHORD_EXEMPLAR_OCTAVE),
    [chord]
  )
  const chordIdentityNoteSet = useMemo(
    () => unique(chordExemplarNotes.map(noteIdentity)).sort(), 
    [chordExemplarNotes]
  )

  const [pedal, setPedal] = useState<boolean>(false)
  const [noteList, setNoteList] = useState<Note[]>([])

  const isNoteCorrect = (note: Note, rootNote?: Note) => {
    const midiNote = noteToMidi(note)
    const midiRootNote = rootNote !== undefined ? noteToMidi(rootNote) : undefined

    if (midiRootNote && midiNote < midiRootNote) {
      // this must be the bass note to be correct
      if (!chord.bass) return false
      return noteIdentity(note) === noteIdentity(chord.bass)
    }

    if (chord.containsNote(note)) return true

    if (allowExtensions && midiRootNote && midiNote > midiRootNote + OCTAVE_SIZE) {
      // we can treat anything more than an octave above the root note as
      // a creative decision by the user (an extension)
      // these notes are neither correct nor incorrect
      return undefined
    }

    return false
  }

  const correctNotes = useMemo(
    () => noteList.filter(note => isNoteCorrect(note, getRootFromPerformance(noteList, chord)) === true),
    [noteList, chord],
  )

  const incorrectNotes = useMemo(
    () => noteList.filter(note => isNoteCorrect(note, getRootFromPerformance(noteList, chord)) === false),
    [noteList, chord],
  )

  const submitAnswer = (notes: Note[]) => {
    const rootNote = getRootFromPerformance(notes, chord)
    const hasIncorrectNotes = notes.some(note => isNoteCorrect(note, rootNote) === false)
    const noteIdentities = notes.map(noteIdentity)
    const hasAllCorrectNotes = chordIdentityNoteSet.every(id => noteIdentities.includes(id))
    // console.log('temp', rootNote, notes.map(note => isNoteCorrect(note, rootNote)), noteIdentities, chordIdentityNoteSet)
    // console.log('isCorrect', !hasIncorrectNotes, hasAllCorrectNotes)
    const isCorrect = !hasIncorrectNotes && hasAllCorrectNotes
  
    setGameState(isCorrect ? GameState.CORRECT : GameState.INCORRECT)
    setNoteList(notes)
  }

  const nextChord = () => {
    setChord(chooseChord())
    setGameState(GameState.GUESSING)
    setNoteList([])
  }

  const wrongNotes = useMemo(() => {
    if (gameState !== GameState.INCORRECT) return []
  
    const rootNote = getRootFromPerformance(noteList, chord)
    return noteList
      .filter(playedNote => !isNoteCorrect(playedNote, rootNote))
      .map((playedNote) => {
        if (rootNote && noteToMidi(playedNote) < noteToMidi(rootNote) && playedNote === noteList[0]) {
          return `❌ ${noteForDisplay(playedNote)} is not the bass note.`
        }
        return `❌ ${noteForDisplay(playedNote)} is not in chord.`
      })

  }, [chord, gameState])

  const missingNotes = useMemo(() => {
    if (gameState !== GameState.INCORRECT) return []
  
    const noteIdentities = noteList.map(noteIdentity)
    return chordExemplarNotes
      .filter(expectedNote => !noteIdentities.includes(noteIdentity(expectedNote)))
      .map(expectedNote => `❓ ${noteForDisplay(expectedNote)} missing.`)
  }, [chord, gameState])

  const feedbackTable = useMemo(() => (
    <table className="text-sm">
      <tbody>
        {range(Math.max(wrongNotes.length, missingNotes.length)).map((i) => (
          <tr key={i}>
            <td>{wrongNotes[i]}</td>
            <td>{missingNotes[i]}</td>
          </tr>
        ))}
      </tbody>
    </table>
  ), [wrongNotes, missingNotes])

  const chordVisualization = useMemo(() => {
    
  }, [chordExemplarNotes])

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
              {chordVisualization}
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
          minNotes={chordExemplarNotes.length}
          onFinalize={submitAnswer}
          onNoteAdded={(_, nl) => setNoteList(nl)}
        />
      )}

      <div>
        <Piano
          highlighted={noteList}
          correct={isGuessing ? undefined : correctNotes}
          incorrect={isGuessing ? undefined : incorrectNotes}
          goal={isGuessing ? undefined : chordExemplarNotes}
        />
      </div>
    </OneUpContainer>
  );
}
