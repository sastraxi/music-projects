type CallbackFunction = (arg0: Event) => undefined
type CancelFunction = () => void

export async function listenForMidi(callback: CallbackFunction): Promise<CancelFunction> {
    return navigator.requestMIDIAccess()
        .then((midiAccess) => {
            console.log(midiAccess);
            var inputs = midiAccess.inputs;
            var outputs = midiAccess.outputs;

            for (var input of midiAccess.inputs.values()) {
                input.addEventListener("midimessage", callback);
            }
            return () => {
                for (var input of midiAccess.inputs.values()) {
                    input.removeEventListener("midimessage", callback);
                }
            }
        })
        .catch(() => {
            console.error('Could not access your MIDI devices.');
            return () => {};
        });
}
