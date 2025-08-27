const DevicesUI = {
    listState: {
        devices: [],
        elements: null,
        username: null
    },
    detailState: {
        serialNumber: null,
        chart: null,
        ws: null,
        elements: null,
        latestReadingTimer: null
    },

    async showDeviceList() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        if (window._realtimeWS) { try { window._realtimeWS.close(); } catch (_) { } }
        const html = await fetch('assets/components/device-list.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        const username = localStorage.getItem('username');
        if (!username) {
            alert('Vui lòng đăng nhập để xem thiết bị.');
            UI.updateAuthButton(false);
            return;
        }
        this.listState.username = username;
        this.listState.elements = {
            deviceLoading: document.getElementById('deviceLoading'),
            container: document.getElementById('deviceContainer'),
            emptyEl: document.getElementById('deviceEmpty'),
            searchInput: document.getElementById('deviceSearch'),
            addDeviceBtn: document.getElementById('addDeviceBtn')
        };
        await this.loadDevicesForUser();
        this.bindListEvents();
    },

    async loadDevicesForUser() {
        const { deviceLoading, container, emptyEl } = this.listState.elements;
        deviceLoading.classList.remove('d-none');
        container.innerHTML = '';
        emptyEl.classList.add('d-none');
        const devices = await API.fetchDevicesByUser(this.listState.username);
        deviceLoading.classList.add('d-none');
        this.listState.devices = Array.isArray(devices) ? devices : [];
        this.renderList(this.listState.devices);
    },

    renderList(items) {
        const { container, emptyEl } = this.listState.elements;
        if (!items.length) {
            container.innerHTML = '';
            emptyEl.classList.remove('d-none');
            return;
        }
        emptyEl.classList.add('d-none');
        container.innerHTML = items.map(device => `
                <li class="list-group-item d-flex justify-content-between align-items-start">
                    <div class="me-2">
                        <div class="fw-bold">${device.name ?? 'No name'}</div>
                        <div class="small text-muted">Serial: ${device.serial_number}</div>
                        <div class="small text-muted">Last active: ${Utils.formatDate(device.last_seen)}</div>
                    </div>
                    <div class="btn-group">
                        <button class="btn btn-sm btn-outline-primary detail-device-btn" data-serial="${device.serial_number}">Xem chi tiết</button>
                        <button class="btn btn-sm btn-outline-danger delete-device-btn" data-id="${device.id}">Xóa</button>
                    </div>
                </li>
            `).join('');
        this.attachRowHandlers();
    },

    attachRowHandlers() {
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

    bindListEvents() {
        const { searchInput, addDeviceBtn } = this.listState.elements;
        if (searchInput) {
            searchInput.oninput = () => this.onSearchChange();
        }
        if (addDeviceBtn) {
            addDeviceBtn.onclick = () => this.addDevice();
        }
    },

    onSearchChange() {
        const { searchInput } = this.listState.elements;
        const q = (searchInput.value || '').trim().toLowerCase();
        const filtered = this.listState.devices.filter(d =>
            (d.name || '').toLowerCase().includes(q) ||
            (d.serial_number || '').toLowerCase().includes(q)
        );
        this.renderList(filtered);
    },

    async addDevice() {
        const devices = await API.fetchDevices();
        let maxSN = 0;
        devices.forEach(d => {
            const snNum = parseInt((d.serial_number || '').replace('SN', ''));
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
    },

    async showDeviceDetail(serialNumber) {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        if (window._realtimeWS) { try { window._realtimeWS.close(); } catch (_) { } }
        const html = await fetch('assets/components/device-detail.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        this.detailState.serialNumber = serialNumber;
        this.detailState.elements = {
            recordCountSelect: document.getElementById('recordCount'),
            modeSelect: document.getElementById('statsMode'),
            startDateInput: document.getElementById('statsStart'),
            loadStatsBtn: document.getElementById('loadStatsBtn'),
            chartEl: document.getElementById('deviceRealtimeChart'),
            toggleDeviceRealtime: document.getElementById('toggleDeviceRealtime')
        };
        await this.populateDeviceDetail();
        this.bindDetailEvents();
        await this.renderReadingTable(parseInt(this.detailState.elements.recordCountSelect.value, 10));
        this.setupRealtimeChart();
    },

    async populateDeviceDetail() {
        const data = await API.fetchDeviceDetail(this.detailState.serialNumber);
        document.getElementById('deviceSerial').innerText = data.serial_number ?? '';
        document.getElementById('deviceName').innerText = data.name ?? '';
        document.getElementById('deviceLocation').innerText = data.location ?? '';
        document.getElementById('deviceStatus').innerText = data.status ?? '';
        document.getElementById('deviceLastSeen').innerText = data.last_seen ?? '';
        await this.updateLatestReading();
        this.detailState.latestReadingTimer = setInterval(() => this.updateLatestReading(), 5000);
        window.latestReadingInterval = this.detailState.latestReadingTimer;
    },

    async updateLatestReading() {
        const reading = await API.fetchLatestReading(this.detailState.serialNumber);
        document.getElementById('deviceVoltage').innerText = reading?.voltage ?? 'N/A';
        document.getElementById('deviceCurrent').innerText = reading?.current ?? 'N/A';
        document.getElementById('devicePower').innerText = reading?.power ?? 'N/A';
        document.getElementById('deviceEnergy').innerText = reading?.energy ?? 'N/A';
    },

    bindDetailEvents() {
        const { modeSelect, startDateInput, loadStatsBtn, recordCountSelect } = this.detailState.elements;
        if (loadStatsBtn) loadStatsBtn.onclick = () => this.renderStatsTable();
        if (recordCountSelect) {
            recordCountSelect.onchange = () => this.renderReadingTable(parseInt(recordCountSelect.value, 10));
        }
    },

    async renderStatsTable() {
        const { modeSelect, startDateInput } = this.detailState.elements;
        const mode = modeSelect.value;
        const start = startDateInput.value;
        if (!start) return alert("Vui lòng chọn ngày bắt đầu");
        const stats = await API.fetchAggregatedReadings(this.detailState.serialNumber, mode, start);
        const tbody = document.querySelector('#statsTable tbody');
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

        // Render bar chart for KWh by interval
        try {
            const chartEl = document.getElementById('statsBarChart');
            if (chartEl && window.Chart) {
                const labels = (stats.raw || []).map(r => r.label);
                const values = (stats.raw || []).map(r => Number(r.kwh_used || 0));
                if (!this.detailState.statsChart) {
                    this.detailState.statsChart = new Chart(chartEl, {
                        type: 'bar',
                        data: { labels, datasets: [{ label: 'KWh', data: values, backgroundColor: 'rgba(13,110,253,.4)', borderColor: '#0d6efd' }] },
                        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
                    });
                } else {
                    this.detailState.statsChart.data.labels = labels;
                    this.detailState.statsChart.data.datasets[0].data = values;
                    this.detailState.statsChart.update('none');
                }
            }
        } catch (_) { }
    },

    async renderReadingTable(count) {
        const readings = await API.fetchRecentReadings(this.detailState.serialNumber, count);
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
    },

    async setupRealtimeChart() {
        const { chartEl, toggleDeviceRealtime } = this.detailState.elements;
        if (!(chartEl && window.Chart)) return;
        const oneHourMs = 60 * 60 * 1000;
        const chart = new Chart(chartEl, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Công suất (W)',
                    data: [],
                    borderColor: '#198754',
                    backgroundColor: 'rgba(25,135,84,.1)',
                    tension: 0.25,
                    pointRadius: 0
                }]
            },
            options: {
                animation: false,
                responsive: true,
                maintainAspectRatio: false,
                parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                scales: { x: { type: 'time', time: { unit: 'minute' } }, y: { beginAtZero: true } },
                plugins: { legend: { display: false } }
            }
        });
        this.detailState.chart = chart;

        const addPoint = (ts, powerValue) => {
            const cutoff = Date.now() - oneHourMs;
            const points = chart.data.datasets[0].data;
            const x = new Date(ts).getTime();
            if (Number.isNaN(x)) return;
            // Drop old points beyond 1h
            while (points.length && new Date(points[0].x).getTime() < cutoff) {
                points.shift();
            }
            // Enforce monotonic time: if incoming ts <= last, ignore to avoid back-links
            if (points.length) {
                const lastX = new Date(points[points.length - 1].x).getTime();
                if (x <= lastX) return;
            }
            points.push({ x: new Date(x).toISOString(), y: powerValue });
            chart.update('none');
        };

        try {
            const seed = await API.fetchRecentReadings(this.detailState.serialNumber, 30);
            seed
                .map(r => ({ x: new Date(r.timestamp).getTime(), y: Number(r.power) || 0 }))
                .filter(p => !Number.isNaN(p.x))
                .sort((a, b) => a.x - b.x)
                .forEach(p => addPoint(new Date(p.x).toISOString(), p.y));
        } catch (_) { }

        const handler = (data) => {
            if (toggleDeviceRealtime && !toggleDeviceRealtime.checked) return;
            if (data.serial_number !== this.detailState.serialNumber) return;
            const ts = data.timestamp || new Date().toISOString();
            const power = Number(data.power) || 0;
            addPoint(ts, power);
        };
        Sockets.subscribe(this.detailState.serialNumber, handler);
        this.detailState.ws = { close: () => Sockets.unsubscribe(this.detailState.serialNumber, handler) };
    }
};


