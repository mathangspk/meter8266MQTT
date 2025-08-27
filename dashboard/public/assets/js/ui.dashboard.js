const DashboardUI = {
    async showDashboard() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/dashboard.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        const data = await API.fetchDashboardData();
        const totalDevEl = document.getElementById('totalDevices');
        const totalReadEl = document.getElementById('totalReadings');
        if (totalDevEl) totalDevEl.innerText = (data.total_devices ?? 0);
        if (totalReadEl) totalReadEl.innerText = (data.total_readings ?? 0);

        const ctx = document.getElementById('realtimeChart');
        if (ctx && window.Chart) {
            const oneHourMs = 60 * 60 * 1000;
            const initialLabels = [];
            const initialData = [];

            const chart = new Chart(ctx, {
                type: 'line',
                data: {
                    datasets: [{
                        label: 'Công suất (W)',
                        data: [],
                        borderColor: '#0d6efd',
                        backgroundColor: 'rgba(13,110,253,.1)',
                        tension: 0.25,
                        pointRadius: 0
                    }]
                },
                options: {
                    animation: false,
                    responsive: true,
                    maintainAspectRatio: false,
                    parsing: { xAxisKey: 'x', yAxisKey: 'y' },
                    scales: {
                        x: { type: 'time', time: { unit: 'minute' } },
                        y: { beginAtZero: true }
                    },
                    plugins: { legend: { display: false } }
                }
            });

            function addPoint(ts, powerValue) {
                const cutoff = Date.now() - oneHourMs;
                const points = chart.data.datasets[0].data;
                const x = new Date(ts).getTime();
                if (Number.isNaN(x)) return;
                while (points.length && new Date(points[0].x).getTime() < cutoff) {
                    points.shift();
                }
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
            window.addEventListener('beforeunload', () => { try { Sockets.unsubscribeAll(handler); } catch (_) { } });
        }
    }
};


