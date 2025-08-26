const express = require('express');
const { getDevicesCollection, getMeterReadingsCollection } = require('../db/mongodb');
const router = express.Router();

/**
 * Lấy tất cả thiết bị (order by last_seen desc)
 */
router.get('/', async (req, res) => {
    try {
        const devicesCollection = await getDevicesCollection();
        const devices = await devicesCollection
            .find({})
            .sort({ last_seen: -1 })
            .toArray();
        res.json(devices);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy thiết bị theo username
 */
router.get('/by-user/:username', async (req, res) => {
    const { username } = req.params;
    try {
        const devicesCollection = await getDevicesCollection();
        const devices = await devicesCollection
            .find({ username })
            .toArray();
        res.json(devices);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy thiết bị theo serial_number
 */
router.get('/by-serial/:serial_number', async (req, res) => {
    const { serial_number } = req.params;
    try {
        const devicesCollection = await getDevicesCollection();
        const device = await devicesCollection.findOne({ serial_number });
        res.json(device);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy reading mới nhất theo serial_number
 */
router.get('/serial/:serial_number/latest-reading', async (req, res) => {
    const { serial_number } = req.params;
    try {
        const readingsCollection = await getMeterReadingsCollection();
        const reading = await readingsCollection
            .findOne(
                { serial_number },
                { projection: { voltage: 1, current: 1, power: 1, energy: 1, timestamp: 1, _id: 0 } }
            );
        res.json(reading || {});
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy readings theo serial_number
 */
router.get('/serial/:serial_number/readings', async (req, res) => {
    const { serial_number } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    try {
        const readingsCollection = await getMeterReadingsCollection();
        const readings = await readingsCollection
            .find(
                { serial_number },
                { projection: { voltage: 1, current: 1, power: 1, energy: 1, timestamp: 1, _id: 0 } }
            )
            .sort({ timestamp: -1 })
            .limit(limit)
            .toArray();
        res.json(readings);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Lấy readings theo device_id
 */
router.get('/id/:deviceId/readings', async (req, res) => {
    const { deviceId } = req.params;
    const { limit = 100, from, to } = req.query;

    try {
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
router.post('/', async (req, res) => {
    const { serial_number, device_id, name, location, status, username } = req.body;
    if (!serial_number || !device_id || !username) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const devicesCollection = await getDevicesCollection();
        const result = await devicesCollection.insertOne({
            serial_number,
            device_id,
            name: name || '',
            location: location || '',
            status: status || 'active',
            username,
            created_at: new Date()
        });
        res.status(201).json({ id: result.insertedId });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

/**
 * Xóa thiết bị theo id
 */
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const devicesCollection = await getDevicesCollection();
        const { ObjectId } = require('mongodb');
        const result = await devicesCollection.deleteOne({ _id: new ObjectId(id) });

        if (result.deletedCount === 0) {
            return res.status(404).json({ error: 'Device not found' });
        }
        res.json({ message: 'Device deleted' });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
