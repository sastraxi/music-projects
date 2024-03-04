import { Slider } from "@nextui-org/react";
import { decimal, detectKey, noteForDisplay, noteFromMidi } from "noteynotes";
import { useEffect, useMemo } from "react";
import { useNoteHistogram } from "~/state/note-histogram";

const HISTOGRAM_REFRESH_MS = 1000

const NoteHistogram = ({
  timeOffset
}: {
  timeOffset: number
}) => {
  const { calculate, computed, maximum, reset: resetHistogram } = useNoteHistogram()
  let factor = maximum === 0 ? 1 : (1 / maximum)

  useEffect(() => {
    const intervalId = setInterval(() => {
      calculate(performance.now() + timeOffset)
    }, HISTOGRAM_REFRESH_MS)
    return () => clearInterval(intervalId)
  }, [])

  const guessedKeys = useMemo(() => {
    if (maximum === 0) return []
    return detectKey(computed).slice(0, 5)
  }, [computed])

  if (guessedKeys.length === 0) return <></>

  // TODO: report the key to zustand so places in the UI can use it as displayContext
  // TODO: move key guessing + interval out of react; just subscribe to enable / disable a pure JS thing
  // TODO: highlight notes in best-guess key

  const noteColumns = []
  for (let i = 0; i < 12; ++i) {
    const noteName = noteForDisplay(noteFromMidi(i), { showOctave: false }) 
    noteColumns.push(
      <Slider   
        size="md"
        key={noteName}
        step={0.001} 
        maxValue={1} 
        minValue={0} 
        orientation="vertical"
        aria-label={noteName}
        value={factor * computed[i]}
        endContent={<span className="text-xs">{noteName}</span>}
        hideThumb
        classNames={{
          track: "mx-0 h-12",
          trackWrapper: "mx-[2px]"
        }}
      />
    )
  }

  return (
    <div className="flex flex-row w-full">
      <div className="flex flex-row mr-6">
        {noteColumns}
      </div>
      <div>
        { guessedKeys.length > 0 && (
          <>
            <h1 className="text-2xl" key="first-guess">
              {guessedKeys[0].note} {guessedKeys[0].mode}
              &nbsp;
              <span className="text-gray-500">({decimal(100 * guessedKeys[0].score)}%)</span>
            </h1>
            <span className="text-sm" key="other-guesses">
              {guessedKeys.map((guess, i) => {
                if (i === 0) return
                return (
                  <span key={i}>
                    { (i > 1) ? <span className="text-gray-700 px-1" key={`${i}-em`}>…</span> : '' }
                    <span className="text-gray-500" key={i}>
                      {guess.note} {guess.mode} ({decimal(100 * guess.score)}%)
                    </span>
                  </span>
                )    
              })}
            </span>
          </>
        )}
      </div>
      {/* <div className="grow" /> */}
    </div>
  )
}

export default NoteHistogram
