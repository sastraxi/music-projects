// requires https://github.com/wilmouths/RGBLed
#include <RGBLed.h>
#include <ArduinoBLE.h>
#include <Arduino_HS300x.h>

const char* SERVICE_UUID = "018dbf71-70f9-7324-b813-03e0d06a3acf";
const char* TEMPERATURE_CH_UUID = "018dbf90-9852-7bc0-bda5-735a8a08019e";
const char* HUMIDITY_CH_UUID = "018dbf90-c0f6-7445-8112-7e496d2ee5e0";

BLEService messageService(SERVICE_UUID);

// create characteristics and allow remote device to read and get notifications:
BLEFloatCharacteristic temperatureCh(TEMPERATURE_CH_UUID, BLERead | BLENotify);
BLEFloatCharacteristic humidityCh(HUMIDITY_CH_UUID, BLERead | BLENotify);

RGBLed led(2, 3, 4, RGBLed::COMMON_CATHODE);

void setup() {
  Serial.begin(115200);
  while (!Serial) {}

  // initialize temperature / humidity sensors
  led.setColor(80, 0, 0);
  if (!HS300x.begin()) {
    Serial.println("Failed to initialize humidity/temperature sensor!");
    while (1);
  }  

  // initialize BLE
  led.setColor(0, 0, 80);
  while (!BLE.begin()) {
    Serial.println("Waiting for BLE to start");
    delay(1);
  }

  // setup our BLE service
  led.setColor(0, 80, 80);
  BLE.setDeviceName("Arduino Nano 33 BLE");
  BLE.setLocalName("Arduino Nano 33 BLE");
  BLE.setAdvertisedService(messageService);
  messageService.addCharacteristic(temperatureCh);
  messageService.addCharacteristic(humidityCh);
  BLE.addService(messageService);
  BLE.advertise();

  // done init
  led.setColor(0, 0, 0);
  Serial.println("Setup completed successfully.");
}

void loop() {
  BLEDevice central = BLE.central();

  // if a central is connected to the peripheral:
  if (central) {
    // print the central's BT address:
    Serial.print("Connected to central: ");
    Serial.println(central.address());
    // turn on LED to indicate connection:
    led.setColor(0, 255, 0);
    
    // while the central remains connected:
    while (central.connected()) {
      // read sensors:
      float temperature = HS300x.readTemperature();
      float humidity    = HS300x.readHumidity();
      // write sensor values to service characteristics:
      temperatureCh.writeValue(temperature);
      humidityCh.writeValue(humidity);
      delay(250);
    }
  } else {
    led.setColor(0, 0, 0);
  }

  delay(50);
}

/*
- https://www.midi.org/specifications/midi-transports-specifications/5-pin-din-electrical-specs
- https://docs.arduino.cc/learn/communication/uart/
*/