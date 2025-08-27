// File: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const WebSocket = require('ws');

const { connectToMongoDB, closeConnection } = require('./db/mongodb');
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

// Stats route - moved to api.js

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start HTTP server
app.listen(HTTP_PORT, () => {
    console.log(`HTTP server running on port ${HTTP_PORT}`);
});

// Initialize MongoDB and start services
async function startServices() {
    try {
        await connectToMongoDB();

        // WebSocket
        setupWebSocket(WS_PORT);

        // MQTT
        mqttHandler.initMQTT();

        console.log('All services started successfully');
    } catch (error) {
        console.error('Failed to start services:', error);
        process.exit(1);
    }
}

startServices();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('Shutting down...');
    mqttHandler.shutdown();
    await closeConnection();
    process.exit(0);
});
