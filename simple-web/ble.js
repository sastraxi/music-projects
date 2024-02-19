const log = console.log;

const SERVICE_UUID = "018dbf71-70f9-7324-b813-03e0d06a3acf";
const TEMPERATURE_CH_UUID = "018dbf90-9852-7bc0-bda5-735a8a08019e";
const HUMIDITY_CH_UUID = "018dbf90-c0f6-7445-8112-7e496d2ee5e0";

let device = null;
let savedService = null;

let mutex = false;

const logTemperature = async () => {
    if (mutex) {
        return;
    }
    mutex = true;

    try {
        // connect if we haven't already
        if (!device || !(savedService?.device.gatt.connected)) { 
            device = await navigator.bluetooth.requestDevice({
                filters: [
                    {services: [SERVICE_UUID]},
                ],
            });
            const server = await device.gatt.connect();
            savedService = await server.getPrimaryService(SERVICE_UUID);
        }

        // log temperature
        const characteristic = await savedService.getCharacteristic(TEMPERATURE_CH_UUID);
        const value = await characteristic.readValue();
        const temperature = value.getFloat32(0, true);
        log('> Temperature is ' + temperature + '°C');
    } catch (error) {
        log('Argh! ' + error);
    }

    mutex = false;
};
