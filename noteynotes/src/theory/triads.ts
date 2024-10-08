import { Interval, Progression, RomanNumeral, transpose } from "tonal"
import { ChordName, ENHARMONIC_DISPLAY_FOR_KEYNAME, Note, RootAndSuffix, displayAccidentals, explodeChord } from "./common"
import { cumulative, memoize } from "../util"
import { Chord, CHORD_LIBRARY } from "./chords"

/**
 * Number of semitones in the two nonoverlapping sub-intervals that make up a triad.
 */
export type Triad = Readonly<number[]>

// FIXME: is [0, 7], [7, 5], or [7] the best way to do this?
export const POWER_TRIAD: Triad = [7] as const  // yes, it's not a triad. sue me
export const SUS2_TRIAD: Triad = [2, 5] as const
export const SUS4_TRIAD: Triad = [5, 2] as const
export const MINOR_TRIAD: Triad = [3, 4] as const
export const MAJOR_TRIAD: Triad = [4, 3] as const
export const MAJOR_DIM_TRIAD: Triad = [4, 2] as const  // e.g. 9b5
export const DIMINISHED_TRIAD: Triad = [3, 3] as const
export const AUGMENTED_TRIAD: Triad = [4, 4] as const
const DIMINISHED_TRIADS = [DIMINISHED_TRIAD, MAJOR_DIM_TRIAD]

/**
 * Returns the first or second inversion of a given triad.
 */
const inv = (triad: Triad, inversion: 1 | 2): Triad => {
  if (inversion === 1) {
    return [triad[1], 12 - (triad[0] + triad[1])]
  } else {
    return [12 - (triad[0] + triad[1]), triad[0]]
  }
}

export const TRIAD_LIBRARY = {
  '5': [POWER_TRIAD, [5] as const],
  'sus2': [SUS2_TRIAD, inv(SUS2_TRIAD, 1), inv(SUS2_TRIAD, 2)],
  'sus4': [SUS4_TRIAD, inv(SUS4_TRIAD, 1), inv(SUS4_TRIAD, 2)],
  'min': [MINOR_TRIAD, inv(MINOR_TRIAD, 1), inv(MINOR_TRIAD, 2)],
  'maj': [MAJOR_TRIAD, inv(MAJOR_TRIAD, 1), inv(MAJOR_TRIAD, 2)],
  'b5': [MAJOR_DIM_TRIAD, inv(MAJOR_DIM_TRIAD, 1), inv(MAJOR_DIM_TRIAD, 2)],
  'dim': [DIMINISHED_TRIAD, inv(DIMINISHED_TRIAD, 1), inv(DIMINISHED_TRIAD, 2)],
  'aug': [AUGMENTED_TRIAD],
} as const

export type TriadName = keyof typeof TRIAD_LIBRARY

/**
 * Return the three component notes of a given triad starting
 * on a given root note (with or without octave).
 */
export const buildTriad = (rootNote: Note, triad: Triad): Note[] => ([
  rootNote,
  ...cumulative(triad).map(semitones => transpose(rootNote, Interval.fromSemitones(semitones))),
])

const NUMERAL_MAP: Record<string, string> = {
  "I": "Ⅰ",
  "II": "Ⅱ",
  "III": "Ⅲ",
  "IV": "Ⅳ",
  "V": "Ⅴ",
  "VI": "Ⅵ",
  "VII": "Ⅶ",
  "i": "ⅰ",
  "ii": "ⅱ",
  "iii": "ⅲ",
  "iv": "ⅳ",
  "v": "ⅴ",
  "vi": "ⅵ",
  "vii": "ⅶ"
}

export const getRomanNumeral = memoize((keyName: string, chord: Chord | ChordName | RootAndSuffix): string => {
  const chordObject = Chord.lookup(chord)
  const root = ENHARMONIC_DISPLAY_FOR_KEYNAME[keyName][chordObject.root]
  const archetype = chordObject.archetype
  const suffix = chordObject.names[0]
  console.log(chordObject.names)

  const keyTonic = keyName.split(' ')[0]  // XXX: not great Bob

  // FIXME: I still saw one sharp somewhere I didn't expect. Maybe a bad chord?

  let symbol = ''
  if (archetype.triadName == 'dim') {
    symbol = '°'
  } else if (archetype.triadName == 'aug') {
    symbol = '⁺'
  } else if (archetype.triadName?.startsWith('sus')) {
    // this is crazy!
    symbol = 'ₛᵤₛ'
  }

  // this is a hacky, very bad function.
  // I just kinda kept adding things until it looked correct
  // TODO: fix this garbage, probably write our own roman conversion from scratch
  let chordName
  if (suffix.match(/^m(in|add|[/]|maj|\d+)/)) {
    chordName = `${root} m`
  } else if (suffix.startsWith('alt')) {
    // this is crazy!
    chordName = `${root} major`
  } else if (suffix.startsWith('dim')) {
    // this is crazy!
    chordName = `${root} alt`
  } else {
    chordName = `${root} ${suffix}`
  }

  const rawNumeral = Progression.toRomanNumerals(keyTonic, [chordName])[0]
  const ret = RomanNumeral.get(rawNumeral)
  const { acc, roman, empty, chordType } = ret
  // console.info(`roman numeral: ${chordName} -> ${rawNumeral} -> ${JSON.stringify(ret)}`)
  if (empty) {
    return "?"
  }

  // this is hacky
  const numeral = (chordType === 'm' || chordType === 'alt') ? NUMERAL_MAP[roman.toLowerCase()] : NUMERAL_MAP[roman]
  return `${displayAccidentals(acc ?? '')}${numeral}${symbol}`
})
