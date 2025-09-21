const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const devicesRouter = require('./devices_check');
const readingsRouter = require('./readings');
const { getUsersCollection } = require('../db/mongodb');
const { authenticateToken, validateLogin, validateRegister, JWT_SECRET } = require('../middleware/auth');
const mqttHandler = require('../mqtt/handler');
const multer = require('multer');

const router = express.Router();

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/firmware'); // Store files in public/firmware
    },
    filename: (req, file, cb) => {
        const { deviceId } = req.body;
        const filename = `${deviceId}_latest.bin`;
        cb(null, filename);
    }
});

const upload = multer({ storage });

// Rate limiting cho auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // limit each IP to 50 requests per windowMs (tăng cho development)
    message: {
        error: 'Too many authentication attempts, please try again later.',
        retryAfter: '15 minutes'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Đăng ký tài khoản người dùng
router.post('/register', authLimiter, validateRegister, async (req, res) => {
    console.log('Received registration request for user:', req.body.username);
    const { username, email, password } = req.body;

    try {
        const usersCollection = await getUsersCollection();

        // Check if user already exists
        const existingUser = await usersCollection.findOne({
            $or: [{ username }, { email }]
        });

        if (existingUser) {
            return res.status(409).json({ error: 'Username or email already exists' });
        }

        // Hash password
        const saltRounds = 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const createdAt = new Date();

        const result = await usersCollection.insertOne({
            username,
            email,
            password: hashedPassword,
            created_at: createdAt
        });

        res.status(201).json({
            message: 'User registered successfully',
            user_id: result.insertedId
        });
    } catch (error) {
        console.error('Registration error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Đăng nhập người dùng
router.post('/login', authLimiter, validateLogin, async (req, res) => {
    console.log('Received login request for user:', req.body.username);
    const { username, password } = req.body;

    try {
        const usersCollection = await getUsersCollection();
        const user = await usersCollection.findOne({ username });

        if (!user) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid username or password' });
        }

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id.toString(), // Convert ObjectId to string
                username: user.username,
                email: user.email
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            message: 'Login successful',
            token,
            user: {
                user_id: user._id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Protected route - Get current user info
router.get('/me', authenticateToken, async (req, res) => {
    try {
        console.log('GET /api/me called');
        console.log('User from token:', req.user);
        console.log('UserId type:', typeof req.user.userId);
        console.log('UserId value:', req.user.userId);

        const usersCollection = await getUsersCollection();
        console.log('Users collection obtained');

        // Convert string userId back to ObjectId for MongoDB query
        const { ObjectId } = require('mongodb');
        let query;
        try {
            query = { _id: new ObjectId(req.user.userId) };
            console.log('Using ObjectId query:', query);
        } catch (error) {
            console.log('Invalid ObjectId, trying string query');
            query = { _id: req.user.userId };
        }

        const user = await usersCollection.findOne(
            query,
            { projection: { password: 0 } } // Exclude password
        );

        console.log('User found:', user ? 'YES' : 'NO');
        console.log('User data:', user);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({ user });
    } catch (error) {
        console.error('Get user error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
});

// Route thống kê (tạm thời public để test)
router.get('/stats', async (req, res) => {
    try {
        console.log('GET /api/stats called');
        const { getMeterReadingsCollection, getDevicesCollection } = require('../db/mongodb');

        const readingsCollection = await getMeterReadingsCollection();
        const devicesCollection = await getDevicesCollection();

        const totalReadings = await readingsCollection.countDocuments();
        const totalDevices = await devicesCollection.countDocuments();

        console.log('Stats result:', { totalReadings, totalDevices });

        res.json({
            total_readings: totalReadings,
            total_devices: totalDevices
        });
    } catch (error) {
        console.error('Stats error:', error);
        return res.status(500).json({ error: 'Internal server error', details: error.message });
    }
});

// Firmware check endpoint
router.get('/firmware/check', (req, res) => {
    const { deviceId, currentVersion } = req.query;

    // TODO: Thay thế logic này bằng cách kiểm tra phiên bản firmware mới nhất từ database hoặc file
    const latestVersion = '2.0';
    const host = req.get('host'); // Lấy host từ request
    const firmwareUrl = `https://${host}/firmware/${deviceId}_v${latestVersion}.bin`;

    if (latestVersion > currentVersion) {
        res.json({ firmwareUrl, version: latestVersion });
    } else {
        res.json({ message: 'No update available' });
    }
});

router.get('/firmwareUpdateOTA', (req, res) => {
    const { serialNumber, OTAurl } = req.query;

    if (!OTAurl) {
        return res.status(400).json({ error: 'OTA URL is required' });
    }

    // Publish MQTT message to notify ESP32
    mqttHandler.publishFirmwareUpdateOTA(serialNumber, OTAurl);
    console.log(`Firmware update OTA message sent to device ${serialNumber} with OTA URL: ${OTAurl}`);
    res.json({ success: true });

});

router.post('/firmware/upload', upload.single('firmware'), (req, res) => {
    const { deviceId } = req.body;
    const firmwareUrl = `/firmware/${deviceId}_latest.bin`;

    // Publish MQTT message to notify ESP32
    mqttHandler.publishFirmwareUpdate(deviceId, firmwareUrl, 'latest');

    res.json({ success: true });
});

// Mount sub-routes (đã được bảo vệ trong từng file)
router.use('/devices', devicesRouter);
router.use('/readings', readingsRouter);

module.exports = router;