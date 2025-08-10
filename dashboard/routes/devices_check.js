const express = require('express');
const db = require('../db/database');
const router = express.Router();

/**
 * Lấy tất cả thiết bị (order by last_seen desc)
 */
router.get('/', (req, res) => {
    db.all(`SELECT * FROM devices ORDER BY last_seen DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * Lấy thiết bị theo username
 */
router.get('/by-user/:username', (req, res) => {
    const { username } = req.params;
    db.all(`SELECT * FROM devices WHERE username = ?`, [username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * Lấy thiết bị theo serial_number
 */
router.get('/by-serial/:serial_number', (req, res) => {
    const { serial_number } = req.params;
    db.get(`SELECT * FROM devices WHERE serial_number = ?`, [serial_number], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

/**
 * Lấy reading mới nhất theo serial_number
 */
router.get('/serial/:serial_number/latest-reading', (req, res) => {
    const { serial_number } = req.params;
    db.get(
        `SELECT voltage, current, power, energy, timestamp
         FROM meter_readings
         WHERE serial_number = ?
         ORDER BY timestamp DESC
         LIMIT 1`,
        [serial_number],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row || {});
        }
    );
});

/**
 * Lấy readings theo serial_number
 */
router.get('/serial/:serial_number/readings', (req, res) => {
    const { serial_number } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    db.all(
        `SELECT voltage, current, power, energy, timestamp
         FROM meter_readings
         WHERE serial_number = ?
         ORDER BY timestamp DESC
         LIMIT ?`,
        [serial_number, limit],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

/**
 * Lấy readings theo device_id
 */
router.get('/id/:deviceId/readings', (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;

    let query = `SELECT * FROM meter_readings WHERE device_id = ?`;
    const params = [deviceId];

    if (from && to) {
        query += ` AND timestamp BETWEEN ? AND ?`;
        params.push(from, to);
    }

    query += ` ORDER BY timestamp DESC LIMIT ?`;
    params.push(parseInt(limit));

    db.all(query, params, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

/**
 * Thêm thiết bị mới
 */
router.post('/', (req, res) => {
    const { serial_number, device_id, name, location, status, username } = req.body;
    if (!serial_number || !device_id || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    const query = `
        INSERT INTO devices (serial_number, device_id, name, location, status, username)
        VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.run(
        query,
        [serial_number, device_id, name || '', location || '', status || 'active', username],
        function (err) {
            if (err) return res.status(500).json({ error: err.message });
            res.status(201).json({ id: this.lastID });
        }
    );
});

/**
 * Xóa thiết bị theo id
 */
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM devices WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Device deleted' });
    });
});

module.exports = router;
