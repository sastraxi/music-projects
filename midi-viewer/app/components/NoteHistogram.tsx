import {
  Table,
  TableHeader,
  TableBody,
  TableColumn,
  TableRow,
  TableCell
} from "@nextui-org/table";
import { noteForDisplay, noteFromMidi } from "noteynotes";
import { useEffect } from "react";
import { useNoteHistogram } from "~/state/note-histogram";

const HISTOGRAM_REFRESH_MS = 1000

const NoteHistogram = ({
  timeOffset
}: {
  timeOffset: number
}) => {
  const { calculate, computed, magnitude } = useNoteHistogram()
  let divisor = magnitude === 0 ? 1 : magnitude

  useEffect(() => {
    const intervalId = setInterval(() => {

    }, HISTOGRAM_REFRESH_MS)
    return () => clearInterval(intervalId)
  }, [])

  const noteRows = []
  for (let i = 0; i < 12; ++i) {
    noteRows.push(
      <TableRow key={i}>
        <TableCell>
          { noteForDisplay(noteFromMidi(i), { showOctave: false }) }
        </TableCell>
        <TableCell>CEO</TableCell>
      </TableRow>
    )
  }

  return (
    <Table aria-label="Example static collection table">
      <TableHeader>
        <TableColumn>NOTE</TableColumn>
        <TableColumn>OBSERVED FREQUENCY</TableColumn>
      </TableHeader>
      <TableBody>
        {noteRows}
      </TableBody>
    </Table>
  )
}

export default NoteHistogram
