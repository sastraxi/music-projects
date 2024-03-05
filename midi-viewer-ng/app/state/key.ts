import { LikelyKey } from 'noteynotes'
import { create } from 'zustand'

type KeyState = {
  /**
   * e.g. "B minor"
   */
  chosenKey: string | undefined
  guesses: LikelyKey[] | undefined
  isLocked: boolean
}

const INITIAL_STATE: KeyState = {
  chosenKey: undefined,
  guesses: undefined,
  isLocked: false,
}

//////////////////////////////////////////////////////////

type KeyStateAndMutators = KeyState & {
  reset: () => void
  setGuesses: (guesses: LikelyKey[] | undefined) => void
}

export const useKey = create<KeyStateAndMutators>()(
  (set) => ({
    ...INITIAL_STATE,
    reset: () => set(() => INITIAL_STATE),
    setGuesses: (guesses) => set(() => {
      return {
        guesses,
        chosenKey: guesses?.[0] ? `${guesses[0].note} ${guesses[0].mode}` : undefined,
      }
    }),
  }),
)
