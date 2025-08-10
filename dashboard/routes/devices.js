// routes/devices.js
const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Lấy tất cả thiết bị, sắp xếp theo last_seen
router.get('/', (req, res) => {
    db.all(`SELECT * FROM devices ORDER BY last_seen DESC`, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Lấy lịch sử readings của một thiết bị
router.get('/:deviceId/readings', (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;

    let query = `SELECT * FROM meter_readings WHERE device_id = ?`;
    let params = [deviceId];

    if (from && to) {
        query += ` AND timestamp BETWEEN ? AND ?`;
        params.push(from, to);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

// Thêm một thiết bị mới
router.post('/', (req, res) => {
    const { serial_number, device_id, name, location, status, username } = req.body;
    if (!serial_number || !device_id || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `INSERT INTO devices (serial_number, device_id, name, location, status, username) VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [serial_number, device_id, name || '', location || '', status || 'active', username], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID });
    });
});

router.get('/by-user/:username', (req, res) => {
    const { username } = req.params;
    db.all(`SELECT * FROM devices WHERE username = ?`, [username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Xoá một thiết bị
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM devices WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Device deleted' });
    });
});

router.get('/by-serial/:serial_number', (req, res) => {
    const { serial_number } = req.params;
    db.get('SELECT * FROM devices WHERE serial_number = ?', [serial_number], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

router.get('/:serial_number/latest-reading', (req, res) => {
    console.log('Fetching latest reading for serial:', req.params.serial_number);
    console.log('Query params:', req.query);
    const { serial_number } = req.params;
    db.get(
        `SELECT voltage, current, power, energy, timestamp FROM meter_readings WHERE serial_number = ? ORDER BY timestamp DESC LIMIT 1`,
        [serial_number],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row || {});
        }
    );
});

router.get('/:serial_number/readings', (req, res) => {
    console.log('Fetching readings for serial:', req.params.serial_number);
    console.log('Query params:', req.query);

    const { serial_number } = req.params;

    const limit = parseInt(req.query.limit, 10) || 10;
    db.all(
        `SELECT voltage, current, power, energy, timestamp FROM meter_readings WHERE serial_number = ? ORDER BY timestamp DESC LIMIT ?`,
        [serial_number, limit],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});


module.exports = router;
