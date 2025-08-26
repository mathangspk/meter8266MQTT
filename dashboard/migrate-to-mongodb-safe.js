// migrate-to-mongodb-safe.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const { connectToMongoDB, getUsersCollection, getDevicesCollection, getMeterReadingsCollection } = require('./db/mongodb');

async function migrateData() {
    console.log('Starting safe migration from SQLite to MongoDB...');

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
                    let migratedCount = 0;
                    for (const user of users) {
                        try {
                            // Kiểm tra xem user đã tồn tại chưa
                            const existingUser = await usersCollection.findOne({
                                $or: [
                                    { username: user.username },
                                    { email: user.email }
                                ]
                            });

                            if (!existingUser) {
                                const userDoc = {
                                    username: user.username,
                                    email: user.email,
                                    password: user.password,
                                    created_at: new Date(user.created_at)
                                };

                                await usersCollection.insertOne(userDoc);
                                migratedCount++;
                            } else {
                                console.log(`User ${user.username} already exists, skipping...`);
                            }
                        } catch (error) {
                            console.error(`Error migrating user ${user.username}:`, error.message);
                        }
                    }
                    console.log(`Migrated ${migratedCount} new users`);
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
                    let migratedCount = 0;
                    for (const device of devices) {
                        try {
                            // Kiểm tra xem device đã tồn tại chưa
                            const existingDevice = await devicesCollection.findOne({
                                serial_number: device.serial_number
                            });

                            if (!existingDevice) {
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

                                await devicesCollection.insertOne(deviceDoc);
                                migratedCount++;
                            } else {
                                console.log(`Device ${device.serial_number} already exists, skipping...`);
                            }
                        } catch (error) {
                            console.error(`Error migrating device ${device.serial_number}:`, error.message);
                        }
                    }
                    console.log(`Migrated ${migratedCount} new devices`);
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
                    let migratedCount = 0;
                    for (const reading of readings) {
                        try {
                            const timestamp = new Date(reading.timestamp);

                            // Kiểm tra xem reading đã tồn tại chưa
                            const existingReading = await readingsCollection.findOne({
                                device_id: reading.device_id,
                                timestamp: timestamp
                            });

                            if (!existingReading) {
                                const readingDoc = {
                                    device_id: reading.device_id,
                                    serial_number: reading.serial_number,
                                    voltage: reading.voltage,
                                    current: reading.current,
                                    power: reading.power,
                                    energy: reading.energy,
                                    timestamp: timestamp
                                };

                                await readingsCollection.insertOne(readingDoc);
                                migratedCount++;
                            } else {
                                console.log(`Reading for device ${reading.device_id} at ${timestamp} already exists, skipping...`);
                            }
                        } catch (error) {
                            console.error(`Error migrating reading for device ${reading.device_id}:`, error.message);
                        }
                    }
                    console.log(`Migrated ${migratedCount} new meter readings`);
                } else {
                    console.log('No meter readings to migrate');
                }
                resolve();
            });
        });

        console.log('Safe migration completed successfully!');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        sqliteDb.close();
        process.exit(0);
    }
}

migrateData();

