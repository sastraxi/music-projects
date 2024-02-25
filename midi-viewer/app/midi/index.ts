type CallbackFunction = (arg0: MIDIMessageEvent) => void
type CancelFunction = () => void

let savedMidiAccess: MIDIAccess | undefined;

export function listenForMidi(callback: CallbackFunction): CancelFunction {
    navigator.requestMIDIAccess()
        .then((midiAccess) => {
            savedMidiAccess = midiAccess;
            for (var input of savedMidiAccess.inputs.values()) {
                // @ts-ignore why does it think this takes a generic Event?
                input.addEventListener("midimessage", callback);
            }
        })
        .catch(() => {
            console.error('Could not access your MIDI devices.');
            return () => {};
        });

    return () => {
        if (!savedMidiAccess) return;
        for (var input of savedMidiAccess.inputs.values()) {
            // @ts-ignore why does it think this takes a generic Event?
            input.removeEventListener("midimessage", callback);
        }
    }
}
