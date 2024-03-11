import { Slider } from "@nextui-org/slider";
import { decimal, keyEq, keyForDisplay, toKeyName, noteForDisplay, noteFromMidi, inKeyPredicate, normalizedNoteName, stripOctave } from "noteynotes";
import { useEffect, useMemo } from "react";
import { useKey } from "~/state/key";
import { useNoteHistogram } from "~/state/note-histogram";
import ErrorBar from "~/view/ErrorBar";

const HISTOGRAM_REFRESH_MS = 1000
const ERROR_EXP = 0.6

const DetectedKey = ({
  timeOffset
}: {
  timeOffset: number
}) => {
  const { calculate, computed, maximum } = useNoteHistogram()
  let factor = maximum === 0 ? 1 : (1 / maximum)
  const { chosenKey, guessedKeys } = useKey()

  useEffect(() => {
    const intervalId = setInterval(() => {
      calculate(performance.now() + timeOffset)
    }, HISTOGRAM_REFRESH_MS)
    return () => clearInterval(intervalId)
  }, [])

  const noteColumns = []

  /**
   * Is a given note in our current key?
   */
  const inKey = useMemo(() => {
    if (!chosenKey) return () => true  // no key --> no errors
    return inKeyPredicate(toKeyName(chosenKey))
  }, [chosenKey])

  let error = 0
  let errorDenominator = 0
  for (let i = 0; i < 12; ++i) {
    const noteName = noteForDisplay(noteFromMidi(i), {
      showOctave: false,
      keyName: chosenKey ? toKeyName(chosenKey) : undefined
    })

    // FIXME: next line is hacky
    const isKeyRoot = chosenKey ? normalizedNoteName(chosenKey.note) === normalizedNoteName(stripOctave(noteFromMidi(i))) : false
    const noteInKey = inKey(noteFromMidi(i))
    errorDenominator += computed[i]
    if (!noteInKey) {
      error += computed[i]
    }

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
        endContent={
          <span className={`text-xs font-medium ${noteInKey ? '' : 'opacity-50'} ${isKeyRoot ? 'underline' : ''}`}>
            {noteName}
          </span>
        }
        hideThumb
        classNames={{
          track: "mx-0 h-12",
          trackWrapper: "mx-[2px]",
        }}
      />
    )
  }

  // FIXME: figure out something more grounded in reality
  const calculatedError = Math.pow(error / errorDenominator, ERROR_EXP)

  const hasGuess = guessedKeys && guessedKeys?.length > 0
  const chosenIndex = chosenKey ? guessedKeys?.findIndex(x => keyEq(x, chosenKey)) ?? -1 : -1

  return (
    <div className="flex flex-row w-full">
      <div className="flex flex-row mr-6">
        {noteColumns}
      </div>
      <div>
        { chosenKey && (
          <h1 className="text-2xl -mt-2" key="chosen-key">
            {keyForDisplay(chosenKey)}
            {/* the match % is meaningless in the chosen key; need to grab from the array if it's there */}
            {/* TODO: save chosenKey without percentage match */}
            <span className="text-gray-400 font-thin">&nbsp;{
              chosenIndex !== -1 && guessedKeys
                ? `(${decimal(100 * guessedKeys[chosenIndex].score)}%)`
                : "(--)"
              }
            </span>
          </h1>
        )}
        <div className="text-sm mt-1">
          {!hasGuess && <span>&nbsp;</span>}
          {guessedKeys?.filter((_, i) => i !== chosenIndex).map((guess, i) => {
            return (
              <span key={i}>
                { (i > 0) ? <span className="text-gray-600 font-medium px-1" key={`${i}-em`}>…</span> : '' }
                <span className="text-gray-400" key={i}>
                  {keyForDisplay(guess)} ({decimal(100 * guess.score)}%)
                </span>
              </span>
            )    
          })}
        </div>
        { chosenKey &&
          <div className="mt-4">
            <ErrorBar amount={calculatedError} />
          </div>
        }
      </div>
    </div>
  )
}

export default DetectedKey
