import { nameInterval, Note, noteForDisplay, noteToMidi, OCTAVE_SIZE } from "noteynotes";
import { useEffect, useMemo, useState } from "react";
import { capitalize } from "~/util";

export enum QuestionType {
  NOTE = 0,
  INTERVAL = 1,
  SEMITONES = 2
}

export type Question = {
  goal: Note
  type: QuestionType
}

export type Answer = {
  questionType: QuestionType
  startNote: Note
  chosenNote: Note
  isCorrect: boolean
  timeTakenMs: number
}

export type QuestionProps = {
  question: Question,
  answer?: Answer,
  anchorNote: Note
}

const Spinner = ({
  char = '⋅',
  maxDots = 3,
  speedMs = 750
}: {
  char?: string,
  maxDots?: number,
  speedMs?: number,
}) => {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const id = window.setInterval(
      () => setDots(dots => (dots + 1) % (maxDots + 1)),
      speedMs
    )
    return () => window.clearInterval(id)
  }, [maxDots])

  // XXX: pr-1 lines up with emojis
  return (<span className="pr-1">{char.repeat(dots)}</span>)
}

export const QuestionRow = ({
  question,
  answer,
  anchorNote,
}: QuestionProps) => {
  const { goal, type } = question
  const semitones = noteToMidi(goal) - noteToMidi(anchorNote)

  const up = semitones > 0
  const dirText = up ? 'up' : 'down'
  const text = useMemo(() => {
    if (type === QuestionType.NOTE) {
      return `${capitalize(dirText)} to ${noteForDisplay(goal, { showOctave: true })}`
    } else if (type === QuestionType.INTERVAL) {
      return `${capitalize(nameInterval(semitones))} ${dirText}`
    } else {
      const absSemitones = Math.abs(semitones)
      const isSingular = absSemitones === 1
      return `${absSemitones} semitone${isSingular ? '' : 's'} ${dirText}`
    }
  }, [semitones, type, goal])

  // FIXME: when >9999ms, table layout breaks
  return (
    <tr className="w-full">
      <td className="px-2">{up ? '⬆️' : '⬇️'}</td>
      <td className="w-full">{text}</td>
      <td className="min-w-12 text-xs">
        {answer && `${Math.floor(answer.timeTakenMs)} ms`}
      </td>
      <td className="px-2">
        {answer && (answer.isCorrect ? '✅' : '❌')}
        {!answer && <Spinner />}
      </td>
    </tr>
  )

}

