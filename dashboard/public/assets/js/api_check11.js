const API_BASE = '/api';

const API = {
    async registerUser(data) {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async loginUser(data) {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async fetchDevices() {
        try {
            const response = await fetch(`${API_BASE}/devices`);
            if (!response.ok) throw new Error('Failed to fetch devices');
            return await response.json();
        } catch (error) {
            console.error('Error fetching devices:', error);
            return [];
        }
    },

    async fetchDevicesByUser(username) {
        try {
            const response = await fetch(`${API_BASE}/devices/by-user/${encodeURIComponent(username)}`);
            if (!response.ok) throw new Error('Failed to fetch devices for user');
            return await response.json();
        } catch (error) {
            console.error('Error fetching devices by user:', error);
            return [];
        }
    },

    async deleteDevice(deviceId) {
        const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    async fetchDeviceDetail(serialNumber) {
        const response = await fetch(`${API_BASE}/devices/by-serial/${encodeURIComponent(serialNumber)}`);
        if (!response.ok) throw new Error('Failed to fetch device detail');
        return await response.json();
    },

    async fetchStats() {
        try {
            const response = await fetch(`${API_BASE}/stats`);
            if (!response.ok) throw new Error('Failed to fetch stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            return { total_readings: 0, total_devices: 0 };
        }
    },

    async fetchDashboardData() {
        const response = await fetch(`${API_BASE}/stats`);
        return await response.json();
    },

    async createDevice(device) {
        const response = await fetch(`${API_BASE}/devices`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(device)
        });
        return await response.json();
    },

    /**
     * Lấy reading mới nhất theo serial_number
     */
    async fetchLatestReading(serialNumber) {
        const response = await fetch(
            `${API_BASE}/devices/serial/${encodeURIComponent(serialNumber)}/latest-reading`
        );
        if (!response.ok) return null;
        return await response.json();
    },

    /**
     * Lấy readings theo serial_number
     */
    async fetchRecentReadings(serialNumber, count) {
        const response = await fetch(
            `${API_BASE}/devices/serial/${encodeURIComponent(serialNumber)}/readings?limit=${count}`
        );
        if (!response.ok) return [];
        return await response.json();
    },

    /**
     * Lấy readings theo device_id
     */
    async fetchRecentReadingsById(deviceId, count) {
        const response = await fetch(
            `${API_BASE}/devices/id/${encodeURIComponent(deviceId)}/readings?limit=${count}`
        );
        if (!response.ok) return [];
        return await response.json();
    }
};

export default API;
