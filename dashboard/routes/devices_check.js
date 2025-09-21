const express = require('express');
const { getDevicesCollection, getMeterReadingsCollection } = require('../db/mongodb');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

/**
 * Lấy tất cả thiết bị của user hiện tại
 */
router.get('/', authenticateToken, async (req, res) => {
    try {
        const devicesCollection = await getDevicesCollection();
        const devices = await devicesCollection
            .find({ username: req.user.username })
            .sort({ last_seen: -1 })
            .toArray();
        res.json(devices);
    } catch (error) {
        console.error('Get devices error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy thiết bị theo username (chỉ user đó mới xem được)
 */
router.get('/by-user/:username', authenticateToken, async (req, res) => {
    // Chỉ cho phép user xem thiết bị của chính mình
    if (req.user.username !== req.params.username) {
        return res.status(403).json({ error: 'Access denied' });
    }

    try {
        const devicesCollection = await getDevicesCollection();
        const devices = await devicesCollection
            .find({ username: req.params.username })
            .toArray();
        res.json(devices);
    } catch (error) {
        console.error('Get devices by user error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy thiết bị theo serial_number
 */
/**
 * Lấy thiết bị theo serial_number (chỉ user sở hữu mới xem được)
 */
router.get('/by-serial/:serial_number', authenticateToken, async (req, res) => {
    try {
        const devicesCollection = await getDevicesCollection();
        const device = await devicesCollection.findOne({
            serial_number: req.params.serial_number,
            username: req.user.username // Chỉ device của user hiện tại
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        res.json(device);
    } catch (error) {
        console.error('Get device by serial error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy reading mới nhất theo serial_number
 */
/**
 * Lấy reading mới nhất theo serial_number
 */
router.get('/serial/:serial_number/latest-reading', authenticateToken, async (req, res) => {
    try {
        const devicesCollection = await getDevicesCollection();
        // Kiểm tra quyền sở hữu device
        const device = await devicesCollection.findOne({
            serial_number: req.params.serial_number,
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const readingsCollection = await getMeterReadingsCollection();
        const reading = await readingsCollection
            .findOne(
                { serial_number: req.params.serial_number },
                {
                    projection: { voltage: 1, current: 1, power: 1, energy: 1, timestamp: 1, _id: 0 },
                    sort: { timestamp: -1 }
                }
            );
        res.json(reading || {});
    } catch (error) {
        console.error('Get latest reading error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy readings theo serial_number
 */
/**
 * Lấy readings theo serial_number
 */
router.get('/serial/:serial_number/readings', authenticateToken, async (req, res) => {
    try {
        const devicesCollection = await getDevicesCollection();
        // Kiểm tra quyền sở hữu device
        const device = await devicesCollection.findOne({
            serial_number: req.params.serial_number,
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const limit = parseInt(req.query.limit, 10) || 10;
        const readingsCollection = await getMeterReadingsCollection();
        const readings = await readingsCollection
            .find(
                { serial_number: req.params.serial_number },
                { projection: { voltage: 1, current: 1, power: 1, energy: 1, timestamp: 1, _id: 0 } }
            )
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
        res.json(readings);
    } catch (error) {
        console.error('Get readings error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy readings theo device_id (chỉ user sở hữu mới xem được)
 */
router.get('/id/:deviceId/readings', authenticateToken, async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;

    try {
        // Kiểm tra quyền sở hữu device
        const devicesCollection = await getDevicesCollection();
        const device = await devicesCollection.findOne({
            device_id: deviceId,
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const readingsCollection = await getMeterReadingsCollection();
        let filter = { device_id: deviceId };

        if (from && to) {
            filter.timestamp = { $gte: new Date(from), $lte: new Date(to) };
        }

        const readings = await readingsCollection
            .find(filter)
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .toArray();
        res.json(readings);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Thêm thiết bị mới
 */
/**
 * Thêm thiết bị mới
 */
router.post('/', authenticateToken, async (req, res) => {
    const { serial_number, device_id, name, location, status } = req.body;

    if (!serial_number || !device_id) {
        return res.status(400).json({ error: 'Missing required fields: serial_number, device_id' });
    }

    try {
        const devicesCollection = await getDevicesCollection();

        // Check if device already exists
        const existingDevice = await devicesCollection.findOne({
            $or: [
                { serial_number },
                { device_id }
            ]
        });

        if (existingDevice) {
            return res.status(409).json({ error: 'Device with this serial number or device ID already exists' });
        }

        const result = await devicesCollection.insertOne({
            serial_number,
            device_id,
            name: name || '',
            location: location || '',
            status: status || 'active',
            username: req.user.username, // Gán cho user hiện tại
            created_at: new Date()
        });

        res.status(201).json({
            id: result.insertedId,
            message: 'Device created successfully'
        });
    } catch (error) {
        console.error('Create device error:', error);
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Xóa thiết bị theo id
 */
/**
 * Xóa thiết bị
 */
router.delete('/:id', authenticateToken, async (req, res) => {
    try {
        const devicesCollection = await getDevicesCollection();
        const { ObjectId } = require('mongodb');

        // Kiểm tra quyền sở hữu trước khi xóa
        const device = await devicesCollection.findOne({
            _id: new ObjectId(req.params.id),
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const result = await devicesCollection.deleteOne({
            _id: new ObjectId(req.params.id),
            username: req.user.username // Double check ownership
        });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }

        res.json({ message: 'Device deleted successfully' });
    } catch (error) {
        console.error('Delete device error:', error);
        return res.status(500).json({ error: error.message });
    }
});

// Update device theo serial_number
router.put('/serial/:serial_number', authenticateToken, async (req, res) => {
    try {
        const { name, location, ota_url, status } = req.body;
        const devicesCollection = await getDevicesCollection();

        // Chỉ update nếu device thuộc về user hiện tại
        const result = await devicesCollection.updateOne(
            { serial_number: req.params.serial_number, username: req.user.username },
            { $set: { name, location, ota_url, status, updated_at: new Date() } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        res.json({ message: 'Device updated successfully' });
    } catch (error) {
        console.error('Update device error:', error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
