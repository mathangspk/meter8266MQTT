// routes/readings.js
const express = require('express');
const db = require('../db/database');

const router = express.Router();

// Lấy tất cả readings, lọc theo thiết bị nếu có
router.get('/', (req, res) => {
    const { limit = 100, device_id } = req.query;

    let query = `SELECT * FROM meter_readings`;
    let params = [];

    if (device_id) {
        query += ` WHERE device_id = ?`;
        params.push(device_id);
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

router.get('/:serial_number/stats', (req, res) => {
    const { serial_number } = req.params;
    const { mode = 'day', start } = req.query;

    if (!start) {
        return res.status(400).json({ error: 'Missing start date' });
    }

    const tzOffset = '+7 hours'; // giờ VN
    const tzOffsetNeg = '-0 hours'; // để đổi ngược sang UTC cho DB

    let groupFormat, endDateSql, labelFormat;

    switch (mode) {
        case 'day':
            groupFormat = "%Y-%m-%d %H:00:00";
            labelFormat = "%H:%M";
            endDateSql = `datetime(datetime(?, '${tzOffsetNeg}'), '+1 day')`; // start local -> UTC, cộng 1 ngày
            break;
        case 'week':
            groupFormat = "%Y-%m-%d";
            labelFormat = "%d/%m";
            endDateSql = `datetime(datetime(?, '${tzOffsetNeg}'), '+7 day')`;
            break;
        case 'month':
            groupFormat = "%Y-%m-%d";
            labelFormat = "%d/%m";
            endDateSql = `datetime(datetime(?, '${tzOffsetNeg}'), '+1 month')`;
            break;
        case 'year':
            groupFormat = "%Y-%m";
            labelFormat = "%m/%Y";
            endDateSql = `datetime(datetime(?, '${tzOffsetNeg}'), '+1 year')`;
            break;
        default:
            return res.status(400).json({ error: 'Invalid mode' });
    }

    const query = `
        SELECT
            strftime('${groupFormat}', datetime(timestamp, '${tzOffset}')) AS period_start,
            strftime('${labelFormat}', datetime(timestamp, '${tzOffset}')) AS label,
            MIN(voltage) AS volt_min,
            MAX(voltage) AS volt_max,
            MIN(current) AS amp_min,
            MAX(current) AS amp_max,
            MAX(energy) - MIN(energy) AS kwh_used
        FROM meter_readings
        WHERE serial_number = ?
          AND timestamp >= datetime(?, '${tzOffsetNeg}')
          AND timestamp < ${endDateSql}
        GROUP BY period_start
        ORDER BY period_start ASC
    `;

    db.all(query, [serial_number, start, start], (err, rows) => {
        if (err) {
            console.error(err);
            return res.status(500).json({ error: err.message });
        }

        const labels = rows.map(r => r.label);
        const datasets = {
            volt_min: rows.map(r => r.volt_min),
            volt_max: rows.map(r => r.volt_max),
            amp_min: rows.map(r => r.amp_min),
            amp_max: rows.map(r => r.amp_max),
            kwh_used: rows.map(r => r.kwh_used)
        };

        res.json({
            labels,
            datasets,
            raw: rows
        });
    });
});


module.exports = router;
