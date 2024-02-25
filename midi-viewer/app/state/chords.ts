import { FullChord } from 'noteynotes'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

type ChordState = {
  chords: FullChord[],
}

const INITIAL_STATE: ChordState = {
  chords: [],
}

//////////////////////////////////////////////////////////

type ChordStateAndMutators = ChordState & {
  reset: () => void
  push: (chord: FullChord) => void
  pop: () => void
}

export const useChords = create<ChordStateAndMutators>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      reset: () => set(() => INITIAL_STATE),
      push: (chord) => set(({ chords }) => ({ 
        chords: [...chords, chord],
      })),
      pop: () => set(({ chords }) => ({
        chords: chords.slice(0, -1),
      }))
    }),
    {
      name: 'midi-viewer-chords',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
