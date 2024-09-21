# midi-viewer

This app shows you what you're playing on a MIDI keyboard.

## Ideas

- "long context" --> guessed key based on scale + tonal centre? note movement / clustering?
- show function of recent chord in key context
- checkmark on UI when chords is locked in
- notes played right before the tap should be considered part of the next batch of notes
- double-tapping drops the pending chord without committing it
- both bass note and extensions should be dynamic over the chord lifetime
- need to auto-switch extensions based on a _dissonance threshold_
- record their history (per base chord) and show them on the UI (MIDI)

## Making it a game

- https://github.com/open-spaced-repetition/fsrs4anki/blob/a9bf76eb05ac946e4b4dab5700d42d384dd82101/README.md
