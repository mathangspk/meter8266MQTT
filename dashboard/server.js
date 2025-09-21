// File: server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const WebSocket = require('ws');
const https = require('https');
const fs = require('fs');

const { connectToMongoDB, closeConnection } = require('./db/mongodb');
const mqttHandler = require('./mqtt/handler');
const { setupWebSocket } = require('./ws/websocket');
const apiRouter = require('./routes/api');

const HTTP_PORT = process.env.HTTP_PORT || 3001;
const WS_PORT = process.env.WS_PORT || 8080;

// Express setup
const app = express();

// Security middleware
app.use(helmet({
    crossOriginOpenerPolicy: false, // Disable COOP to avoid untrustworthy origin issues
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://localhost:3001"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            connectSrc: ["'self'", "ws://localhost:8080", "ws://113.161.220.166:8080", "wss://113.161.220.166:8080", "http://localhost:3001", "http://113.161.220.166:3001", "https://113.161.220.166:3001", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "https://cdn.jsdelivr.net"],
            baseUri: ["'self'", "https://113.161.220.166:3001", "https://localhost:3001", "https://192.168.1.50:3001"],
        }
    }
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // limit each IP to 100 requests per windowMs
    message: {
        error: 'Too many requests from this IP, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

app.use(limiter);

// CORS configuration
app.use(cors({
    origin: '*'
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static('public'));

// Routes
app.use('/api', apiRouter);

// Serve dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start HTTPS server
const httpsOptions = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem')
};
const server = https.createServer(httpsOptions, app);
server.listen(HTTP_PORT, () => {
    console.log(`HTTPS server running on port ${HTTP_PORT}`);
});

// Initialize MongoDB and start services
async function startServices() {
    try {
        await connectToMongoDB();

        // WebSocket
        setupWebSocket(server);

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
