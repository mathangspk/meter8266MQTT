// mqtt/handler.js
const mqtt = require('mqtt');
const moment = require('moment');
const { getDevicesCollection, getMeterReadingsCollection } = require('../db/mongodb');
const { broadcastToClients } = require('../ws/websocket');
require('dotenv').config();

const MQTT_PORT = process.env.MQTT_PORT || 1883;
const MQTT_IP = process.env.MQTT_IP || 'localhost';
let mqttClient;

function initMQTT() {
    mqttClient = mqtt.connect(`mqtt://${MQTT_IP}:${MQTT_PORT}`, {
        clientId: 'meter-server',
        clean: true,
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || ''
    });

    mqttClient.on('connect', () => {
        //console.log('Connected to MQTT broker');
        mqttClient.subscribe('meter/+/data', (err) => {
            if (!err) {
                //console.log('Subscribed to meter data topics');
            }
        });
        mqttClient.subscribe('meter/+/status', (err) => {
            if (!err) {
                //console.log('Subscribed to meter status topics');
            }
        });
        mqttClient.subscribe('firmware/test/device/+', (err) => {
            if (!err) {
                //console.log('Subscribed to firmware test topics');
            }
        });
    });

    mqttClient.on('message', async (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            const topicParts = topic.split('/');

            if (topicParts[0] === 'meter' && topicParts[2] === 'data') {
                const deviceId = topicParts[1];
                await storeDeviceInfo(data, deviceId);
                await storeMeterReading(data, deviceId);
                broadcastToClients(data);
            } else if (topicParts[0] === 'firmware' && topicParts[1] === 'test' && topicParts[2] === 'device') {
                const deviceId = topicParts[3];
                console.log(`Received test message for device ${deviceId}: ${data.message}`);
                // TODO: Implement logic to display test message on the device
            }
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    });

    mqttClient.on('error', (error) => {
        console.error('MQTT Error:', error);
    });
}

async function storeDeviceInfo(data, deviceId) {
    console.log('data', data);
    let serial_number = data.serial_number || 'none';
    let ip_address = data.ip_address || 'none';
    let firmware_version = data.firmware_version || 'none';
    const updateFields = {
        device_id: deviceId,
        last_seen: new Date()
    };
    if (ip_address) {
        updateFields.ip_address = ip_address;
    }
    if (firmware_version) {
        updateFields.firmware_version = firmware_version;
    }
    const now = new Date();

    try {
        const devicesCollection = await getDevicesCollection();
        await devicesCollection.updateOne(
            { serial_number },
            {
                $set: updateFields,
                $setOnInsert: {
                    serial_number,
                    created_at: now
                }
            },
            { upsert: true }
        );
    } catch (error) {
        console.error('Error storing device info:', error);
    }
}

async function storeMeterReading(data, deviceId) {
    const { serial_number, voltage, current, power, energy, timestamp } = data;
    console.log(`Received data from device ${deviceId} | Serial: ${serial_number}`);
    console.log(`Voltage: ${voltage} V | Current: ${current} A | Power: ${power} W | Energy: ${energy} kWh`);

    try {
        const readingsCollection = await getMeterReadingsCollection();
        await readingsCollection.insertOne({
            device_id: deviceId,
            serial_number,
            voltage,
            current,
            power,
            energy,
            timestamp: timestamp ? new Date(timestamp) : new Date()
        });
        console.log(`Stored reading for device ${deviceId}`);
    } catch (error) {
        console.error('Error storing meter reading:', error);
    }
}

function publishFirmwareUpdateOTA(serialNumber, OTAurl) {
    const topic = `firmwareUpdateOTA/device/${serialNumber}`;
    const payload = JSON.stringify({ OTAurl: OTAurl });

    mqttClient.publish(topic, payload, (err) => {
        if (err) {
            console.error('Failed to publish firmware update OTA:', err);
        } else {
            console.log(`Published firmware update OTA to topic ${topic}: ${payload}`);
        }
    });
}

function shutdown() {
    if (mqttClient) {
        mqttClient.end();
    }
}

module.exports = {
    initMQTT,
    publishFirmwareUpdateOTA,
    shutdown
};