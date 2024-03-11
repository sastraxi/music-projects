import { Button, Card, CardHeader } from "@nextui-org/react";
import { Chord, getRomanNumeral, isDiatonic } from "noteynotes";

const COMMON_CLASSNAMES = `
  ml-2
  pr-[6px]
  absolute
  right-[52px]
  font-sans
`

const IN_KEY_CLASSNAMES = `
  ${COMMON_CLASSNAMES}
  border-2
  border-b-4
  bg-green-700
  border-green-900
  border-t-green-600
  rounded-lg
  text-shadow-sm
  shadow-black
`

const OUT_OF_KEY_CLASSNAMES = `
  ${COMMON_CLASSNAMES}
  mr-[2px]
`

const ChordCard = ({
  chord,
  keyName,
  removeChord,
} : {
  chord: Chord,
  keyName?: string,
  removeChord?: () => void,
}) =>
  <Card className="bg-slate-900 relative">
    <CardHeader className="justify-between">
      <p className="text-2xl text-shadow">
        {chord.forDisplay({ keyName })}
      </p>
      <div className="flex-grow" />
      {keyName && (
        <span className={isDiatonic(chord, keyName) ? IN_KEY_CLASSNAMES : OUT_OF_KEY_CLASSNAMES}>
          &nbsp;{getRomanNumeral(keyName, chord.getRootAndSuffix())}
        </span>)}
      <Button isIconOnly size="sm" title="Delete" onClick={removeChord} className="bg-slate-950 ml-12">
        ✕
      </Button>
    </CardHeader>
  </Card>

export default ChordCard
