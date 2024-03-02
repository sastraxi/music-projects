import { Progress } from "@nextui-org/react";
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
  let factor = magnitude === 0 ? 1 : (1 / magnitude)

  useEffect(() => {
    const intervalId = setInterval(() => {
      calculate(performance.now() + timeOffset)
    }, HISTOGRAM_REFRESH_MS)
    return () => clearInterval(intervalId)
  }, [])

  const noteRows = []
  for (let i = 0; i < 12; ++i) {
    const noteName = noteForDisplay(noteFromMidi(i), { showOctave: false }) 
    noteRows.push(
      <TableRow key={i}>
        <TableCell>
          { noteName }
        </TableCell>
        <TableCell>
          <Progress
            aria-label={noteName}
            size="md"
            value={computed[i] * factor}
            className="max-w-md"
            minValue={0}
            maxValue={1}
          />
        </TableCell>
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
