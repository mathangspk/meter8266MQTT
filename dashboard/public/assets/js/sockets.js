// Simple singleton WebSocket manager for the whole app
// Provides subscribe(serial, cb) and subscribeAll(cb) to receive messages

const Sockets = (() => {
    const listenersBySerial = {};
    const anyListeners = new Set();
    let ws = null;
    let isConnecting = false;
    let reconnectDelayMs = 1000;
    const maxReconnectDelayMs = 10000;

    const getWsUrl = () => {
        const wsProtocol = location.protocol === 'https:' ? 'wss' : 'ws';
        const wsPort = (window.WS_PORT || 8080);
        return `${wsProtocol}://${location.hostname}:${wsPort}`;
    };

    const ensureConnection = () => {
        if (ws && ws.readyState === WebSocket.OPEN) return;
        if (isConnecting) return;
        isConnecting = true;
        try {
            ws = new WebSocket(getWsUrl());
            ws.onopen = () => {
                isConnecting = false;
                reconnectDelayMs = 1000;
            };
            ws.onmessage = (event) => {
                try {
                    const msg = JSON.parse(event.data);
                    console.log('msg', msg);
                    if (!(msg && msg.type === 'meter_data' && msg.data)) return;
                    const d = msg.data || {};
                    const serial = d.serial_number || d.sn || d.device_sn;
                    if (!serial) return;
                    const tsRaw = d.timestamp || msg.timestamp || new Date().toISOString();
                    const tsDate = new Date(tsRaw);
                    const ts = (tsDate.toString() === 'Invalid Date') ? new Date().toISOString() : tsDate.toISOString();
                    const normalized = {
                        serial_number: String(serial),
                        device_id: d.device_id != null ? String(d.device_id) : undefined,
                        voltage: d.voltage != null ? Number(d.voltage) : undefined,
                        current: d.current != null ? Number(d.current) : undefined,
                        power: d.power != null ? Number(d.power) : undefined,
                        energy: d.energy != null ? Number(d.energy) : undefined,
                        timestamp: ts,
                        _raw: d
                    };
                    anyListeners.forEach(cb => { try { cb(normalized, msg); } catch (_) { } });
                    if (listenersBySerial[normalized.serial_number]) {
                        listenersBySerial[normalized.serial_number].forEach(cb => { try { cb(normalized, msg); } catch (_) { } });
                    }
                } catch (_) { }
            };
            ws.onclose = () => {
                isConnecting = false;
                // Attempt reconnect only if there are listeners
                const hasListeners = anyListeners.size > 0 || Object.keys(listenersBySerial).some(k => (listenersBySerial[k] || []).length > 0);
                if (hasListeners) {
                    setTimeout(() => {
                        reconnectDelayMs = Math.min(maxReconnectDelayMs, reconnectDelayMs * 2);
                        ensureConnection();
                    }, reconnectDelayMs);
                }
            };
            ws.onerror = () => {
                try { ws && ws.close(); } catch (_) { }
            };
        } catch (_) {
            isConnecting = false;
        }
    };

    const subscribe = (serial, cb) => {
        if (!listenersBySerial[serial]) listenersBySerial[serial] = new Set();
        listenersBySerial[serial].add(cb);
        ensureConnection();
    };

    const unsubscribe = (serial, cb) => {
        if (!listenersBySerial[serial]) return;
        listenersBySerial[serial].delete(cb);
        if (listenersBySerial[serial].size === 0) delete listenersBySerial[serial];
    };

    const subscribeAll = (cb) => {
        anyListeners.add(cb);
        ensureConnection();
    };

    const unsubscribeAll = (cb) => {
        anyListeners.delete(cb);
    };

    return {
        subscribe,
        unsubscribe,
        subscribeAll,
        unsubscribeAll
    };
})();

// Make Sockets globally available
window.Sockets = Sockets;


