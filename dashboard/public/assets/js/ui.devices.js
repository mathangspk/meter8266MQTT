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
        latestReadingTimer: null,
        charts: null,
        statsChart: null
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
                <div class="col-md-6 col-lg-4">
                    <div class="card h-100">
                        <div class="card-body d-flex flex-column">
                            <div class="flex-grow-1">
                                <h6 class="card-title">
                                    <i class="bi bi-cpu text-electric me-2"></i>
                                    ${device.name ?? 'No name'}
                                </h6>
                                <div class="card-text">
                                    <div class="small text-muted mb-1">
                                        <i class="bi bi-tag me-1"></i>Serial: ${device.serial_number}
                                    </div>
                                    <div class="small text-muted mb-1">
                                        <i class="bi bi-geo-alt me-1"></i>Location: ${device.location ?? 'N/A'}
                                    </div>
                                    <div class="small text-muted">
                                        <i class="bi bi-clock me-1"></i>Last active: ${Utils.formatDate(device.last_seen)}
                                    </div>
                                </div>
                            </div>
                            <div class="mt-3 d-flex gap-2">
                                <button class="btn btn-outline-primary btn-sm flex-fill detail-device-btn" data-serial="${device.serial_number}">
                                    <i class="bi bi-eye me-1"></i>View Details
                                </button>
                                <button class="btn btn-outline-danger btn-sm delete-device-btn" data-id="${device._id ? device._id.toString() : device.id}">
                                    <i class="bi bi-trash me-1"></i>Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
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
            modeSelect: document.getElementById('statsMode'),
            startDateInput: document.getElementById('statsStart'),
            loadStatsBtn: document.getElementById('loadStatsBtn')
        };
        await this.populateDeviceDetail();
        this.bindDetailEvents();
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
        document.getElementById('deviceVoltage').innerText = Utils.formatVoltage(reading?.voltage);
        document.getElementById('deviceCurrent').innerText = Utils.formatCurrent(reading?.current);
        document.getElementById('devicePower').innerText = Utils.formatPower(reading?.power);
        document.getElementById('deviceEnergy').innerText = Utils.formatEnergy(reading?.energy);
    },

    bindDetailEvents() {
        const { modeSelect, startDateInput, loadStatsBtn } = this.detailState.elements;
        if (loadStatsBtn) loadStatsBtn.onclick = () => this.renderStatsTable();

        // Note: Removed recordCountSelect binding since we removed the table
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
                    <td class="fw-medium">${row.label}</td>
                    <td>
                        <div class="d-flex flex-column align-items-center gap-1">
                            <small class="text-muted">${Utils.formatValue(row.volt_min, 1)}</small>
                            <small class="text-electric fw-semibold">${Utils.formatValue(row.volt_max, 1)}</small>
                        </div>
                    </td>
                    <td>
                        <div class="d-flex flex-column align-items-center gap-1">
                            <small class="text-muted">${Utils.formatValue(row.amp_min, 1)}</small>
                            <small class="text-success fw-semibold">${Utils.formatValue(row.amp_max, 1)}</small>
                        </div>
                    </td>
                    <td>
                        <span class="badge bg-info text-white fw-semibold">${Utils.formatValue(row.kwh_used, 1)}</span>
                    </td>
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

    async setupRealtimeChart() {
        if (!window.Chart) return;

        const oneHourMs = 60 * 60 * 1000;

        // Create three separate charts
        this.detailState.charts = {
            voltageChart: this.createRealtimeChart('voltageChart', 'Voltage (V)', '#00d4ff', 'voltage'),
            currentChart: this.createRealtimeChart('currentChart', 'Current (A)', '#00ff88', 'current'),
            powerChart: this.createRealtimeChart('powerChart', 'Power (W)', '#ff6b35', 'power')
        };

        // Seed data for all charts
        await this.seedAllCharts();

        // Setup WebSocket handlers
        this.setupWebSocketHandlers();
    },

    createRealtimeChart(canvasId, label, color, dataKey) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) return null;

        // Create gradient
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '05');

        return new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: label,
                    data: [],
                    borderColor: color,
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: color,
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                animation: { duration: 1000, easing: 'easeInOutQuart' },
                responsive: true,
                maintainAspectRatio: false,
                interaction: { intersect: false, mode: 'index' },
                parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                scales: {
                    x: {
                        type: 'time',
                        time: { unit: 'minute', displayFormats: { minute: 'HH:mm' } },
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#666' }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(0, 0, 0, 0.05)' },
                        ticks: { color: '#666' }
                    }
                },
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: color,
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: (context) => new Date(context[0].parsed.x).toLocaleTimeString(),
                            label: (context) => `${label}: ${context.parsed.y}`
                        }
                    }
                }
            }
        });
    },

    async seedAllCharts() {
        try {
            const seed = await API.fetchRecentReadings(this.detailState.serialNumber, 30);
            const oneHourMs = 60 * 60 * 1000;
            const cutoff = Date.now() - oneHourMs;

            seed.forEach(r => {
                const ts = new Date(r.timestamp).getTime();
                if (ts > cutoff) {
                    this.addDataPoint('voltage', ts, Number(r.voltage) || 0);
                    this.addDataPoint('current', ts, Number(r.current) || 0);
                    this.addDataPoint('power', ts, Number(r.power) || 0);
                }
            });
        } catch (error) {
            console.error('Error seeding chart data:', error);
        }
    },

    setupWebSocketHandlers() {
        const handler = (data) => {
            if (data.serial_number !== this.detailState.serialNumber) return;

            const ts = data.timestamp || new Date().toISOString();
            const timestamp = new Date(ts).getTime();

            // Check individual toggles and update corresponding charts
            if (document.getElementById('toggleVoltageRealtime')?.checked) {
                this.addDataPoint('voltage', timestamp, Number(data.voltage) || 0);
            }
            if (document.getElementById('toggleCurrentRealtime')?.checked) {
                this.addDataPoint('current', timestamp, Number(data.current) || 0);
            }
            if (document.getElementById('togglePowerRealtime')?.checked) {
                this.addDataPoint('power', timestamp, Number(data.power) || 0);
            }
        };

        Sockets.subscribe(this.detailState.serialNumber, handler);
        this.detailState.ws = {
            close: () => Sockets.unsubscribe(this.detailState.serialNumber, handler)
        };
    },

    addDataPoint(chartType, timestamp, value) {
        const chart = this.detailState.charts[chartType + 'Chart'];
        if (!chart) return;

        const oneHourMs = 60 * 60 * 1000;
        const cutoff = Date.now() - oneHourMs;
        const points = chart.data.datasets[0].data;

        // Remove old points beyond 1 hour
        while (points.length && new Date(points[0].x).getTime() < cutoff) {
            points.shift();
        }

        // Avoid duplicate timestamps
        if (points.length) {
            const lastX = new Date(points[points.length - 1].x).getTime();
            if (timestamp <= lastX) return;
        }

        // Add new point
        points.push({
            x: new Date(timestamp).toISOString(),
            y: value
        });

        chart.update('none');
    }
};

// Make DevicesUI globally available
window.DevicesUI = DevicesUI;


