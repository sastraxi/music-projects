import { MIDISoundPlayer } from 'midi-sounds-react'
import { useMemo } from 'react'

import PlayButton from '~/audio/PlayButton'
import Choice from '~/components/Choice'
import ChordDiagram from '~/components/ChordDiagram'
import './ChordInput.css'

import { Chord, RootAndSuffix, frettingToVexChord, getFrettings, getRomanNumeral, untransformAccidentals } from 'noteynotes'
import { firstNDigits } from '~/util'

///////////////////////////

const VARIANT_NUMBERS = "①②③④⑤⑥⑦⑧⑨⑩"

///////////////////////////

export const SOURCE_SET_CHOICES = [
  '✨', '🔑', '🧲'
] as const
export type SourceSetChoices = typeof SOURCE_SET_CHOICES[number]

const sourceSetExpandedTransform = (keyName: string) => (sourceSet: SourceSetChoices) => {
  if (sourceSet === '✨') return '✨ All chords'
  if (sourceSet === '🧲') return `🧲 Same base triad`
  return `🔑 Chords in ${keyName}`
}

///////////////////////////

export type ChordChoice = {
  chord: RootAndSuffix,
  locked: boolean,
  variant: number,
  sourceSet?: SourceSetChoices,
}

type Props = {
  keyName: string
  choice: ChordChoice
  selectableChords: RootAndSuffix[]
  modifyChord: (changes: Partial<ChordChoice>) => void
  sourceSetOptions?: Array<SourceSetChoices>
  player?: MIDISoundPlayer
}

const dimmedIf = (exactlyMatches: string) =>
  (x: string) => <span className={x === exactlyMatches ? 'dimmed' : ''}>{x}</span>

const ChordInput = ({
  keyName,
  choice,
  sourceSetOptions = [...SOURCE_SET_CHOICES],
  selectableChords,
  modifyChord,
  player,
}: Props) => {

  const frettings = useMemo(() => getFrettings(choice.chord), [choice])
  const vexChord = useMemo(() => frettingToVexChord(
    frettings[Math.min(choice.variant, frettings.length - 1)],
    {
      showOctave: false,
      keyName,
    }
  ), [keyName, choice, frettings])

  console.log('---key---', keyName)
  const romanNumeral = getRomanNumeral(keyName, choice.chord)
  const sourceSetTransform = sourceSetExpandedTransform(keyName)

  return (
    <div className="chord">
      <div className="buttons">
        <Choice
          help="Locked? (prevents shuffle)"
          setChoice={icon => modifyChord({ locked: icon === '🔒' })}
          current={choice.locked ? '🔒' : '🔓'}
          allChoices={['🔓', '🔒']}
          displayTransform={dimmedIf('🔓')}
          tapToChange
        />
        {sourceSetOptions.length > 1 &&
          <Choice
            help={sourceSetTransform(choice.sourceSet!)}
            setChoice={sourceSet => modifyChord({ sourceSet })}
            current={choice.sourceSet!}
            allChoices={sourceSetOptions}
            expandedDisplayTransform={sourceSetTransform}
            tapToChange
          />
        }
        <Choice
          help="Variant"
          setChoice={variant => modifyChord({ variant })}
          current={Math.min(choice.variant, frettings.length - 1)}
          allChoices={firstNDigits(frettings.length)}
          displayTransform={x => VARIANT_NUMBERS[x]}
          tapToChange
        />
      </div>
      <ChordDiagram
        width={320}
        height={400}
        {...vexChord}
      />
      <h2>
        {player && (
          <PlayButton
            player={player}
            instrument={276}
            notes={vexChord.notes}
            strumDurationMs={500}
            strumDown={true}
            activeDurationMs={1500}
          />
        )}
        <Choice
          alignItems="center"
          current={choice.chord}
          displayTransform={chord => Chord.lookup(chord).forDisplay({ keyName })}
          allChoices={selectableChords}
          setChoice={chord => modifyChord({ chord })}
          searchTransform={chord => untransformAccidentals(Chord.lookup(chord).forDisplay({ keyName })).replace(' ', '')}
        />
        <span className="numeral">
          {romanNumeral}
        </span>
      </h2>
    </div>
  )
}

export default ChordInput
