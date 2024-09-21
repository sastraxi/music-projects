import { Button } from "@nextui-org/button";
import { Switch } from "@nextui-org/switch";
import type { MetaFunction } from "@remix-run/cloudflare";
import { Chord, detectChords, detectKey, noteForDisplay, noteFromMidi, noteToMidi, relativeToFirst, toKeyName } from "noteynotes";
import { useCallback, useEffect, useState } from "react";
import DetectedKey from "~/components/DetectedKey";
import { listenForMidi } from "~/midi";
import KeyboardInput from "~/midi/KeyboardInput";
import PedalDetector from "~/midi/PedalDetector";
import { useChords } from "~/state/chords";
import { useKey } from "~/state/key";
import { useNoteHistogram } from "~/state/note-histogram";
import { useNoteSet } from "~/state/note-set";
import { useUiState } from "~/state/ui";
import { subscriptText } from "~/util";
import ChordCard from "~/view/ChordCard";
import OneUpContainer from "~/view/OneUpContainer";
import Piano from "~/view/Piano";

export default function PlayChords() {
  return (
    <OneUpContainer>
      <div className="flex flex-row justify-between items-center">
        <div>
          <h1 className="text-2xl">
            Perform
          </h1>
          <h2 className="text-sm">
            CHORDS IN KEY
          </h2>
        </div>
        <div className="flex space-x-2">
          <Button
            size="lg"
            color="danger"
          >
            End session
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <PedalDetector
          onHoldStateChanged={holdState => console.log(`Pedal is now ${holdState ? 'held' : 'released'}`)}
          onTap={numTaps => console.log(`Tapped ${numTaps} time(s)`)}
        />
        <KeyboardInput
          minNotes={3}
          onFinalize={notes => console.log('notes', notes)}
          onIdle={() => console.log("Idle!")}
        />
      </div>

      <div className="mt-4">
        <Piano />
      </div>
    </OneUpContainer>
  );
}
