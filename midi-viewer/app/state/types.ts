import { Note } from "noteynotes"

export type TimestampedNote = {
  note: Note
  /**
   * Milliseconds; MIDI clock timebase
   */
  timestamp: number
}
