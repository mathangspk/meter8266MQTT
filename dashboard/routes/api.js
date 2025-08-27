const express = require('express');
const devicesRouter = require('./devices_check');
const readingsRouter = require('./readings');
const { getUsersCollection } = require('../db/mongodb');

const router = express.Router();

// Đăng ký tài khoản người dùng
router.post('/register', async (req, res) => {
    console.log('Received registration request:', req.body);
    const { username, email, password } = req.body;
    console.log('Registering user:', username);
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Missing username, email or password' });
    }

    try {
        const usersCollection = await getUsersCollection();
        const createdAt = new Date();

        const result = await usersCollection.insertOne({
            username,
            email,
            password,
            created_at: createdAt
        });

        res.status(201).json({
            message: 'User registered successfully',
            user_id: result.insertedId
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }
        return res.status(500).json({ error: error.message });
    }
});

// Đăng nhập người dùng
router.post('/login', async (req, res) => {
    console.log('Received login request:', req.body);
    const { username, password } = req.body;
    console.log('Logging in user:', username);
    if (!username || !password) {
        return res.status(400).json({ error: 'Missing username or password' });
    }

    try {
        const usersCollection = await getUsersCollection();
        const user = await usersCollection.findOne({ username, password });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        res.json({
            message: 'Login successful',
            user_id: user._id,
            username: user.username
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Route thống kê
router.get('/stats', async (req, res) => {
    try {
        const { getMeterReadingsCollection, getDevicesCollection } = require('../db/mongodb');

        const readingsCollection = await getMeterReadingsCollection();
        const devicesCollection = await getDevicesCollection();

        const totalReadings = await readingsCollection.countDocuments();
        const totalDevices = await devicesCollection.countDocuments();

        res.json({
            total_readings: totalReadings,
            total_devices: totalDevices
        });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Mount sub-routes
router.use('/devices', devicesRouter);
router.use('/readings', readingsRouter);

module.exports = router;
