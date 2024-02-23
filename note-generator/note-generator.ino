// requires https://github.com/wilmouths/RGBLed
// requires this branch: https://github.com/lathoub/Arduino-BLE-MIDI/tree/Arduino-Nano-BLE-33
// requires this fork: https://github.com/lathoub/ArduinoBLE
#include <Arduino.h>
#include <RGBLed.h>

#include <BLEMIDI_Transport.h>
#include <hardware/BLEMIDI_ArduinoBLE.h>

const int MIDI_CH = 1;

// M/IDI_CREATE_INSTANCE(HardwareSerial, Serial, hwMIDI);
// B/LEMIDI_CREATE_CUSTOM_INSTANCE("BLE Server", MIDI, CustomBufferSizeSettings);
BLEMIDI_CREATE_DEFAULT_INSTANCE()

RGBLed led(2, 3, 4, RGBLed::COMMON_CATHODE);

const int MIDI_BAUD = 31250;
const int ORIGINAL_BAUD = 115200;

/* *********************************************** */

bool isConnected = false;

void onConnect()    { isConnected = true; Serial.println("Connected."); }
void onDisconnect() { isConnected = false; Serial.println("Disconnected."); }

void setup() {
  MIDI.begin();
  // Serial.begin(MIDI_BAUD);
  // while (!Serial) {}

  // initialize BLE
  // led.setColor(0, 0, 80);
  // while (!BLE.begin()) {
  //   Serial.println("Waiting for BLE to start");
  //   delay(1);
  // }

  // setup our MIDI-BLE bridge service
  led.setColor(0, 80, 80);
  // hwMIDI.begin(MIDI_CH);
  BLEMIDI.setHandleConnected(onConnect);
  BLEMIDI.setHandleDisconnected(onDisconnect);

  // done init
  led.setColor(0, 0, 0);
  Serial.println("Setup completed successfully.");
}

/**
 * Forward MIDI messages from the hardware (5-DIN) connector
 * to our MIDI-over-BLE service.
 */
void hwToBle() {
  // if (hwMIDI.read()) {
  //   MIDI.send(hwMIDI.getType(),
  //             hwMIDI.getData1(),
  //             hwMIDI.getData2(),
  //             hwMIDI.getChannel());
  // }
}

void sendARandomNote() {
  if (!isConnected) {
    Serial.println("Not connected.");
    delay(1400);
  } else {
    int note = random(36, 97);
    Serial.println("Sending note: " + String(note));
    MIDI.sendNoteOn(note, 127, MIDI_CH);
    led.setColor(0, 255, 0);
    delay(200);
    MIDI.sendNoteOff(note, 127, MIDI_CH);
    led.setColor(0, 0, 0);
    delay(1200);
  }
}

void loop() {
  // hwToBle();
  MIDI.read();
  sendARandomNote();
}


/*
- https://ble-midi.github.io/WebMIDI/multirx.html
- https://www.midi.org/specifications/midi-transports-specifications/5-pin-din-electrical-specs
- https://docs.arduino.cc/learn/communication/uart/
- https://github.com/lathoub/Arduino-BLE-MIDI/blob/master/examples/MidiBle_Client/MidiBle_Client.ino
- https://github.com/FortySevenEffects/arduino_midi_library/blob/master/examples/AltPinSerial/AltPinSerial.ino
*/