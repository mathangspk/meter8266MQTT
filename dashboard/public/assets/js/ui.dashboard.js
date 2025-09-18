const DashboardUI = {
    async showDashboard() {
        // Cleanup previous chart if exists
        this.cleanupChart();

        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);

        // Show loading state
        const content = document.getElementById('content');
        content.innerHTML = '<div class="text-center my-5"><div class="spinner-border text-electric" role="status"><span class="visually-hidden">Loading dashboard...</span></div></div>';

        const html = await fetch('assets/components/dashboard.html').then(res => res.text());
        content.innerHTML = html;

        // Load dashboard data
        await this.loadDashboardData();

        // Initialize real-time chart
        this.initializeRealtimeChart();

        // Initialize theme toggle
        this.initializeThemeToggle();
    },

    async loadDashboardData() {
        try {
            const data = await API.fetchDashboardData();
            const totalDevEl = document.getElementById('totalDevices');
            const totalReadEl = document.getElementById('totalReadings');
            const totalPowerEl = document.getElementById('totalPower');
            const totalEnergyEl = document.getElementById('totalEnergy');

            if (totalDevEl) totalDevEl.innerText = (data.total_devices ?? 0).toLocaleString();
            if (totalReadEl) totalReadEl.innerText = (data.total_readings ?? 0).toLocaleString();
            if (totalPowerEl) totalPowerEl.innerText = Utils.formatPower(data.avg_power ?? 0);
            if (totalEnergyEl) totalEnergyEl.innerText = Utils.formatEnergy(data.total_energy ?? 0);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
            // Show error state
            this.showDashboardError();
        }
    },

    showDashboardError() {
        const content = document.getElementById('content');
        content.innerHTML = `
            <div class="alert alert-danger" role="alert">
                <i class="bi bi-exclamation-triangle me-2"></i>
                Failed to load dashboard data. Please check your connection and try again.
            </div>
        `;
    },

    initializeRealtimeChart() {
        const ctx = document.getElementById('realtimeChart');
        if (!ctx || !window.Chart) return;

        // Destroy existing chart if it exists
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }

        const oneHourMs = 60 * 60 * 1000;

        // Create gradient
        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 212, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(0, 212, 255, 0.05)');

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [{
                    label: 'Power Consumption (W)',
                    data: [],
                    borderColor: '#00d4ff',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: '#00d4ff',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                animation: {
                    duration: 1000,
                    easing: 'easeInOutQuart'
                },
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#666'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            color: '#666',
                            callback: function (value) {
                                return value + ' W';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#ffffff',
                        bodyColor: '#ffffff',
                        borderColor: '#00d4ff',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            title: function (context) {
                                return new Date(context[0].parsed.x).toLocaleTimeString();
                            },
                            label: function (context) {
                                return `Power: ${context.parsed.y} W`;
                            }
                        }
                    }
                }
            }
        });

        function addPoint(ts, powerValue) {
            const cutoff = Date.now() - oneHourMs;
            const points = chart.data.datasets[0].data;
            const x = new Date(ts).getTime();

            if (Number.isNaN(x)) return;

            // Remove old points
            while (points.length && new Date(points[0].x).getTime() < cutoff) {
                points.shift();
            }

            // Avoid duplicate timestamps
            if (points.length) {
                const lastX = new Date(points[points.length - 1].x).getTime();
                if (x <= lastX) return;
            }

            points.push({ x: new Date(x).toISOString(), y: powerValue });
            chart.update('none');
        }

        const toggleRealtime = document.getElementById('toggleRealtime');
        const handler = (data) => {
            if (toggleRealtime && !toggleRealtime.checked) return;
            const ts = data.timestamp || new Date().toISOString();
            const power = Number(data.power) || 0;
            addPoint(ts, power);
        };

        Sockets.subscribeAll(handler);
        window.addEventListener('beforeunload', () => {
            try { Sockets.unsubscribeAll(handler); } catch (_) { }
            // Cleanup chart on page unload
            if (this.chart) {
                this.chart.destroy();
                this.chart = null;
            }
        });

        // Store chart instance for cleanup
        this.chart = chart;
    },

    initializeThemeToggle() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        // Get system preference
        const getSystemTheme = () => {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        };

        // Load saved theme preference or use system preference
        const savedTheme = localStorage.getItem('theme');
        const initialTheme = savedTheme || getSystemTheme();

        this.setTheme(initialTheme);
        themeToggle.checked = initialTheme === 'dark';

        // Listen for system theme changes
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', (e) => {
            // Only auto-switch if no manual preference is saved
            if (!localStorage.getItem('theme')) {
                const systemTheme = e.matches ? 'dark' : 'light';
                this.setTheme(systemTheme);
                themeToggle.checked = systemTheme === 'dark';
            }
        });

        // Manual theme toggle
        themeToggle.addEventListener('change', (e) => {
            const theme = e.target.checked ? 'dark' : 'light';
            this.setTheme(theme);
            localStorage.setItem('theme', theme);
        });
    },

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeToggle = document.getElementById('themeToggle');
        const themeLabel = document.getElementById('themeLabel');

        if (themeToggle) {
            themeToggle.checked = theme === 'dark';
        }

        if (themeLabel) {
            themeLabel.textContent = theme === 'dark' ? 'Light' : 'Dark';
        }

        // Update CSS variables for immediate effect
        if (theme === 'dark') {
            document.documentElement.style.setProperty('--bg-primary', '#0a0a0a');
            document.documentElement.style.setProperty('--bg-secondary', '#1a1a1a');
            document.documentElement.style.setProperty('--bg-card', 'rgba(26, 26, 26, 0.95)');
            document.documentElement.style.setProperty('--text-primary', '#ffffff');
            document.documentElement.style.setProperty('--text-secondary', '#cccccc');
            document.documentElement.style.setProperty('--text-muted', '#888888');
        } else {
            // Reset to light theme variables
            document.documentElement.style.setProperty('--bg-primary', '#f8fafc');
            document.documentElement.style.setProperty('--bg-secondary', '#ffffff');
            document.documentElement.style.setProperty('--bg-card', 'rgba(255, 255, 255, 0.95)');
            document.documentElement.style.setProperty('--text-primary', '#1a1a1a');
            document.documentElement.style.setProperty('--text-secondary', '#666666');
            document.documentElement.style.setProperty('--text-muted', '#999999');
        }
    },

    cleanupChart() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
    }
};

// Make DashboardUI globally available
window.DashboardUI = DashboardUI;


