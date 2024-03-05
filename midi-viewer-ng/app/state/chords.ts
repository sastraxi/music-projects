import { FullChord } from 'noteynotes'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { remove } from '~/util'

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
  removeChord: (index: number) => void
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
      })),
      removeChord: (index: number) => set(({ chords }) => ({
        chords: remove(chords, index),
      })),
    }),
    {
      name: 'midi-viewer-chords',
      storage: createJSONStorage(() => localStorage)
    }
  )
)
