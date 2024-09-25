import { Button } from "@nextui-org/button";
import { Note, noteForDisplay, noteFromMidi, noteToMidi, OCTAVE_SIZE } from "noteynotes";
import { useCallback, useContext, useMemo, useState } from "react";
import CarouselRevealer from "~/components/CarouselRevealer";
import { Answer, Question, QuestionRow, QuestionType } from "~/game/NoteIntervalQuestion";
import KeyboardInput from "~/midi/KeyboardInput";
import { constrain, range } from "~/util";
import { RandomContext } from "~/util/RandomProvider";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

const EPSILON = 1e-10

const MIN_NOTE = "F2"
const MAX_NOTE = "E6"
const CENTER_NOTE = "C4"
const STANDARD_DEVIATION = 0.2 * OCTAVE_SIZE

const NUM_QUESTIONS = 20

/**
 * An interactive game where the user must play the correct note
 * relative to their current note.
 */
export default function PlayNotesIntervals() {
  const random = useContext(RandomContext)
  const [currentNote, setCurrentNote] = useState<Note>(CENTER_NOTE)
  const [questionIndex, setQuestionIndex] = useState<number>(0)
  const [shownAt, setShownAt] = useState(performance.now())
  const [answers, setAnswers] = useState<Answer[]>([])

  /**
   * Generates a pair of normally-distributed numbers.
   * https://bjlkeng.io/posts/sampling-from-a-normal-distribution/
   */
  const boxMuller = useCallback((): [number, number] => {
    let u1 = 0, u2 = 0
    while (u1 < EPSILON || u2 < EPSILON) {
      u1 = random.float()
      u2 = random.float()
    }
    return [
      Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2),
      Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2)
    ]
  }, [random])

  const questions = useMemo(() => {
    const min = noteToMidi(MIN_NOTE), max = noteToMidi(MAX_NOTE)
    const questions: Question[] = []
    for (let i = 0; i < NUM_QUESTIONS; ++i) {
      const lastNoteMidi = noteToMidi(questions.length === 0 ? CENTER_NOTE : questions[questions.length - 1].goal)
      
      // make sure we pick a new note and that
      // it is close enough to the previous one
      let goalMidi = lastNoteMidi
      while (goalMidi === lastNoteMidi || Math.abs(goalMidi - lastNoteMidi) >= OCTAVE_SIZE * 2) {
        const [sample] = boxMuller()
        goalMidi = constrain(Math.round(lastNoteMidi + (sample * STANDARD_DEVIATION)), min, max)
      }

      questions.push({
        goal: noteFromMidi(goalMidi),
        type: random.choice([QuestionType.NOTE, QuestionType.INTERVAL, QuestionType.SEMITONES]),
      })
    }
    return questions
  }, [])

  const isSessionFinished = questionIndex === questions.length

  const addAnswer = useCallback((chosenNote: Note) => {
    if (isSessionFinished) return
    const now = performance.now()
    const timeTakenMs = now - shownAt
    const question = questions[questionIndex]
    setAnswers(answers => [...answers, {
      questionType: question.type,
      startNote: currentNote,
      chosenNote,
      isCorrect: noteToMidi(chosenNote) === noteToMidi(question.goal),
      timeTakenMs,
    }])
    setQuestionIndex(questionIndex + 1)
    setCurrentNote(chosenNote)
    setShownAt(now)
  }, [shownAt, questions, questionIndex, currentNote])

  const renderQuestionRow = useCallback((index: number) => {
    const item = questions[index]
    const anchorNote = answers[index]?.startNote ?? currentNote
    return (
      <QuestionRow
        key={index}
        anchorNote={anchorNote}
        question={item}
        answer={answers[index]}
      />
    )
  }, [questions, answers, currentNote, questionIndex])

  const playArea = useMemo(() => {
    if (isSessionFinished) {
      return (
        <div className="grid gap-4 grid-cols-1 min-h-24 my-16 mx-32 items-stretch justify-items-stretch place-items-center">
          <h1 className="text-3xl">
            A winner is you!
          </h1>
        </div>
      )
    }
    return (
      <div className="grid gap-4 grid-cols-2 min-h-24 my-8 mx-32 items-stretch justify-items-stretch place-items-center">
        <div className="py-16">
          <h2 className="text-7xl border-b-3 border-dotted inline border-blue-400">
            {noteForDisplay(currentNote, { showOctave: true })}
          </h2>
          <p className="mt-8 text-xl font-extralight">
            Current
          </p>
        </div>
        <div className="relative">
          <CarouselRevealer
            currentIndex={questionIndex}
            totalItems={questions.length}
            renderTableRow={renderQuestionRow}
          />
        </div>
      </div>
    )
  }, [currentNote, questionIndex, questions, answers])

  const highlightedNotes = useMemo(() => {
    if (!isSessionFinished) {
      return [currentNote]
    }
    return []
  }, [questionIndex, questions, currentNote])

  const correctNotes = useMemo(() => {
    if (!isSessionFinished) {
      return []
    }
    return answers
      .filter(a => a.isCorrect)
      .map(a => a.chosenNote)
  }, [questionIndex, questions, answers])

  const incorrectNotes = useMemo(() => {
    if (!isSessionFinished) {
      return []
    }
    return answers
      .filter(a => !a.isCorrect)
      .map(a => a.chosenNote)
  }, [questionIndex, questions, answers])

  const goalNotes = useMemo(() => {
    if (!isSessionFinished) {
      return []
    }
    return range(questions.length)
      .filter(idx => !answers[idx].isCorrect)
      .map(idx => questions[idx].goal)
  }, [questionIndex, questions, answers])

  return (
    <OneUpContainer>
      <div className="flex flex-row justify-between items-center">
        <div>
          <h1 className="text-xs font-extralight">
            P E R F O R M
          </h1>
          <h2 className="text-2xl">
            Notes &amp; Intervals
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

      {playArea}

      <div>
        <KeyboardInput onNoteDown={addAnswer} />
        <Piano
          highlighted={highlightedNotes}
          incorrect={incorrectNotes}
          correct={correctNotes}
          goal={goalNotes}
        />
      </div>
    </OneUpContainer>
  );
}
