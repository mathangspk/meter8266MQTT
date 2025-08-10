// ws/websocket.js
const WebSocket = require('ws');

let wss;

function setupWebSocket(port) {
    wss = new WebSocket.Server({ port });

    wss.on('connection', (ws) => {
        console.log('New WebSocket client connected');

        ws.on('close', () => {
            console.log('WebSocket client disconnected');
        });
    });

    console.log(`WebSocket server running on port ${port}`);
}

function broadcastToClients(data) {
    if (!wss) return;

    const message = JSON.stringify({
        type: 'meter_data',
        data: data,
        timestamp: new Date().toISOString()
    });

    wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

module.exports = {
    setupWebSocket,
    broadcastToClients
};
