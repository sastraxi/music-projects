import { pairwiseMultiply, range, rotate, sum } from "../util"
import { MAJOR_MODES_BY_DEGREE, MAJOR_SCALES, NUM_DEGREES, Note, OCTAVE_SIZE, noteForDisplay, noteToMidi } from "./common"
import { NoteHistogramBuckets } from "./keys"

export type LikelyKey = {
  note: Note,
  mode: string,
  score: number
}

export const toKeyName = (key: LikelyKey) => `${key.note} ${key.mode}`
export const keyForDisplay = (key: LikelyKey) => `${noteForDisplay(key.note)} ${key.mode}`
export const keyEq = (a: LikelyKey, b: LikelyKey) => a.note === b.note && a.mode === b.mode

/**
 * In order to detect which mode is most likely for a given major scale,
 * we move this pattern across the note frequencies of the histogram.
 * In fact the whole key guessing game could probably be done as a series of matrix multiplications.
 */
// TODO: replace this with a matrix. Each scale has its own "character notes"
// that we should detect, e.g. hitting the 4 a lot can be lydian. Hitting the
// 2 a lot works to establish phyrgian. Dorian needs a 6 boost, mixo a 7 boost,
// and for minor I think we should probably boost the 3 and 7. Important that
// every row has the same total, though!
const SCORE_MODIFIER_BY_RELATIVE_DEGREE = [
  4.0, 0.2, 2.0, -0.2, 2.5, -1.0, -0.3
]

const NON_SCALE_MODIFIER = -4.0

/**
 * N.B. only does keys based on the major scales right now.
 */
export const detectKey = (
  histogram: NoteHistogramBuckets,
  {
    minInternalScore,
  }: {
    minInternalScore?: number
  } = {}
): LikelyKey[] => {
  const result: LikelyKey[] = []  

  // scale: each of the 12 major scales around circle of fifths
  for (const scaleNotes of Object.values(MAJOR_SCALES)) {
    const degreeBucket = (degree: number) => noteToMidi(scaleNotes[degree] + "1") % 12
    const degreeFreq = (degree: number) => histogram[degreeBucket(degree)]
    const degreeBuckets = range(NUM_DEGREES).map(degreeBucket)
    const nonDegreeBuckets = range(OCTAVE_SIZE).filter(i => !degreeBuckets.includes(i))
    const outOfScalePenalty = NON_SCALE_MODIFIER * sum(nonDegreeBuckets.map(i => histogram[i]))

    const scaleFrequencies = range(NUM_DEGREES).map(degreeFreq)
    const scores: number[] = range(NUM_DEGREES).map((degree) => {
      // console.log(`${degree} deg of ${scaleNotes} is Note ${scaleNotes[degree]}, MIDI: ${noteToMidi(scaleNotes[degree] + "1") % 12}`)
      const weightVector = rotate(SCORE_MODIFIER_BY_RELATIVE_DEGREE, NUM_DEGREES - degree)
      return pairwiseMultiply(scaleFrequencies, weightVector) + outOfScalePenalty
    })
    
    // throw out unlikely keys
    const potentials = scores.map((score, degree) => ({
      mode: MAJOR_MODES_BY_DEGREE[degree],
      note: scaleNotes[degree],
      score,
    })).filter(x =>
      x.score > 0 &&
      x.score >= (minInternalScore ?? -Infinity)
    )

    result.push(...potentials)
  }

  // normalize scores (treat as "probability")
  const totalScore = sum(result.map(x => x.score))
  return result
    .map((x) => ({ ...x, score: x.score / totalScore}))
    .sort((a, b) => b.score - a.score)
}
