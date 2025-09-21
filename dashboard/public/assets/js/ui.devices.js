const DevicesUI = {
    listState: {
        devices: [],
        elements: null,
        username: null
    },
    detailState: {
        serialNumber: null,
        elements: null,
        latestReadingTimer: null,
        statsChart: null
    },

    async showDeviceEdit(serialNumber) {
        const html = await fetch('assets/components/device-edit.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;

        const data = await API.fetchDeviceDetail(serialNumber);

        document.getElementById('deviceName').value = data.name ?? '';
        document.getElementById('deviceLocation').value = data.location ?? '';
        document.getElementById('deviceOTAUrl').value = data.ota_url ?? '';
        document.getElementById('deviceStatus').value = data.status ?? 'active';

        document.getElementById('editDeviceForm').onsubmit = (event) => {
            event.preventDefault();
            this.saveDeviceChanges(serialNumber);
        };

        document.getElementById('cancelEdit').onclick = () => {
            this.showDeviceDetail(serialNumber);
        };
    },

    async saveDeviceChanges(serialNumber) {
        const name = document.getElementById('deviceName').value;
        const location = document.getElementById('deviceLocation').value;
        const otaUrl = document.getElementById('deviceOTAUrl').value; // Currently not used
        const status = document.getElementById('deviceStatus').value;

        const updatedDevice = {
            name: name,
            location: location,
            ota_url: otaUrl,
            status: status
        };
        try {
            const result = await API.updateDevice(serialNumber, updatedDevice);

            if (result.error) {
                console.error('Error updating device:', result.error);
                alert('Failed to update device. Please check the console for details.'); // Added error alert
            } else {
                console.log('Device updated successfully');
                this.showDeviceDetail(serialNumber);
            }
        } catch (error) {
            console.error('An unexpected error occurred:', error);
            alert('An unexpected error occurred. Please check the console for details.'); // Added error alert
        }
    },

    async showDeviceList() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/device-list.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        const username = localStorage.getItem('username');
        if (!username) {
            console.log('Vui lòng đăng nhập để xem thiết bị.');
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
                                 <button class="btn btn-outline-success btn-sm realtime-device-btn" data-serial="${device.serial_number}" title="View Real-time Data">
                                     <i class="bi bi-activity me-1"></i>
                                     <span class="d-none d-sm-inline">Real-time</span>
                                     <span class="d-sm-none">Live</span>
                                 </button>
                                 <button class="btn btn-outline-primary btn-sm flex-fill detail-device-btn" data-serial="${device.serial_number}">
                                     <i class="bi bi-eye me-1"></i>View Details
                                 </button>
                                 <button class="btn btn-outline-warning btn-sm edit-device-btn" data-serial="${device.serial_number}">
                                     <i class="bi bi-pencil me-1"></i>Edit
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
                        console.log('Lỗi xóa thiết bị:', result.error);
                    } else {
                        console.log('Đã xóa thiết bị thành công');
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
        document.querySelectorAll('.realtime-device-btn').forEach(btn => {
            btn.onclick = async () => {
                const serialNumber = btn.getAttribute('data-serial');
                UI.showRealtimeMonitoring(serialNumber);
            };
        });
        document.querySelectorAll('.edit-device-btn').forEach(btn => {
            btn.onclick = async () => {
                const serialNumber = btn.getAttribute('data-serial');
                DevicesUI.showDeviceEdit(serialNumber);
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
            console.log('Thiết bị với serial number này đã tồn tại!');
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
            console.log('Lỗi thêm thiết bị:', result.error);
        } else {
            console.log('Đã thêm thiết bị mới:', newSN);
            UI.showDeviceList();
        }
    },

    async showDeviceDetail(serialNumber) {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);

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
    },

    async populateDeviceDetail() {
        const data = await API.fetchDeviceDetail(this.detailState.serialNumber);
        document.getElementById('deviceSerial').innerText = data.serial_number ?? '';
        document.getElementById('deviceName').innerText = data.name ?? '';
        document.getElementById('deviceLocation').innerText = data.location ?? '';
        document.getElementById('deviceStatus').innerText = data.status ?? '';
        document.getElementById('deviceLastSeen').innerText = data.last_seen ?? '';
        await this.updateLatestReading();
        //await this.loadFirmwareInfo(); // Load firmware information
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

        // Add realtime monitoring buttons
        const viewRealtimeBtn = document.getElementById('viewRealtimeBtn');
        const viewRealtimeBtnAlt = document.getElementById('viewRealtimeBtnAlt');

        if (viewRealtimeBtn) {
            viewRealtimeBtn.onclick = () => UI.showRealtimeMonitoring(this.detailState.serialNumber);
        }
        if (viewRealtimeBtnAlt) {
            viewRealtimeBtnAlt.onclick = () => UI.showRealtimeMonitoring(this.detailState.serialNumber);
        }
    },



    async renderStatsTable() {
        const { modeSelect, startDateInput } = this.detailState.elements;
        const mode = modeSelect.value;
        const start = startDateInput.value;
        if (!start) {
            console.log("Vui lòng chọn ngày bắt đầu");
            return;
        }
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



    // Removed time axis refresh - focusing on simple real-time display



    // Removed seedAllCharts - focusing on real-time only



    cleanupCharts() {
        if (this.detailState.charts) {
            Object.values(this.detailState.charts).forEach(chart => {
                if (chart) {
                    chart.destroy();
                }
            });
            this.detailState.charts = null;
        }
        if (this.detailState.statsChart) {
            this.detailState.statsChart.destroy();
            this.detailState.statsChart = null;
        }
    },

    // Simplified - charts update immediately when data is added
};

// Make DevicesUI globally available
window.DevicesUI = DevicesUI;


