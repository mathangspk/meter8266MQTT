const express = require('express');
const devicesRouter = require('./devices_check');
const readingsRouter = require('./readings');
const db = require('../db/database');

const router = express.Router();

// Đăng ký tài khoản người dùng
router.post('/register', (req, res) => {
    console.log('Received registration request:', req.body);
    const { username, email, password } = req.body;
    console.log('Registering user:', username);
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing username, email or password' });
    }

    const createdAt = new Date().toISOString();

    const query = `INSERT INTO users (username, email, password, created_at) VALUES (?, ?, ?, ?)`;
    db.run(query, [username, email, password, createdAt], function (err) {
        if (err) {
            if (err.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({ error: 'Username or email already exists' });
            }
            return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
            message: 'User registered successfully',
            user_id: this.lastID
        });
    });
});

// Đăng nhập người dùng
router.post('/login', (req, res) => {
    console.log('Received login request:', req.body);
    const { username, password } = req.body;
    console.log('Logging in user:', username);
    if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
    }

    // Kiểm tra thông tin đăng nhập
    db.get(`SELECT * FROM users WHERE username = ? AND password = ?`, [username, password], (err, user) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!user) return res.status(401).json({ error: 'Invalid username or password' });

        res.json({
            message: 'Login successful',
            user_id: user.id,
            username: user.username
        });
    });
});

// Route thống kê
router.get('/stats', (req, res) => {
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

// Mount sub-routes
router.use('/devices', devicesRouter);
router.use('/readings', readingsRouter);

module.exports = router;
