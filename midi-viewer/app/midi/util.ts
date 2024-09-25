import { Note, noteToMidi } from "noteynotes"

export const sortPred = (a: Note, b: Note) => noteToMidi(a) - noteToMidi(b)

export const noteSetToList = (noteSet: Set<Note>) =>
  Array.from(noteSet).sort(sortPred)

export const EMPTY_NOTE_SET = new Set<Note>()
