const API_BASE = '/api';

const API = {
    logoutUser() {
        try {
            localStorage.removeItem('username');
            return { message: 'Logged out' };
        } catch (_) {
            return { message: 'Logged out' };
        }
    },
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

    //API xoá thiết bị
    async deleteDevice(deviceId) {
        const response = await fetch(`${API_BASE}/devices/${deviceId}`, {
            method: 'DELETE'
        });
        return await response.json();
    },

    async fetchReadings(deviceId = null) {
        try {
            let url = `${API_BASE}/readings`;
            if (deviceId) url += `?device_id=${encodeURIComponent(deviceId)}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Failed to fetch readings');
            return await response.json();
        } catch (error) {
            console.error('Error fetching readings:', error);
            return [];
        }
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

    async fetchLatestReading(serialNumber) {
        const response = await fetch(`${API_BASE}/readings/${encodeURIComponent(serialNumber)}/latest-reading`);
        if (!response.ok) return null;
        return await response.json();
    },

    async fetchRecentReadings(serialNumber, count) {
        console.log('Fetching recent readings for', serialNumber, 'with count', count);
        //const response = await fetch(`${API_BASE}/devices/${encodeURIComponent(serialNumber)}/readings?limit=${count}`);
        const response = await fetch(`${API_BASE}/readings/${encodeURIComponent(serialNumber)}/readings?limit=${count}`);
        if (!response.ok) return [];
        return await response.json();
    },

    async fetchAggregatedReadings(serialNumber, mode, startDate) {
        console.log('Fetching aggregated readings for', serialNumber, 'mode:', mode, 'startDate:', startDate);
        const url = `${API_BASE}/readings/${encodeURIComponent(serialNumber)}/stats?mode=${mode}&start=${encodeURIComponent(startDate)}`;
        const response = await fetch(url);
        console.log('Aggregated readings response:', response);
        if (!response.ok) throw new Error('Failed to fetch aggregated readings');
        return await response.json();
    },

};
