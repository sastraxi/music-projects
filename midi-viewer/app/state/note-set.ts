import { Note, noteToMidi } from 'noteynotes'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { COMMON_STORAGE_OPTIONS } from './json-storage'

type NoteSetState = {
  sortedNotes: Note[]
  noteSet: Set<Note>
}

const INITIAL_STATE: NoteSetState = {
  sortedNotes: [],
  noteSet: new Set([]),
}

//////////////////////////////////////////////////////////

type NoteSetStateAndMutators = NoteSetState & {
  reset: () => void
  includeNote: (note: Note) => void
  excludeNote: (note: Note) => void
  toggleNote: (note: Note) => void
}

const sortPred = (a: Note, b: Note) => noteToMidi(a) - noteToMidi(b)

export const useNoteSet = create<NoteSetStateAndMutators>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      
      reset: () => set(() => INITIAL_STATE),

      includeNote: (note: Note) =>
        set((prev) => {
          const noteSet = new Set(prev.noteSet).add(note)
          const sortedNotes = Array.from(noteSet).sort(sortPred)
          return {
            noteSet,
            sortedNotes,
          }
        }),

      excludeNote: (note: Note) =>
        set((prev) => {
          const noteSet = new Set(prev.noteSet)
          noteSet.delete(note)
          return {
            noteSet,
            sortedNotes: prev.sortedNotes.filter(n => n !== note),
          }
        }),

      toggleNote: (note: Note) =>
        set((prev) => {
          const noteSet = new Set(prev.noteSet)
          if (!noteSet.has(note)) {
            noteSet.add(note)
          } else {
            noteSet.delete(note)
          }
          const sortedNotes = Array.from(noteSet).sort(sortPred)
          return {
            noteSet,
            sortedNotes,
          }
        }),
    }),
    {
      name: 'midi-viewer-notes',
      storage: createJSONStorage(() => localStorage, COMMON_STORAGE_OPTIONS),
    }
  )
)
