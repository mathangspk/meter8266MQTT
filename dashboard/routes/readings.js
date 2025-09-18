// routes/readings.js
const express = require('express');
const { getMeterReadingsCollection, getDevicesCollection } = require('../db/mongodb');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Lấy tất cả readings của user hiện tại
router.get('/', authenticateToken, async (req, res) => {
    try {
        const { limit = 100, device_id } = req.query;
        const readingsCollection = await getMeterReadingsCollection();
        const devicesCollection = await getDevicesCollection();

        let filter = {};

        if (device_id) {
            // Kiểm tra quyền sở hữu device cụ thể
            const device = await devicesCollection.findOne({
                device_id: device_id,
                username: req.user.username
            });
            if (!device) {
                return res.status(404).json({ error: 'Device not found or access denied' });
            }
            filter.device_id = device_id;
        } else {
            // Lấy tất cả device_ids của user hiện tại
            const userDevices = await devicesCollection.find(
                { username: req.user.username },
                { projection: { device_id: 1 } }
            ).toArray();

            const userDeviceIds = userDevices.map(d => d.device_id);
            if (userDeviceIds.length === 0) {
                return res.json([]);
            }
            filter.device_id = { $in: userDeviceIds };
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

// Lấy reading mới nhất (chỉ user sở hữu device mới xem được)
router.get('/:serial_number/latest-reading', authenticateToken, async (req, res) => {
    const { serial_number } = req.params;
    try {
        // Kiểm tra quyền sở hữu device
        const devicesCollection = await getDevicesCollection();
        const device = await devicesCollection.findOne({
            serial_number: serial_number,
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const readingsCollection = await getMeterReadingsCollection();
        const reading = await readingsCollection.findOne(
            { serial_number },
            { projection: { voltage: 1, current: 1, power: 1, energy: 1, timestamp: 1, _id: 0 } }
        );
        res.json(reading || {});
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

// Lấy nhiều readings theo serial (chỉ user sở hữu device mới xem được)
router.get('/:serial_number/readings', authenticateToken, async (req, res) => {
    const { serial_number } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    try {
        // Kiểm tra quyền sở hữu device
        const devicesCollection = await getDevicesCollection();
        const device = await devicesCollection.findOne({
            serial_number: serial_number,
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

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

// ==========================
// 📊 API thống kê (day, week, month, year) - chỉ user sở hữu device mới xem được
// ==========================
router.get('/:serial_number/stats', authenticateToken, async (req, res) => {
    const { serial_number } = req.params;
    const { mode = 'day', start } = req.query;

    if (!start) return res.status(400).json({ error: 'Missing start date' });

    try {
        // Kiểm tra quyền sở hữu device
        const devicesCollection = await getDevicesCollection();
        const device = await devicesCollection.findOne({
            serial_number: serial_number,
            username: req.user.username
        });

        if (!device) {
            return res.status(404).json({ error: 'Device not found or access denied' });
        }

        const readingsCollection = await getMeterReadingsCollection();
        const startDate = new Date(start + "T00:00:00"); // Use local timezone for date parsing
        let endDate, groupBy, labelFormat, queryStart, queryEnd;

        switch (mode) {
            case 'day':
                endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                // Process and display everything in UTC+7 for consistency
                groupBy = { $dateToString: { format: "%Y-%m-%d %H:00:00", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                labelFormat = { $dateToString: { format: "%H:00", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                // Adjust date range for UTC+7 processing
                queryStart = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
                queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);
                break;
            case 'week':
                // Calculate proper week boundaries (Monday to Sunday)
                const startOfWeek = new Date(startDate);
                const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.

                // Adjust to Monday of the selected week
                const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days; otherwise adjust to Monday
                startOfWeek.setDate(startDate.getDate() + mondayOffset);
                startOfWeek.setHours(0, 0, 0, 0);

                // End date is Sunday of the same week
                endDate = new Date(startOfWeek);
                endDate.setDate(startOfWeek.getDate() + 7);
                endDate.setHours(0, 0, 0, 0);

                // Process and display in UTC+7 for consistency
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                labelFormat = { $dateToString: { format: "%d/%m", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                // Adjust week date range for UTC+7 processing
                queryStart = new Date(startOfWeek.getTime() - 7 * 60 * 60 * 1000);
                queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);
                break;
            case 'month':
                endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 1);
                // Process and display in UTC+7 for consistency
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                labelFormat = { $dateToString: { format: "%d/%m", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                // Adjust month date range for UTC+7 processing
                queryStart = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
                queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);
                break;
            case 'year':
                endDate = new Date(startDate.getFullYear() + 1, 0, 1);
                // Process and display in UTC+7 for consistency
                groupBy = { $dateToString: { format: "%Y-%m", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                labelFormat = { $dateToString: { format: "%m/%Y", date: { $add: ["$timestamp", 7 * 3600 * 1000] } } };
                // Adjust year date range for UTC+7 processing
                queryStart = new Date(startDate.getTime() - 7 * 60 * 60 * 1000);
                queryEnd = new Date(endDate.getTime() - 7 * 60 * 60 * 1000);
                break;
            default:
                return res.status(400).json({ error: 'Invalid mode' });
        }

        // queryStart and queryEnd are now set in each case above

        const pipeline = [
            {
                $match: {
                    serial_number,
                    timestamp: { $gte: queryStart, $lt: queryEnd }
                }
            },
            // Phải sort trước khi group!
            { $sort: { timestamp: 1 } },
            {
                $group: {
                    _id: groupBy,
                    label: { $first: labelFormat },
                    volt_min: { $min: "$voltage" },
                    volt_max: { $max: "$voltage" },
                    amp_min: { $min: "$current" },
                    amp_max: { $max: "$current" },
                    energy_start: { $first: "$energy" }, // sau sort => giá trị nhỏ nhất thời gian
                    energy_end: { $last: "$energy" }     // sau sort => giá trị lớn nhất thời gian
                }
            },
            {
                $addFields: {
                    kwh_used: { $subtract: ["$energy_end", "$energy_start"] }
                }
            },
            { $sort: { _id: 1 } }
        ];


        const results = await readingsCollection.aggregate(pipeline).toArray();

        // =============== Build fixed buckets ===============
        const pad2 = (n) => String(n).padStart(2, '0');
        const bucketLabels = [];
        if (mode === 'day') {
            for (let h = 0; h < 24; h++) bucketLabels.push(`${pad2(h)}:00`);
        } else if (mode === 'week') {
            // Generate labels from Monday to Sunday of the selected week
            const weekStart = new Date(startDate);
            const dayOfWeek = startDate.getDay();

            // Find Monday of the selected week
            const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            weekStart.setDate(startDate.getDate() + mondayOffset);

            for (let i = 0; i < 7; i++) {
                const d = new Date(weekStart.getTime() + i * 24 * 3600 * 1000);
                bucketLabels.push(`${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}`);
            }
        } else if (mode === 'month') {
            const year = startDate.getFullYear();
            const month = startDate.getMonth();
            const daysInMonth = new Date(year, month + 1, 0).getDate();
            for (let d = 1; d <= daysInMonth; d++) {
                bucketLabels.push(`${pad2(d)}/${pad2(month + 1)}`);
            }
        } else if (mode === 'year') {
            const year = startDate.getFullYear();
            for (let m = 1; m <= 12; m++) bucketLabels.push(`${pad2(m)}/${year}`);
        }

        const byLabel = new Map(results.map(r => [r.label, r]));
        const filled = bucketLabels.map(label => {
            const r = byLabel.get(label);
            return r || { label, volt_min: "N/A", volt_max: "N/A", amp_min: "N/A", amp_max: "N/A", kwh_used: 0 };
        });

        res.json({ labels: bucketLabels, raw: filled });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});

module.exports = router;
