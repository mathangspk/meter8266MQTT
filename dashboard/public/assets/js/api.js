const API_BASE = 'http://113.161.220.166:3001/api';

// Helper function to get auth token
const getAuthToken = () => localStorage.getItem('token');

// Helper function to make authenticated requests
const authenticatedFetch = async (url, options = {}) => {
    const token = getAuthToken();
    if (!token) {
        throw new Error('No authentication token found');
    }

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    return fetch(url, {
        ...options,
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    });
};

const API = {
    // Authentication
    async registerUser(data) {
        const response = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return await response.json();
    },

    async loginUser(data) {
        console.log('Attempting login for:', data.username);
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        console.log('Login response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Login failed:', errorText);
            return { error: errorText };
        }

        const result = await response.json();
        console.log('Login result:', result);

        if (result.token) {
            localStorage.setItem('token', result.token);
            localStorage.setItem('username', result.user.username);
            console.log('Token and username stored successfully');
        }

        return result;
    },

    async logoutUser() {
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        return { message: 'Logged out successfully' };
    },

    async getCurrentUser() {
        try {
            const response = await authenticatedFetch(`${API_BASE}/me`);
            if (!response.ok) throw new Error('Failed to get user info');
            return await response.json();
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    },

    // Devices
    async fetchDevices() {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices`);
            if (!response.ok) throw new Error('Failed to fetch devices');
            return await response.json();
        } catch (error) {
            console.error('Error fetching devices:', error);
            return [];
        }
    },

    async fetchDevicesByUser(username) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices/by-user/${encodeURIComponent(username)}`);
            if (!response.ok) throw new Error('Failed to fetch devices for user');
            return await response.json();
        } catch (error) {
            console.error('Error fetching devices by user:', error);
            return [];
        }
    },

    async fetchDeviceDetail(serialNumber) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices/by-serial/${encodeURIComponent(serialNumber)}`);
            if (!response.ok) throw new Error('Failed to fetch device detail');
            return await response.json();
        } catch (error) {
            console.error('Error fetching device detail:', error);
            return null;
        }
    },

    async createDevice(device) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices`, {
                method: 'POST',
                body: JSON.stringify(device)
            });
            return await response.json();
        } catch (error) {
            console.error('Error creating device:', error);
            return { error: 'Failed to create device' };
        }
    },

    async deleteDevice(deviceId) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices/${deviceId}`, {
                method: 'DELETE'
            });
            return await response.json();
        } catch (error) {
            console.error('Error deleting device:', error);
            return { error: 'Failed to delete device' };
        }
    },

    // Readings
    async fetchLatestReading(serialNumber) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices/serial/${encodeURIComponent(serialNumber)}/latest-reading`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('Error fetching latest reading:', error);
            return null;
        }
    },

    async fetchRecentReadings(serialNumber, count) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/devices/serial/${encodeURIComponent(serialNumber)}/readings?limit=${count}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('Error fetching recent readings:', error);
            return [];
        }
    },

    async fetchAggregatedReadings(serialNumber, mode, startDate) {
        try {
            const response = await authenticatedFetch(`${API_BASE}/readings/${encodeURIComponent(serialNumber)}/stats?mode=${mode}&start=${encodeURIComponent(startDate)}`);
            if (!response.ok) throw new Error('Failed to fetch aggregated readings');
            return await response.json();
        } catch (error) {
            console.error('Error fetching aggregated readings:', error);
            return { raw: [] };
        }
    },

    // Stats (public)
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
        return await this.fetchStats();
    },

};
