// migrate-to-mongodb.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { connectToMongoDB, getUsersCollection, getDevicesCollection, getMeterReadingsCollection } = require('./db/mongodb');

async function migrateData() {
    console.log('Starting migration from SQLite to MongoDB...');

    // Connect to SQLite
    const sqliteDb = new sqlite3.Database(path.join(__dirname, 'db', 'meter_data.db'));

    try {
        // Connect to MongoDB
        await connectToMongoDB();
        console.log('Connected to MongoDB');

        // Migrate users
        console.log('Migrating users...');
        const usersCollection = await getUsersCollection();
        await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM users', async (err, users) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (users.length > 0) {
                    for (const user of users) {
                        const userDoc = {
                            username: user.username,
                            email: user.email,
                            password: user.password,
                            created_at: new Date(user.created_at)
                        };

                        await usersCollection.updateOne(
                            { username: user.username },
                            { $setOnInsert: userDoc },
                            { upsert: true }
                        );
                    }
                    console.log(`Migrated ${users.length} users`);
                } else {
                    console.log('No users to migrate');
                }
                resolve();
            });
        });

        // Migrate devices
        console.log('Migrating devices...');
        const devicesCollection = await getDevicesCollection();
        await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM devices', async (err, devices) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (devices.length > 0) {
                    for (const device of devices) {
                        const deviceDoc = {
                            serial_number: device.serial_number,
                            device_id: device.device_id,
                            name: device.name,
                            location: device.location,
                            status: device.status,
                            username: device.username,
                            last_seen: device.last_seen ? new Date(device.last_seen) : null,
                            created_at: new Date(device.created_at)
                        };

                        await devicesCollection.updateOne(
                            { serial_number: device.serial_number },
                            { $setOnInsert: deviceDoc },
                            { upsert: true }
                        );
                    }
                    console.log(`Migrated ${devices.length} devices`);
                } else {
                    console.log('No devices to migrate');
                }
                resolve();
            });
        });

        // Migrate meter readings
        console.log('Migrating meter readings...');
        const readingsCollection = await getMeterReadingsCollection();
        await new Promise((resolve, reject) => {
            sqliteDb.all('SELECT * FROM meter_readings', async (err, readings) => {
                if (err) {
                    reject(err);
                    return;
                }

                if (readings.length > 0) {
                    for (const reading of readings) {
                        const readingDoc = {
                            device_id: reading.device_id,
                            serial_number: reading.serial_number,
                            voltage: reading.voltage,
                            current: reading.current,
                            power: reading.power,
                            energy: reading.energy,
                            timestamp: new Date(reading.timestamp)
                        };

                        // Sử dụng device_id + timestamp để tránh duplicate
                        await readingsCollection.updateOne(
                            {
                                device_id: reading.device_id,
                                timestamp: new Date(reading.timestamp)
                            },
                            { $setOnInsert: readingDoc },
                            { upsert: true }
                        );
                    }
                    console.log(`Migrated ${readings.length} meter readings`);
                } else {
                    console.log('No meter readings to migrate');
                }
                resolve();
            });
        });

        console.log('Migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        sqliteDb.close();
        process.exit(0);
    }
}

migrateData();
