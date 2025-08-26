// routes/readings.js
const express = require('express');
const { getMeterReadingsCollection } = require('../db/mongodb');

const router = express.Router();

// Lấy tất cả readings, lọc theo thiết bị nếu có
router.get('/', async (req, res) => {
    try {
        const { limit = 100, device_id } = req.query;
        const readingsCollection = await getMeterReadingsCollection();

        let filter = {};
        if (device_id) {
            filter.device_id = device_id;
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
router.get('/:serial_number/latest-reading', async (req, res) => {
    console.log('Fetching latest reading for serial:', req.params.serial_number);
    console.log('Query params:', req.query);
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
router.get('/:serial_number/readings', async (req, res) => {
    console.log('Fetching readings for serial:', req.params.serial_number);
    console.log('Query params:', req.query);

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

router.get('/:serial_number/stats', async (req, res) => {
    const { serial_number } = req.params;
    const { mode = 'day', start } = req.query;

    if (!start) {
        return res.status(400).json({ error: 'Missing start date' });
    }

    try {
        const readingsCollection = await getMeterReadingsCollection();
        const startDate = new Date(start);
        let endDate, groupBy, labelFormat;

        switch (mode) {
            case 'day':
                endDate = new Date(startDate.getTime() + 24 * 60 * 60 * 1000);
                groupBy = { $dateToString: { format: "%Y-%m-%d %H:00:00", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                labelFormat = { $dateToString: { format: "%H:%M", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                break;
            case 'week':
                endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                labelFormat = { $dateToString: { format: "%d/%m", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                break;
            case 'month':
                endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate());
                groupBy = { $dateToString: { format: "%Y-%m-%d", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                labelFormat = { $dateToString: { format: "%d/%m", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                break;
            case 'year':
                endDate = new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate());
                groupBy = { $dateToString: { format: "%Y-%m", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                labelFormat = { $dateToString: { format: "%m/%Y", date: { $add: ["$timestamp", 7 * 60 * 60 * 1000] } } };
                break;
            default:
                return res.status(400).json({ error: 'Invalid mode' });
        }

        const pipeline = [
            {
                $match: {
                    serial_number: serial_number,
                    timestamp: { $gte: startDate, $lt: endDate }
                }
            },
            {
                $group: {
                    _id: groupBy,
                    label: { $first: labelFormat },
                    volt_min: { $min: "$voltage" },
                    volt_max: { $max: "$voltage" },
                    amp_min: { $min: "$current" },
                    amp_max: { $max: "$current" },
                    energy_start: { $min: "$energy" },
                    energy_end: { $max: "$energy" }
                }
            },
            {
                $addFields: {
                    kwh_used: { $subtract: ["$energy_end", "$energy_start"] }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ];

        const results = await readingsCollection.aggregate(pipeline).toArray();

        const labels = results.map(r => r.label);
        const datasets = {
            volt_min: results.map(r => r.volt_min),
            volt_max: results.map(r => r.volt_max),
            amp_min: results.map(r => r.amp_min),
            amp_max: results.map(r => r.amp_max),
            kwh_used: results.map(r => r.kwh_used)
        };

        res.json({
            labels,
            datasets,
            raw: results
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ error: error.message });
    }
});


module.exports = router;
