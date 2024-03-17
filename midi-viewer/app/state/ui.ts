
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { COMMON_STORAGE_OPTIONS } from './json-storage'

type UiState = {
  notesBarVisible: boolean
}

const INITIAL_STATE: UiState = {
  notesBarVisible: false
}

//////////////////////////////////////////////////////////

type UiStateAndMutators = UiState & {
  reset: () => void
  toggleNotesBarVisibility: () => void
}

export const useUiState = create<UiStateAndMutators>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,
      reset: () => set(() => INITIAL_STATE),
      toggleNotesBarVisibility: () => set((state) => ({
        notesBarVisible: !state.notesBarVisible,
      }))
    }),
    {
      name: 'midi-viewer-notes',
      storage: createJSONStorage(() => localStorage, COMMON_STORAGE_OPTIONS),
    }
  )
)
