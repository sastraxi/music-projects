import { Table, TableHeader, TableColumn, TableBody, TableRow, TableCell, Pagination, Button } from "@nextui-org/react";
import { usePlayChordsStore } from '~/state/play-chords-store';
import { noteForDisplay } from "noteynotes";
import { useState } from 'react';

const ITEMS_PER_PAGE = 20;

export default function PlayChordsStatsTable() {
  const plays = usePlayChordsStore((state) => state.plays);
  const clearPlays = usePlayChordsStore((state) => state.clearPlays);
  const [page, setPage] = useState(1);

  const displayedPlays = plays.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  return (
    <div className="w-full flex flex-col">
      <Table 
        aria-label="Play Chords Statistics"
        classNames={{
          wrapper: "max-h-[400px]",
          base: "overflow-y-auto",
          table: "max-h-[400px]",
          th: "bg-default-200 text-default-600 sticky top-0",
          td: "text-default-600",
        }}
      >
        <TableHeader>
          <TableColumn>Chord</TableColumn>
          <TableColumn>Notes played</TableColumn>
          <TableColumn>Correct?</TableColumn>
          <TableColumn>Time (ms)</TableColumn>
        </TableHeader>
        <TableBody >
          {displayedPlays.map((play, index) => (
            <TableRow key={index}>
              <TableCell>{play.chord}</TableCell>
              <TableCell>{play.performedNotes.map(note => noteForDisplay(note)).join(', ')}</TableCell>
              <TableCell>{play.correct ? 'Yes' : 'No'}</TableCell>
              <TableCell>{play.timeDelta.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex justify-between items-center m-4">
        <Pagination
          total={Math.ceil(plays.length / ITEMS_PER_PAGE)}
          page={page}
          onChange={setPage}
        />
        <Button 
          color="danger" 
          size="sm" 
          onClick={clearPlays}
          disabled={plays.length === 0}
        >
          Clear Stats
        </Button>
      </div>
    </div>
  );
}
