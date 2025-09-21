const SettingsUI = {
    state: {
        devices: [],
        firmwareVersions: {}
    },

    async showSettings() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);

        // Check authentication
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Please login to access settings');
            UI.showUserLogin();
            return;
        }

        const html = await this.generateSettingsHTML();
        document.getElementById('content').innerHTML = html;

        await this.loadDevices();
        this.bindSettingsEvents();
    },

    async generateSettingsHTML() {
        return `
        <section class="animate-fade-in-up">
            <!-- Settings Header -->
            <div class="card mb-4">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h3 class="card-title mb-1">
                                <i class="bi bi-gear text-electric me-2"></i>
                                System Settings
                            </h3>
                            <p class="text-muted mb-0">Manage firmware updates and system configuration</p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <!-- Firmware Management -->
                <div class="col-lg-8">
                    <div class="card h-100">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="bi bi-cpu text-electric me-2"></i>
                                Firmware Management
                            </h6>
                        </div>
                        <div class="card-body">
                            <div id="firmwareDevicesList">
                                <!-- Devices will be loaded here -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- System Information -->
                <div class="col-lg-4">
                    <div class="card h-100">
                        <div class="card-header">
                            <h6 class="mb-0">
                                <i class="bi bi-info-circle text-electric me-2"></i>
                                System Information
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="device-info-item mb-3">
                                <label class="form-label text-muted small mb-1">Server Status</label>
                                <span class="status-indicator status-online">
                                    <div class="status-dot"></div>
                                    Online
                                </span>
                            </div>

                            <div class="device-info-item mb-3">
                                <label class="form-label text-muted small mb-1">Database Status</label>
                                <span class="status-indicator status-online">
                                    <div class="status-dot"></div>
                                    Connected
                                </span>
                            </div>

                            <div class="device-info-item">
                                <label class="form-label text-muted small mb-1">MQTT Status</label>
                                <span class="status-indicator status-online">
                                    <div class="status-dot"></div>
                                    Connected
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>`;
    },

    async loadDevices() {
        try {
            const devices = await API.fetchDevices();
            this.state.devices = Array.isArray(devices) ? devices : [];
            this.renderFirmwareDevices();
        } catch (error) {
            console.error('Error loading devices:', error);
            document.getElementById('firmwareDevicesList').innerHTML = `
                <div class="alert alert-danger">
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    Error loading devices. Please try again.
                </div>`;
        }
    },

    renderFirmwareDevices() {
        const container = document.getElementById('firmwareDevicesList');

        if (!this.state.devices.length) {
            container.innerHTML = `
                <div class="text-center py-4">
                    <i class="bi bi-cpu display-4 text-muted mb-3"></i>
                    <h6 class="text-muted">No devices found</h6>
                    <p class="text-muted small">Add devices to manage firmware updates</p>
                </div>`;
            return;
        }

        container.innerHTML = this.state.devices.map(device => `
                <div class="firmware-device-item border rounded p-3 mb-3">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="flex-grow-1">
                            <h6 class="mb-1">
                                <i class="bi bi-cpu text-electric me-2"></i>
                                ${device.name ?? 'No name'}
                            </h6>
                            <small class="text-muted">Serial: ${device.serial_number}</small>
                        </div>
                        <div class="text-end ms-3">
                            <div class="small text-muted mb-1">Current Version</div>
                            <span class="fw-semibold" id="firmwareVersion-${device.serial_number}">
                                ${device.version ?? '1.0'}
                            </span>
                        </div>
                        <div class="text-end ms-3">
                            <div class="small text-muted mb-1">OTA Url</div>
                            <span class="fw-semibold" id="firmwareOTAUrl-${device.serial_number}">
                                ${device.ota_url ?? 'N/A'}
                            </span>
                        </div>
                    </div>

                    <div class="d-flex gap-2 mb-3">
                        <button class="btn btn-outline-primary btn-sm check-firmware-btn"
                                data-serial="${device.serial_number}">
                            <i class="bi bi-search me-1"></i>Check Updates
                        </button>
                        <button class="btn btn-outline-success btn-sm update-firmware-btn"
                                data-serial="${device.serial_number}">
                            <i class="bi bi-upload me-1"></i>Update Firmware
                        </button>
                    </div>

                    <!-- Firmware Update Progress -->
                    <div id="firmwareProgressSection-${device.serial_number}" class="d-none">
                        <label class="form-label text-muted small mb-2">Update Progress</label>
                        <div class="progress" style="height: 8px;">
                            <div id="firmwareProgressBar-${device.serial_number}"
                                class="progress-bar progress-bar-striped progress-bar-animated"
                                role="progressbar" style="width: 0%"></div>
                        </div>
                        <small id="firmwareProgressText-${device.serial_number}"
                            class="text-muted mt-1 d-block">Preparing update...</small>
                    </div>
                </div>
            `).join('');

    },

    bindSettingsEvents() {
        // Bind check firmware buttons
        document.querySelectorAll('.check-firmware-btn').forEach(btn => {
            btn.onclick = () => this.checkFirmwareUpdate(btn.getAttribute('data-serial'));
        });

        // Bind update firmware buttons
        document.querySelectorAll('.update-firmware-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const serialNumber = btn.getAttribute('data-serial');
                const device = this.state.devices.find(d => d.serial_number === serialNumber);
                const OTAUrl = device?.ota_url?.trim() || '';
                if (!OTAUrl) {
                    alert(`Device ${serialNumber} does not have a valid OTA URL configured.`);
                    return;
                }
                this.ClickFirmwareUpdateOTA(serialNumber, OTAUrl);
            });
        });
    },

    async checkFirmwareUpdate(serialNumber) {
        const checkBtn = document.querySelector(`[data-serial="${serialNumber}"].check-firmware-btn`);
        const originalText = checkBtn.innerHTML;

        // Show loading state
        checkBtn.innerHTML = '<i class="bi bi-hourglass me-1"></i>Checking...';
        checkBtn.disabled = true;

        try {
            const response = await fetch(`/api/firmware/check?serialNumber=${serialNumber}&currentVersion=1.0`);
            const data = await response.json();

            if (data.firmwareUrl) {
                // New firmware available
                alert(`Firmware update available for ${serialNumber}: v${data.version}\n\nURL: ${data.firmwareUrl}`);
            } else {
                // No update available
                alert(`Device ${serialNumber} is up to date!`);
            }
        } catch (error) {
            console.error('Error checking firmware:', error);
            alert('Error checking for firmware updates. Please try again.');
        } finally {
            // Reset button
            checkBtn.innerHTML = originalText;
            checkBtn.disabled = false;
        }
    },
    async ClickFirmwareUpdateOTA(serialNumber, OTAurl) {
        const updateBtn = document.querySelector(
            `[data-serial="${serialNumber}"].update-firmware-btn`
        );
        const originalText = updateBtn.innerHTML;

        try {
            // UI: đổi nút sang trạng thái loading
            updateBtn.disabled = true;
            updateBtn.innerHTML = '<i class="bi bi-arrow-repeat me-1 spin"></i> Updating...';
            console.log(`Sending firmware update to ${serialNumber} with OTA URL: ${OTAurl}`);
            const data = await API.ClickFirmwareUpdateOTA(serialNumber, OTAurl);

            if (data.success) {
                console.log(`Firmware update sent successfully for ${serialNumber}`, data);

                // Hiển thị progress
                const progressSection = document.getElementById(`firmwareProgressSection-${serialNumber}`);
                const progressBar = document.getElementById(`firmwareProgressBar-${serialNumber}`);
                const progressText = document.getElementById(`firmwareProgressText-${serialNumber}`);

                progressSection.classList.remove('d-none');
                progressBar.style.width = '100%';
                progressBar.classList.add('bg-success');
                progressText.textContent = `OTA update command sent to ${serialNumber}`;
            } else {
                console.warn(`Firmware update failed for ${serialNumber}`, data);
                alert(`Failed to send firmware update to device ${serialNumber}`);
            }
        } catch (error) {
            console.error(`Error sending firmware update for ${serialNumber}:`, error);
            alert(`Error sending firmware update: ${error.message}`);
        } finally {
            // Reset nút
            updateBtn.disabled = false;
            updateBtn.innerHTML = originalText;
        }
    }
}

// Make SettingsUI globally available
window.SettingsUI = SettingsUI;