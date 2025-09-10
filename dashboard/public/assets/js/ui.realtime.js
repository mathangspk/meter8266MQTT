const RealtimeUI = {
    state: {
        selectedDevice: null,
        devices: [],
        charts: null,
        ws: null,
        latestReadingTimer: null,
        elements: null
    },

    async showRealtimeMonitoring(selectedSerial = null) {
        console.log('Showing realtime monitoring page');

        // Cleanup previous state
        this.cleanup();

        const html = await fetch('assets/components/realtime-monitoring.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;

        this.state.elements = {
            deviceSelector: document.getElementById('deviceSelector'),
            selectedDeviceInfo: document.getElementById('selectedDeviceInfo'),
            currentMetrics: document.getElementById('currentMetrics'),
            realtimeCharts: document.getElementById('realtimeCharts'),
            noDeviceSelected: document.getElementById('noDeviceSelected'),
            realtimeLoading: document.getElementById('realtimeLoading'),
            refreshDevicesBtn: document.getElementById('refreshDevicesBtn'),
            clearChartsBtn: document.getElementById('clearChartsBtn'),
            toggleAllBtn: document.getElementById('toggleAllBtn')
        };

        await this.loadDevices();
        this.bindEvents();

        // If a device was pre-selected, select it
        if (selectedSerial) {
            this.state.elements.deviceSelector.value = selectedSerial;
            this.onDeviceChange();
        }
    },

    async loadDevices() {
        const username = localStorage.getItem('username');
        if (!username) {
            console.log('No username found, redirecting to login');
            UI.showUserLogin();
            return;
        }

        try {
            const devices = await API.fetchDevicesByUser(username);
            this.state.devices = Array.isArray(devices) ? devices : [];

            this.populateDeviceSelector();

            if (this.state.devices.length === 0) {
                console.log('No devices found for user');
            }
        } catch (error) {
            console.error('Error loading devices:', error);
        }
    },

    populateDeviceSelector() {
        const selector = this.state.elements.deviceSelector;
        selector.innerHTML = '<option value="">Select a device...</option>';

        this.state.devices.forEach(device => {
            const option = document.createElement('option');
            option.value = device.serial_number;
            option.textContent = `${device.name || 'Unnamed'} (${device.serial_number})`;
            selector.appendChild(option);
        });
    },

    bindEvents() {
        const { deviceSelector, refreshDevicesBtn, clearChartsBtn, toggleAllBtn } = this.state.elements;

        deviceSelector.addEventListener('change', () => this.onDeviceChange());
        refreshDevicesBtn.addEventListener('click', () => this.loadDevices());
        clearChartsBtn.addEventListener('click', () => this.clearChartData());
        toggleAllBtn.addEventListener('click', () => this.toggleAllCharts());
    },

    async onDeviceChange() {
        const selectedSerial = this.state.elements.deviceSelector.value;

        if (!selectedSerial) {
            this.showNoDeviceSelected();
            return;
        }

        this.state.selectedDevice = selectedSerial;
        this.showRealtimeLoading();

        try {
            // Load device details
            const deviceData = await API.fetchDeviceDetail(selectedSerial);
            this.populateDeviceInfo(deviceData);

            // Setup realtime monitoring
            await this.setupRealtimeCharts();

            // Start updating latest readings
            this.startLatestReadingUpdates();

            this.showRealtimeInterface();
        } catch (error) {
            console.error('Error setting up device monitoring:', error);
            this.showNoDeviceSelected();
        }
    },

    populateDeviceInfo(deviceData) {
        document.getElementById('rtDeviceName').textContent = deviceData.name || 'Unnamed';
        document.getElementById('rtDeviceSerial').textContent = deviceData.serial_number || '';
        document.getElementById('rtDeviceLocation').textContent = deviceData.location || 'N/A';
        document.getElementById('rtDeviceStatus').innerHTML = `
            <div class="status-dot"></div>
            ${deviceData.status || 'Unknown'}
        `;
    },

    async setupRealtimeCharts() {
        if (!window.Chart) {
            console.error('Chart.js not loaded');
            return;
        }

        console.log('Setting up real-time charts for device:', this.state.selectedDevice);

        // Cleanup existing charts
        this.cleanupCharts();

        // Create three separate charts
        this.state.charts = {
            voltageChart: this.createRealtimeChart('voltageChart', 'Voltage (V)', '#00d4ff', 'voltage'),
            currentChart: this.createRealtimeChart('currentChart', 'Current (A)', '#00ff88', 'current'),
            powerChart: this.createRealtimeChart('powerChart', 'Power (W)', '#ff6b35', 'power')
        };

        console.log('Charts created:', Object.keys(this.state.charts));

        // Setup WebSocket handlers for real-time updates
        this.setupWebSocketHandlers();

        console.log('Real-time charts setup complete');
    },

    createRealtimeChart(canvasId, label, color, dataKey) {
        const ctx = document.getElementById(canvasId);
        if (!ctx) {
            console.error(`Canvas element ${canvasId} not found`);
            return null;
        }

        console.log(`Creating chart for ${canvasId}...`);

        // Create gradient
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, color + '30');
        gradient.addColorStop(1, color + '05');

        try {
            const chart = new Chart(ctx, {
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
                            time: {
                                unit: 'minute',
                                displayFormats: {
                                    minute: 'HH:mm:ss'
                                }
                            },
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
                        },
                        annotation: {
                            annotations: {
                                noData: {
                                    type: 'label',
                                    xValue: 'center',
                                    yValue: 'center',
                                    content: 'Waiting for data...',
                                    font: {
                                        size: 14,
                                        weight: 'normal'
                                    },
                                    color: '#666'
                                }
                            }
                        }
                    }
                }
            });

            console.log(`Chart created successfully for ${canvasId}`);
            return chart;
        } catch (error) {
            console.error(`Error creating chart for ${canvasId}:`, error);
            return null;
        }
    },

    setupWebSocketHandlers() {
        const handler = (data) => {
            if (data.serial_number !== this.state.selectedDevice) return;

            const timestamp = Date.now();

            // Update charts immediately when data arrives
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

        Sockets.subscribe(this.state.selectedDevice, handler);
        this.state.ws = {
            close: () => Sockets.unsubscribe(this.state.selectedDevice, handler)
        };

        console.log('WebSocket handlers setup for real-time updates');
    },

    addDataPoint(chartType, timestamp, value) {
        const chart = this.state.charts[chartType + 'Chart'];
        if (!chart) return;

        const points = chart.data.datasets[0].data;

        // Keep only last 50 points for real-time display
        if (points.length >= 50) {
            points.shift();
        }

        // Add new point
        points.push({
            x: new Date(timestamp).toISOString(),
            y: value
        });

        // Hide "waiting for data" message when we have data
        if (chart.options.plugins && chart.options.plugins.annotation) {
            chart.options.plugins.annotation.annotations.noData.display = false;
        }

        // Update chart immediately for real-time feel
        chart.update('none');
    },

    startLatestReadingUpdates() {
        // Clear any existing timer
        if (this.state.latestReadingTimer) {
            clearInterval(this.state.latestReadingTimer);
        }

        // Update immediately
        this.updateLatestReading();

        // Then update every 5 seconds
        this.state.latestReadingTimer = setInterval(() => this.updateLatestReading(), 5000);
    },

    async updateLatestReading() {
        if (!this.state.selectedDevice) return;

        try {
            const reading = await API.fetchLatestReading(this.state.selectedDevice);
            document.getElementById('rtDeviceVoltage').textContent = Utils.formatVoltage(reading?.voltage);
            document.getElementById('rtDeviceCurrent').textContent = Utils.formatCurrent(reading?.current);
            document.getElementById('rtDevicePower').textContent = Utils.formatPower(reading?.power);
            document.getElementById('rtDeviceEnergy').textContent = Utils.formatEnergy(reading?.energy);
        } catch (error) {
            console.error('Error updating latest reading:', error);
        }
    },

    clearChartData() {
        console.log('Clearing all chart data...');
        if (this.state.charts) {
            Object.values(this.state.charts).forEach(chart => {
                if (chart && chart.data && chart.data.datasets) {
                    chart.data.datasets[0].data = [];
                    // Show "waiting for data" message
                    if (chart.options.plugins && chart.options.plugins.annotation) {
                        chart.options.plugins.annotation.annotations.noData.display = true;
                    }
                    chart.update('none');
                }
            });
        }
        console.log('Chart data cleared');
    },

    toggleAllCharts() {
        const voltageToggle = document.getElementById('toggleVoltageRealtime');
        const currentToggle = document.getElementById('toggleCurrentRealtime');
        const powerToggle = document.getElementById('togglePowerRealtime');

        if (!voltageToggle || !currentToggle || !powerToggle) return;

        // Check if all are currently checked
        const allChecked = voltageToggle.checked && currentToggle.checked && powerToggle.checked;

        // If all are checked, uncheck them; otherwise check them all
        const newState = !allChecked;
        voltageToggle.checked = newState;
        currentToggle.checked = newState;
        powerToggle.checked = newState;

        console.log(`Toggled all charts to: ${newState ? 'ON' : 'OFF'}`);
    },

    showNoDeviceSelected() {
        const { selectedDeviceInfo, currentMetrics, realtimeCharts, noDeviceSelected, realtimeLoading } = this.state.elements;
        selectedDeviceInfo.classList.add('d-none');
        currentMetrics.classList.add('d-none');
        realtimeCharts.classList.add('d-none');
        noDeviceSelected.classList.remove('d-none');
        realtimeLoading.classList.add('d-none');
    },

    showRealtimeLoading() {
        const { selectedDeviceInfo, currentMetrics, realtimeCharts, noDeviceSelected, realtimeLoading } = this.state.elements;
        selectedDeviceInfo.classList.add('d-none');
        currentMetrics.classList.add('d-none');
        realtimeCharts.classList.add('d-none');
        noDeviceSelected.classList.add('d-none');
        realtimeLoading.classList.remove('d-none');
    },

    showRealtimeInterface() {
        const { selectedDeviceInfo, currentMetrics, realtimeCharts, noDeviceSelected, realtimeLoading } = this.state.elements;
        selectedDeviceInfo.classList.remove('d-none');
        currentMetrics.classList.remove('d-none');
        realtimeCharts.classList.remove('d-none');
        noDeviceSelected.classList.add('d-none');
        realtimeLoading.classList.add('d-none');
    },

    cleanupCharts() {
        if (this.state.charts) {
            Object.values(this.state.charts).forEach(chart => {
                if (chart) {
                    chart.destroy();
                }
            });
            this.state.charts = null;
        }
    },

    cleanup() {
        // Clear timers
        if (this.state.latestReadingTimer) {
            clearInterval(this.state.latestReadingTimer);
            this.state.latestReadingTimer = null;
        }

        // Close WebSocket
        if (this.state.ws && this.state.ws.close) {
            this.state.ws.close();
            this.state.ws = null;
        }

        // Cleanup charts
        this.cleanupCharts();

        // Reset state
        this.state.selectedDevice = null;
    }
};

// Make RealtimeUI globally available
window.RealtimeUI = RealtimeUI;