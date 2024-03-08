import { LikelyKey } from 'noteynotes'
import { create } from 'zustand'

type KeyState = {
  /**
   * e.g. "B minor"
   */
  chosenKey: LikelyKey | undefined
  guessedKeys: LikelyKey[] | undefined
  isLocked: boolean
}

const INITIAL_STATE: KeyState = {
  chosenKey: undefined,
  guessedKeys: undefined,
  isLocked: false,
}

//////////////////////////////////////////////////////////

type KeyStateAndMutators = KeyState & {
  reset: () => void
  setGuessedKeys: (guesses: LikelyKey[] | undefined) => void
  setChosenKey: (bestGuess: LikelyKey | undefined) => void
}

export const useKey = create<KeyStateAndMutators>()(
  (set) => ({
    ...INITIAL_STATE,
    reset: () => set(() => INITIAL_STATE),
    setGuessedKeys: (guessedKeys) => set({ guessedKeys }),
    setChosenKey: (chosenKey) => set({ chosenKey })
  }),
)
