import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { Chord, Note } from 'noteynotes'
import { COMMON_STORAGE_OPTIONS } from './json-storage'

interface PlayRecord {
  timeDelta: number // Time in milliseconds between chord display and answer submission
  chord: string
  performedNotes: string[]
  correct: boolean
}

interface PlayChordsStore {
  plays: PlayRecord[]
  addPlay: (chord: Chord, performedNotes: Note[], correct: boolean, timeDelta: number) => void
}

export const usePlayChordsStore = create<PlayChordsStore>()(
  persist(
    (set) => ({
      plays: [],
      addPlay: (chord, performedNotes, correct, timeDelta) => set((state) => ({
        plays: [
          ...state.plays,
          {
            timeDelta,
            chord: chord.forDisplay(),
            performedNotes: performedNotes.map(note => note.toString()),
            correct,
          },
        ],
      })),
    }),
    {
      name: 'midi-viewer-play-chords',
      storage: createJSONStorage(() => localStorage, COMMON_STORAGE_OPTIONS),
      version: 1,
    }
  )
)
