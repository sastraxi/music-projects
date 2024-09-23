import { Note, noteFromMidi, noteToMidi } from "noteynotes"
import { useMemo } from "react"

// lg + sm == D == BLACK_WIDTH + gap
// 2*md == D == BLACK_WDITH + gap

// changeable
const GAP = 2.5
const RADIUS = 2
const WHITE_WIDTH = 19
const WHITE_HEIGHT = 85
const BLACK_WIDTH = 9
const BLACK_HEIGHT = 55
const _SM_RATIO = 0.4

// depenent on above, do not change!
const _LG_RATIO = (1 - _SM_RATIO)
const MD = 0.5 * (BLACK_WIDTH + GAP)
const LG = _LG_RATIO * (BLACK_WIDTH + GAP)
const SM = _SM_RATIO * (BLACK_WIDTH + GAP)

const Arc = (dir: 'cw' | 'ccw', x: number, y: number) =>
  `A ${RADIUS} ${RADIUS} 0 0 ${dir === 'ccw' ? 0 : 1} ${x} ${y}`

const PATHS = {
  // C and F
  w0: `
    M 0 ${RADIUS}
    ${Arc('cw', RADIUS, 0)}
    L ${WHITE_WIDTH - LG - RADIUS} 0
    ${Arc('cw', WHITE_WIDTH - LG, RADIUS)}
    L ${WHITE_WIDTH - LG} ${BLACK_HEIGHT}
    L ${WHITE_WIDTH - RADIUS} ${BLACK_HEIGHT}
    ${Arc('cw', WHITE_WIDTH, BLACK_HEIGHT + RADIUS)}
    L ${WHITE_WIDTH} ${WHITE_HEIGHT - RADIUS}
    ${Arc('cw', WHITE_WIDTH - RADIUS, WHITE_HEIGHT)}
    L ${RADIUS} ${WHITE_HEIGHT}
    ${Arc('cw', 0, WHITE_HEIGHT - RADIUS)}
    Z
  `,
  // D
  w1: `
    M ${SM} ${RADIUS}
    ${Arc('cw', SM + RADIUS, 0)}
    L ${WHITE_WIDTH - SM - RADIUS} 0
    ${Arc('cw', WHITE_WIDTH - SM, RADIUS)}
    L ${WHITE_WIDTH - SM} ${BLACK_HEIGHT}
    L ${WHITE_WIDTH - RADIUS} ${BLACK_HEIGHT}
    ${Arc('cw', WHITE_WIDTH, BLACK_HEIGHT + RADIUS)}
    L ${WHITE_WIDTH} ${WHITE_HEIGHT - RADIUS}
    ${Arc('cw', WHITE_WIDTH - RADIUS, WHITE_HEIGHT)}
    L ${RADIUS} ${WHITE_HEIGHT}
    ${Arc('cw', 0, WHITE_HEIGHT - RADIUS)}
    L 0 ${BLACK_HEIGHT + RADIUS}
    ${Arc('cw', RADIUS, BLACK_HEIGHT)}
    L ${SM} ${BLACK_HEIGHT}
    Z 
  `,
  // E and B
  w2: `
    M ${LG} ${RADIUS}
    ${Arc('cw', RADIUS + LG, 0)}
    L ${WHITE_WIDTH - RADIUS} 0
    ${Arc('cw', WHITE_WIDTH, RADIUS)}
    L ${WHITE_WIDTH} ${WHITE_HEIGHT - RADIUS}
    ${Arc('cw', WHITE_WIDTH - RADIUS, WHITE_HEIGHT)}
    L ${RADIUS} ${WHITE_HEIGHT}
    ${Arc('cw', 0, WHITE_HEIGHT - RADIUS)}
    L ${0} ${BLACK_HEIGHT + RADIUS}
    ${Arc('cw', RADIUS, BLACK_HEIGHT)}
    L ${LG} ${BLACK_HEIGHT}
    Z 
  `,
  // G
  w3: `
    M ${SM} ${RADIUS}
    ${Arc('cw', SM + RADIUS, 0)}
    L ${WHITE_WIDTH - MD - RADIUS} 0
    ${Arc('cw', WHITE_WIDTH - MD, RADIUS)}
    L ${WHITE_WIDTH - MD} ${BLACK_HEIGHT}
    L ${WHITE_WIDTH - RADIUS} ${BLACK_HEIGHT}
    ${Arc('cw', WHITE_WIDTH, BLACK_HEIGHT + RADIUS)}
    L ${WHITE_WIDTH} ${WHITE_HEIGHT - RADIUS}
    ${Arc('cw', WHITE_WIDTH - RADIUS, WHITE_HEIGHT)}
    L ${RADIUS} ${WHITE_HEIGHT}
    ${Arc('cw', 0, WHITE_HEIGHT - RADIUS)}
    L 0 ${BLACK_HEIGHT + RADIUS}
    ${Arc('cw', RADIUS, BLACK_HEIGHT)}
    L ${SM} ${BLACK_HEIGHT}
    Z 
  `,
  // A
  w4: `
    M ${MD} ${RADIUS}
    ${Arc('cw', MD + RADIUS, 0)}
    L ${WHITE_WIDTH - SM - RADIUS} 0
    ${Arc('cw', WHITE_WIDTH - SM, RADIUS)}
    L ${WHITE_WIDTH - SM} ${BLACK_HEIGHT}
    L ${WHITE_WIDTH - RADIUS} ${BLACK_HEIGHT}
    ${Arc('cw', WHITE_WIDTH, BLACK_HEIGHT + RADIUS)}
    L ${WHITE_WIDTH} ${WHITE_HEIGHT - RADIUS}
    ${Arc('cw', WHITE_WIDTH - RADIUS, WHITE_HEIGHT)}
    L ${RADIUS} ${WHITE_HEIGHT}
    ${Arc('cw', 0, WHITE_HEIGHT - RADIUS)}
    L 0 ${BLACK_HEIGHT + RADIUS}
    ${Arc('cw', RADIUS, BLACK_HEIGHT)}
    L ${MD} ${BLACK_HEIGHT}
    Z 
  `,
  // all black keys
  b: `
    M 0 0
    L ${BLACK_WIDTH} 0
    L ${BLACK_WIDTH} ${BLACK_HEIGHT - GAP}
    L ${0} ${BLACK_HEIGHT - GAP}
    Z
  `,
}

type PianoKeyProps = {
  piece: keyof typeof PATHS
  x: number
  borderColor?: string
  fillColor?: string
  onClick?: () => void
  extraStyle?: React.CSSProperties
}

const PianoKey = ({
  piece,
  x,
  borderColor,
  fillColor,
  extraStyle = {},
  onClick,
}: PianoKeyProps) => (
  <path
    onClick={onClick}
    style={extraStyle}
    className={onClick ? "cursor-pointer" : undefined}
    fill={fillColor}
    stroke={borderColor}
    transform={`translate(${x}, 0)`}
    d={PATHS[piece]}
  />
)
 
export type PianoProps = {
  /**
   * The lowest note rendered by the keyboard. Defaults to E1
   */
  lowest?: Note
  /**
   * The highest note rendered by the keyboard. Defaults to G7
   */
  highest?: Note
  /**
   * Which notes should be highlighted, if any?
   */
  highlighted?: Note[]
  /**
   * If provided, highlighted notes are shown as correct / incorrect
   * depending on the output of this function. You can return undefined
   * to indicate a note is neither correct or incorrect (indeterminate),
   * in which case the highlight colour is the same as if this prop
   * was not provided.
   */
  isHighlightedNoteCorrect?: (note: Note) => boolean | undefined
  onClick?: (note: Note) => void
}

const F1 = noteToMidi("F1")

const PIANO_OCTAVE_F_TO_F: [keyof typeof PATHS, number][] = [
  ['w0', 0],                              // F 
  ['b', WHITE_WIDTH + GAP - LG],          // F# / Gb
  ['w3', WHITE_WIDTH + GAP],              // G 
  ['b', 2 * (WHITE_WIDTH + GAP) - MD],    // G# / Ab
  ['w4', 2 * (WHITE_WIDTH + GAP)],        // A
  ['b', 3 * (WHITE_WIDTH + GAP) - SM],    // A# / Bb
  ['w2', 3 * (WHITE_WIDTH + GAP)],        // B
  ['w0', 4 * (WHITE_WIDTH + GAP)],        // C
  ['b', 5 * (WHITE_WIDTH + GAP) - LG],    // C# / Db
  ['w1', 5 * (WHITE_WIDTH + GAP)],        // D
  ['b', 6 * (WHITE_WIDTH + GAP) - SM],    // D# / Eb
  ['w2', 6 * (WHITE_WIDTH + GAP)],        // E
]

const OCTAVE_WIDTH = 7 * (WHITE_WIDTH + GAP)

const isBlackKey = (midiNote: number): boolean => {
  const [piece, _] = PIANO_OCTAVE_F_TO_F[(midiNote - F1) % 12]
  return piece === 'b'
}

type RenderData = {
  keys: JSX.Element[],
  minX: number
  maxX: number
}

const noteColour = (isBlack: boolean, isHighlighted: boolean, isCorrect?: boolean): string => {
  if (!isHighlighted) {
    return isBlack ? "#121212" : "#1f1f1f"
  } else if (isCorrect === true) {
    return isBlack ? "#82f496" : "#affbb8"
  } else if (isCorrect === false) {
    return isBlack ? "#f472b6" : "#fbcfe8"
  }
  // isCorrect === undefined
  return isBlack ? "#b672f4" : "#e8cffb"
}

const Piano = ({
  lowest = "F1",
  highest = "E7",
  highlighted = [],
  isHighlightedNoteCorrect = undefined,
  onClick = undefined,
}: PianoProps) => {

  const lowestKey = noteToMidi(lowest)
  const highestKey = noteToMidi(highest)

  const midiHighlightedSet = useMemo(() => {
    return new Set(highlighted.map(noteToMidi))
  }, [highlighted])

  const { keys, minX, maxX }: RenderData = useMemo(() => {
    const keys = []
    let maxX = -Infinity, minX = Infinity
    for (let key = lowestKey; key <= highestKey; ++key) {
      const isBlack = isBlackKey(key)
      const isHighlighted = midiHighlightedSet.has(key)

      const index = (key - F1)
      const octave = Math.floor(index / 12)
      const [piece, withinOctaveX] = PIANO_OCTAVE_F_TO_F[index % 12]
      
      const x = withinOctaveX + octave * OCTAVE_WIDTH
      const width = isBlack ? BLACK_WIDTH : WHITE_WIDTH
      if (x < minX) minX = x
      if (x + width > maxX) maxX = x + width

      const fill = noteColour(
        isBlack,
        isHighlighted,
        isHighlightedNoteCorrect?.(noteFromMidi(key)),
      )

      keys.push(
        <PianoKey
          key={key}
          piece={piece}
          x={x}
          fillColor={fill}
          onClick={onClick ? () => onClick(noteFromMidi(key)) : undefined}
        />
      )
    }
    return { keys, minX, maxX }
  }, [lowest, highest, midiHighlightedSet])

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox={`${minX - 1} -1 ${maxX + 1} ${WHITE_HEIGHT + 2}`}
      style={{
        userSelect: "none",
      }}
    >
      {keys}
    </svg>
  )
}

export default Piano
