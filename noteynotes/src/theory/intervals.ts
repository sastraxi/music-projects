import { OCTAVE_SIZE } from "./common"

export const INTERVAL_NAMES = [
  "perfect unison",
  "minor second",
  "major second",
  "minor third",
  "major third",
  "perfect fourth",
  "tritone",
  "perfect fifth",
  "minor sixth",
  "major sixth",
  "minor seventh",
  "major seventh",

  "perfect octave",
  "minor ninth",
  "major ninth",
  "minor tenth",
  "major tenth",
  "perfect eleventh",
  "diminished twelfth",
  "perfect twelfth",
  "minor thirteenth",
  "major thirteenth",
  "minor fourteenth",
  "major fourteenth"
]

const TWO_OCTAVES = INTERVAL_NAMES.length

export const nameInterval = (semitones: number): string => {
  const dist = Math.abs(semitones)
  const doubleOctaves = Math.floor(dist / TWO_OCTAVES)
  if (doubleOctaves == 0) return INTERVAL_NAMES[dist]
  return `${INTERVAL_NAMES[dist % TWO_OCTAVES]} +${doubleOctaves * 2}oct`
}
