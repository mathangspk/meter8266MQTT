const UI = {
    async showDashboard() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/dashboard.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        const username = localStorage.getItem('username');
        const data = await API.fetchDashboardData(username);
        document.getElementById('totalPower').innerText = Utils.formatPower(data.totalPower ?? 0);
        document.getElementById('lastUpdated').innerText = Utils.formatDate(data.timestamp);
    },

    async showDeviceList() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/device-list.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        const username = localStorage.getItem('username');
        if (!username) {
            alert('Please log in to view devices.');
            this.updateAuthButton(false);
            return;
        }
        const devices = await API.fetchDevicesByUser(username);
        console.log('Fetched devices:', devices);
        const container = document.getElementById('deviceContainer');
        container.innerHTML = devices.map(device => `
            <li>
                <strong>${device.name ?? 'No name'}</strong><br>
                Serial: ${device.serial_number}<br>
                Last active: ${Utils.formatDate(device.last_seen)}<br>
                <button class="detail-device-btn" data-serial="${device.serial_number}">Xem chi tiết</button>
                <button class="delete-device-btn" data-id="${device.id}">Xóa thiết bị</button>
            </li>
        `).join('');

        document.getElementById('addDeviceBtn').onclick = async () => {
            const devices = await API.fetchDevices();
            let maxSN = 0;
            devices.forEach(d => {
                const snNum = parseInt(d.serial_number.replace('SN', ''));
                if (!isNaN(snNum) && snNum > maxSN) maxSN = snNum;
            });
            const newSN = 'SN' + String(maxSN + 1).padStart(3, '0');
            const exists = devices.some(d => d.serial_number === newSN);
            if (exists) {
                alert('Thiết bị với serial number này đã tồn tại!');
                return;
            }
            const username = localStorage.getItem('username');
            const newDevice = {
                serial_number: newSN,
                device_id: String(devices.length + 1),
                name: 'ESP8266',
                location: '',
                status: 'active',
                username
            };
            const result = await API.createDevice(newDevice);
            if (result.error) {
                alert('Lỗi: ' + result.error);
            } else {
                alert('Đã thêm thiết bị mới: ' + newSN);
                UI.showDeviceList();
            }
        };

        document.querySelectorAll('.delete-device-btn').forEach(btn => {
            btn.onclick = async () => {
                if (confirm('Bạn có chắc muốn xóa thiết bị này?')) {
                    const deviceId = btn.getAttribute('data-id');
                    const result = await API.deleteDevice(deviceId);
                    if (result.error) {
                        alert('Lỗi: ' + result.error);
                    } else {
                        alert('Đã xóa thiết bị!');
                        UI.showDeviceList();
                    }
                }
            };
        });

        document.querySelectorAll('.detail-device-btn').forEach(btn => {
            btn.onclick = async () => {
                const serialNumber = btn.getAttribute('data-serial');
                UI.showDeviceDetail(serialNumber);
            };
        });
    },

    async showDeviceDetail(serialNumber) {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/device-detail.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        const data = await API.fetchDeviceDetail(serialNumber);
        document.getElementById('deviceSerial').innerText = data.serial_number ?? '';
        document.getElementById('deviceName').innerText = data.name ?? '';
        document.getElementById('deviceLocation').innerText = data.location ?? '';
        document.getElementById('deviceStatus').innerText = data.status ?? '';
        document.getElementById('deviceLastSeen').innerText = data.last_seen ?? '';

        async function updateLatestReading() {
            const reading = await API.fetchLatestReading(serialNumber);
            document.getElementById('deviceVoltage').innerText = reading?.voltage ?? 'N/A';
            document.getElementById('deviceCurrent').innerText = reading?.current ?? 'N/A';
            document.getElementById('devicePower').innerText = reading?.power ?? 'N/A';
            document.getElementById('deviceEnergy').innerText = reading?.energy ?? 'N/A';
        }

        updateLatestReading();
        window.latestReadingInterval = setInterval(updateLatestReading, 5000);

        // ------------------- Thêm xử lý cho bảng thống kê -------------------
        const modeSelect = document.getElementById('statsMode');
        const startDateInput = document.getElementById('statsStart');

        async function renderStatsTable() {
            const mode = modeSelect.value;
            const start = startDateInput.value;
            if (!start) return alert("Vui lòng chọn ngày bắt đầu");

            const stats = await API.fetchAggregatedReadings(serialNumber, mode, start);
            const tbody = document.querySelector('#statsTable tbody');
            console.log('Aggregated stats:', stats);
            tbody.innerHTML = (stats.raw || []).map(row => `
                <tr>
                    <td>${row.label}</td>
                    <td>${row.volt_min ?? 'N/A'}</td>
                    <td>${row.volt_max ?? 'N/A'}</td>
                    <td>${row.amp_min ?? 'N/A'}</td>
                    <td>${row.amp_max ?? 'N/A'}</td>
                    <td>${row.kwh_used ?? 'N/A'}</td>
                </tr>
        `).join('');
        }

        document.getElementById('loadStatsBtn').onclick = renderStatsTable;


        async function renderReadingTable(serialNumber, count) {
            const readings = await API.fetchRecentReadings(serialNumber, count);
            const tbody = document.querySelector('#readingTable tbody');
            tbody.innerHTML = readings.map(r => `
                <tr>
                    <td>${Utils.formatDate(r.timestamp)}</td>
                    <td>${r.voltage ?? 'N/A'}</td>
                    <td>${r.current ?? 'N/A'}</td>
                    <td>${r.power ?? 'N/A'}</td>
                    <td>${r.energy ?? 'N/A'}</td>
                </tr>
            `).join('');
        }

        const recordCountSelect = document.getElementById('recordCount');
        let currentCount = parseInt(recordCountSelect.value, 10);
        renderReadingTable(serialNumber, currentCount);
        console.log('Rendering readings for', serialNumber, 'with count', currentCount);
        recordCountSelect.onchange = () => {
            currentCount = parseInt(recordCountSelect.value, 10);
            renderReadingTable(serialNumber, currentCount);
        };
    },

    async showUserRegister() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/user-register.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const result = await API.registerUser(data);
            if (result.error) {
                alert(`Error: ${result.error}`);
            } else if (result.message) {
                alert(`Success: ${result.message}`);
            } else {
                alert('Unexpected response from server');
            }
        });
    },

    async showUserLogin() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/user-login.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        this.handleLoginForm();
    },

    async handleLoginForm() {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const result = await API.loginUser(data);
            if (result.error) {
                alert(result.error);
            } else if (result.message) {
                alert(result.message);
                localStorage.setItem('username', result.username);
                this.updateAuthButton(true);
                UI.showDashboard();
            }
        });
    },

    updateAuthButton(isLoggedIn) {
        const loginBtn = document.querySelector('nav button[onclick="UI.showUserLogin()"]');
        const registerBtn = document.querySelector('nav button[onclick="UI.showUserRegister()"]');
        const dashboardBtn = document.querySelector('nav button[onclick="UI.showDashboard()"]');
        const deviceBtn = document.querySelector('nav button[onclick="UI.showDeviceList()"]');
        if (isLoggedIn) {
            loginBtn.textContent = 'Logout';
            loginBtn.onclick = () => {
                API.logoutUser && API.logoutUser();
                UI.updateAuthButton(false);
                alert('Logged out!');
            };
            if (registerBtn) registerBtn.style.display = 'none';
            if (dashboardBtn) dashboardBtn.style.display = '';
            if (deviceBtn) deviceBtn.style.display = '';
        } else {
            loginBtn.textContent = 'Login';
            loginBtn.onclick = () => UI.showUserLogin();
            if (registerBtn) registerBtn.style.display = '';
            if (dashboardBtn) dashboardBtn.style.display = 'none';
            if (deviceBtn) deviceBtn.style.display = 'none';
        }
    }
};
