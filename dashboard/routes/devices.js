const express = require('express');
const db = require('../db/database');
const router = express.Router();

// --- Devices CRUD ---
// Lấy tất cả devices
router.get('/', (req, res) => {
    db.all(`SELECT * FROM devices ORDER BY last_seen DESC`, (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Thêm device mới
router.post('/', (req, res) => {
    const { serial_number, device_id, name, location, status, username } = req.body;
    if (!serial_number || !device_id || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    const query = `INSERT INTO devices (serial_number, device_id, name, location, status, username) 
                   VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(query, [serial_number, device_id, name || '', location || '', status || 'active', username], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID });
    });
});

// Update device theo serial_number (RESTful)
router.put('/:serial_number', (req, res) => {
    const { serial_number } = req.params;
    const { name, location, status } = req.body;
    const query = `UPDATE devices SET name=?, location=?, status=? WHERE serial_number=?`;
    db.run(query, [name || "", location || "", status || "active", serial_number], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: "Device not found" });
        res.json({ message: "Device updated" });
    });
});

// Xoá device theo id
router.delete('/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM devices WHERE id = ?', [id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Device deleted' });
    });
});

// Lấy devices theo username
router.get('/by-user/:username', (req, res) => {
    const { username } = req.params;
    db.all(`SELECT * FROM devices WHERE username = ?`, [username], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// Lấy device theo serial
router.get('/by-serial/:serial_number', (req, res) => {
    const { serial_number } = req.params;
    db.get('SELECT * FROM devices WHERE serial_number = ?', [serial_number], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(row);
    });
});

// --- Meter readings ---
// Latest reading
router.get('/:serial_number/latest-reading', (req, res) => {
    const { serial_number } = req.params;
    db.get(
        `SELECT voltage, current, power, energy, timestamp 
         FROM meter_readings 
         WHERE serial_number = ? 
         ORDER BY timestamp DESC LIMIT 1`,
        [serial_number],
        (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(row || {});
        }
    );
});

// All readings (limit, from-to)
router.get('/:serial_number/readings', (req, res) => {
    const { serial_number } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;
    db.all(
        `SELECT voltage, current, power, energy, timestamp 
         FROM meter_readings 
         WHERE serial_number = ? 
         ORDER BY timestamp DESC LIMIT ?`,
        [serial_number, limit],
        (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });
            res.json(rows);
        }
    );
});

module.exports = router;
