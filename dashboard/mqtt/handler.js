// mqtt/handler.js
const mqtt = require('mqtt');
const moment = require('moment');
const db = require('../db/database');
const { broadcastToClients } = require('../ws/websocket');
require('dotenv').config();

const MQTT_PORT = process.env.MQTT_PORT || 1883;

let mqttClient;

function initMQTT() {
    mqttClient = mqtt.connect(`mqtt://localhost:${MQTT_PORT}`, {
        clientId: 'meter-server',
        clean: true,
        username: process.env.MQTT_USERNAME || '',
        password: process.env.MQTT_PASSWORD || ''
    });

    mqttClient.on('connect', () => {
        console.log('Connected to MQTT broker');
        mqttClient.subscribe('meter/+/data', (err) => {
            if (!err) {
                console.log('Subscribed to meter data topics');
            }
        });
        mqttClient.subscribe('meter/+/status', (err) => {
            if (!err) {
                console.log('Subscribed to meter status topics');
            }
        });
    });

    mqttClient.on('message', (topic, message) => {
        try {
            const data = JSON.parse(message.toString());
            const deviceId = topic.split('/')[1];

            storeDeviceInfo(data, deviceId);
            storeMeterReading(data, deviceId);
            broadcastToClients(data);
        } catch (error) {
            console.error('Error processing MQTT message:', error);
        }
    });

    mqttClient.on('error', (error) => {
        console.error('MQTT Error:', error);
    });
}

function storeDeviceInfo(data, deviceId) {
    const { serial_number } = data;
    const now = moment().format('YYYY-MM-DD HH:mm:ss');

    db.run(`INSERT INTO devices (serial_number, device_id, last_seen)
            VALUES (?, ?, ?)
            ON CONFLICT(serial_number) DO UPDATE SET
                device_id = excluded.device_id,
                last_seen = excluded.last_seen`,
        [serial_number, deviceId, now],
        (err) => {
            if (err) {
                console.error('Error storing device info:', err);
            }
        });
}

function storeMeterReading(data, deviceId) {
    const { serial_number, voltage, current, power, energy, timestamp } = data;
    console.log(`Received data from device ${deviceId} | Serial: ${serial_number}`);
    console.log(`Voltage: ${voltage} V | Current: ${current} A | Power: ${power} W | Energy: ${energy} kWh`);

    db.run(`INSERT INTO meter_readings (device_id, serial_number, voltage, current, power, energy, timestamp) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [deviceId, serial_number, voltage, current, power, energy, timestamp || moment().format()],
        (err) => {
            if (err) {
                console.error('Error storing meter reading:', err);
            } else {
                console.log(`Stored reading for device ${deviceId}`);
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
    shutdown
};
