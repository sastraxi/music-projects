import { Note, noteToMidi } from 'noteynotes'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { COMMON_STORAGE_OPTIONS } from './json-storage'

type NoteSetState = {
  timestampByNote: Record<Note, number>
  sortedNotes: Note[]
  noteSet: Set<Note>
}

const INITIAL_STATE: NoteSetState = {
  timestampByNote: {},
  sortedNotes: [],
  noteSet: new Set([]),
}

//////////////////////////////////////////////////////////

type NoteSetStateAndMutators = NoteSetState & {
  reset: () => void
  includeNote: (note: Note, timestamp: number) => void
  excludeNote: (note: Note) => void
}

const sortPred = (a: Note, b: Note) => noteToMidi(a) - noteToMidi(b)

export const useNoteSet = create<NoteSetStateAndMutators>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      
      reset: () => set(() => INITIAL_STATE),

      includeNote: (note: Note, timestamp: number) =>
        set((prev) => {
          const noteSet = new Set(prev.noteSet).add(note)
          const sortedNotes = Array.from(noteSet).sort(sortPred)
          return {
            noteSet,
            sortedNotes,
            timestampByNote: {
              ...prev.timestampByNote,
              [note]: timestamp
            }
          }
        }),

      excludeNote: (note: Note) =>
        set((prev) => {
          const noteSet = new Set(prev.noteSet)
          noteSet.delete(note)
          const timestampByNote = { ... prev.timestampByNote }
          delete timestampByNote[note]
          return {
            noteSet,
            timestampByNote,
            sortedNotes: prev.sortedNotes.filter(n => n !== note),
          }
        }),
    }),
    {
      name: 'midi-viewer-notes',
      storage: createJSONStorage(() => localStorage, COMMON_STORAGE_OPTIONS),
    }
  )
)
