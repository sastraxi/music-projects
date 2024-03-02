import { useNoteHistogram } from "~/state/note-histogram"

const GuessedKey = () => {
  const { computed, magnitude } = useNoteHistogram()
  if (magnitude === 0) return
  
}

export default GuessedKey

