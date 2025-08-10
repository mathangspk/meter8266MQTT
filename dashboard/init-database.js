const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

// Database file path
const dbPath = path.join(__dirname, 'data', 'dashboard.db');

// Create database directory if it doesn't exist
const fs = require('fs');
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create database connection
const db = new sqlite3.Database(dbPath);

console.log('🔧 Initializing Dashboard Database...');

// Create tables
db.serialize(() => {
    // Users table
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Devices table
    db.run(`CREATE TABLE IF NOT EXISTS devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        serial_number VARCHAR(50) UNIQUE NOT NULL,
        device_id VARCHAR(50) NOT NULL,
        name VARCHAR(100),
        location VARCHAR(200),
        description TEXT,
        status VARCHAR(20) DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // User-Device relationships
    db.run(`CREATE TABLE IF NOT EXISTS user_devices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        device_id INTEGER NOT NULL,
        permission_level VARCHAR(20) DEFAULT 'read',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (device_id) REFERENCES devices (id),
        UNIQUE(user_id, device_id)
    )`);

    // Meter readings table
    db.run(`CREATE TABLE IF NOT EXISTS meter_readings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        serial_number VARCHAR(50) NOT NULL,
        voltage REAL,
        current REAL,
        power REAL,
        energy REAL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices (id)
    )`);

    // Device status history
    db.run(`CREATE TABLE IF NOT EXISTS device_status (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        device_id INTEGER NOT NULL,
        status VARCHAR(20) NOT NULL,
        message TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (device_id) REFERENCES devices (id)
    )`);

    console.log('✅ Database tables created successfully!');

    // Create indexes for better performance
    db.run('CREATE INDEX IF NOT EXISTS idx_meter_readings_device_timestamp ON meter_readings(device_id, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_meter_readings_serial_timestamp ON meter_readings(serial_number, timestamp)');
    db.run('CREATE INDEX IF NOT EXISTS idx_user_devices_user_id ON user_devices(user_id)');
    db.run('CREATE INDEX IF NOT EXISTS idx_user_devices_device_id ON user_devices(device_id)');

    console.log('✅ Database indexes created successfully!');

    // Insert default admin user
    const adminPassword = 'admin123';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    db.run(`INSERT OR IGNORE INTO users (username, email, password_hash, full_name, role) 
            VALUES (?, ?, ?, ?, ?)`,
        ['admin', 'admin@example.com', hashedPassword, 'System Administrator', 'admin'],
        function (err) {
            if (err) {
                console.error('❌ Error creating admin user:', err);
            } else {
                console.log('✅ Default admin user created:');
                console.log('   Username: admin');
                console.log('   Password: admin123');
            }
        });

    // Insert sample devices
    const sampleDevices = [
        ['SN001', '1', 'Meter 1', 'Living Room', 'Main electricity meter'],
        ['SN002', '2', 'Meter 2', 'Kitchen', 'Kitchen appliances meter'],
        ['SN003', '3', 'Meter 3', 'Bedroom', 'Bedroom electricity meter']
    ];

    sampleDevices.forEach(([serial, deviceId, name, location, description]) => {
        db.run(`INSERT OR IGNORE INTO devices (serial_number, device_id, name, location, description) 
                VALUES (?, ?, ?, ?, ?)`,
            [serial, deviceId, name, location, description],
            function (err) {
                if (err) {
                    console.error(`❌ Error creating device ${serial}:`, err);
                } else {
                    console.log(`✅ Sample device created: ${serial} - ${name}`);
                }
            });
    });

    // Assign all devices to admin user
    db.run(`INSERT OR IGNORE INTO user_devices (user_id, device_id, permission_level)
            SELECT u.id, d.id, 'admin'
            FROM users u, devices d
            WHERE u.username = 'admin'`,
        function (err) {
            if (err) {
                console.error('❌ Error assigning devices to admin:', err);
            } else {
                console.log('✅ All devices assigned to admin user');
            }
        });
});

// Close database connection
db.close((err) => {
    if (err) {
        console.error('❌ Error closing database:', err);
    } else {
        console.log('✅ Database initialization completed!');
        console.log('📁 Database file:', dbPath);
    }
}); 