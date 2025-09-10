// db/mongodb.js
const { MongoClient } = require('mongodb');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'meter_dashboard';

let client;
let db;

async function connectToMongoDB() {
    try {
        const options = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };

        client = new MongoClient(MONGODB_URI, options);
        await client.connect();
        console.log('Connected to MongoDB');

        db = client.db(DB_NAME);

        // Tạo indexes cho performance
        await createIndexes();

        return db;
    } catch (error) {
        console.error('MongoDB connection error:', error);
        throw error;
    }
}

async function createIndexes() {
    try {
        // Indexes cho users collection
        await db.collection('users').createIndex({ username: 1 }, { unique: true });
        await db.collection('users').createIndex({ email: 1 }, { unique: true });

        // Indexes cho devices collection
        await db.collection('devices').createIndex({ serial_number: 1 }, { unique: true });
        await db.collection('devices').createIndex({ username: 1 });
        await db.collection('devices').createIndex({ last_seen: -1 });

        // Indexes cho meter_readings collection
        await db.collection('meter_readings').createIndex({ device_id: 1, timestamp: -1 });
        await db.collection('meter_readings').createIndex({ serial_number: 1, timestamp: -1 });
        await db.collection('meter_readings').createIndex({ timestamp: -1 });

        console.log('MongoDB indexes created successfully');
    } catch (error) {
        console.error('Error creating indexes:', error);
    }
}

async function getDB() {
    if (!db) {
        await connectToMongoDB();
    }
    return db;
}

async function closeConnection() {
    if (client) {
        await client.close();
        console.log('MongoDB connection closed');
    }
}

// Collections
async function getUsersCollection() {
    try {
        console.log('Getting users collection...');
        const database = await getDB();
        console.log('Database obtained, getting users collection');
        const collection = database.collection('users');
        console.log('Users collection obtained successfully');
        return collection;
    } catch (error) {
        console.error('Error getting users collection:', error);
        throw error;
    }
}

async function getDevicesCollection() {
    const database = await getDB();
    return database.collection('devices');
}

async function getMeterReadingsCollection() {
    const database = await getDB();
    return database.collection('meter_readings');
}

module.exports = {
    connectToMongoDB,
    getDB,
    closeConnection,
    getUsersCollection,
    getDevicesCollection,
    getMeterReadingsCollection
};
