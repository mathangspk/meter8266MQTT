// File: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');

const db = require('./db/database');
const mqttHandler = require('./mqtt/handler');
const { setupWebSocket } = require('./ws/websocket');
const apiRouter = require('./routes/api');

const HTTP_PORT = process.env.HTTP_PORT || 3000;
const WS_PORT = process.env.WS_PORT || 8080;

// Express setup
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use('/api', apiRouter);

// Stats route
app.get('/api/stats', (req, res) => {
    db.get(`SELECT COUNT(*) as total_readings FROM meter_readings`, (err, total) => {
        if (err) return res.status(500).json({ error: err.message });
        db.get(`SELECT COUNT(*) as total_devices FROM devices`, (err, devices) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json({
                total_readings: total.total_readings,
                total_devices: devices.total_devices
            });
        });
    });
});

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
    console.log(`HTTP server running on port ${HTTP_PORT}`);
});

// WebSocket
setupWebSocket(WS_PORT);

// MQTT
mqttHandler.initMQTT();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down...');
    mqttHandler.shutdown();
    db.close();
    process.exit(0);
});
