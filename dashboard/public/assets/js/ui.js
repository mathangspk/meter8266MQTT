console.log('Loading ui.js...');
console.log('Loading ui.js...');
const UI = {
    async init() {
        console.log('UI.init() called');
        window.uiInitialized = true; // Mark as initialized

        // Check if nav elements exist, if not, retry later
        const userDisplayName = document.getElementById('userDisplayName');
        if (!userDisplayName) {
            console.log('Nav elements not ready, retrying in 100ms...');
            setTimeout(() => this.init(), 100);
            return;
        }

        // Check if user is already logged in
        const token = localStorage.getItem('token');
        const username = localStorage.getItem('username');

        console.log('Stored token exists:', !!token);
        console.log('Stored username:', username);

        if (token) {
            console.log('Token found, verifying validity...');
            // Verify token is still valid
            try {
                const userInfo = await API.getCurrentUser();
                console.log('User info response:', userInfo);
                if (userInfo && userInfo.user) {
                    console.log('Token valid, user authenticated');
                    // Ensure username is stored
                    if (userInfo.user.username) {
                        localStorage.setItem('username', userInfo.user.username);
                    }
                    this.updateAuthButton(true);
                    this.showDashboard();
                    return;
                } else {
                    console.log('Token invalid - clearing storage');
                    localStorage.removeItem('token');
                    localStorage.removeItem('username');
                }
            } catch (error) {
                console.error('Token verification failed:', error);
                // Token is invalid, clear storage
                localStorage.removeItem('token');
                localStorage.removeItem('username');
            }
        } else {
            console.log('No token found, user not authenticated');
        }

        // Show login if not authenticated
        this.updateAuthButton(false);
        this.showUserLogin();
    },

    showDashboard: () => DashboardUI.showDashboard(),

    showDeviceList: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Please login to view devices');
            UI.showUserLogin();
            return;
        }
        DevicesUI.showDeviceList();
    },

    showDeviceDetail: (serialNumber) => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Please login to view device details');
            UI.showUserLogin();
            return;
        }
        DevicesUI.showDeviceDetail(serialNumber);
    },

    showRealtimeMonitoring: (selectedSerial = null) => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Please login to view real-time monitoring');
            UI.showUserLogin();
            return;
        }
        RealtimeUI.showRealtimeMonitoring(selectedSerial);
    },

    showUserRegister: () => AuthUI.showUserRegister(),
    showUserLogin: () => AuthUI.showUserLogin(),

    showSettings: () => {
        const token = localStorage.getItem('token');
        if (!token) {
            console.log('Please login to access settings');
            UI.showUserLogin();
            return;
        }
        SettingsUI.showSettings();
    },

    updateAuthButton(isLoggedIn) {
        console.log('updateAuthButton called with isLoggedIn:', isLoggedIn);

        const loginLink = document.getElementById('loginLink');
        const logoutBtn = document.getElementById('logoutBtn');
        const registerLink = document.getElementById('registerLink');
        const dashboardLink = document.querySelector('nav a[onclick*="showDashboard"]');
        const deviceLink = document.querySelector('nav a[onclick*="showDeviceList"]');
        const userDisplayName = document.getElementById('userDisplayName');

        console.log('Elements found:', {
            loginLink: !!loginLink,
            logoutBtn: !!logoutBtn,
            registerLink: !!registerLink,
            dashboardLink: !!dashboardLink,
            deviceLink: !!deviceLink,
            userDisplayName: !!userDisplayName
        });

        if (logoutBtn) {
            console.log('Logout button display style:', logoutBtn.style.display);
        }

        if (isLoggedIn) {
            const username = localStorage.getItem('username') || 'User';
            console.log('Setting username to:', username);
            if (userDisplayName) {
                userDisplayName.textContent = username;
                console.log('Username displayed successfully');
            }

            // Hide login link and show logout button
            if (loginLink) {
                loginLink.style.display = 'none';
                console.log('Login link hidden');
            }
            if (logoutBtn) {
                logoutBtn.style.display = '';
                logoutBtn.onclick = (e) => {
                    e.preventDefault();
                    console.log('🚪 Logout button clicked');
                    // Clear localStorage
                    localStorage.removeItem('token');
                    localStorage.removeItem('username');
                    console.log('🗑️ LocalStorage cleared');

                    // Update UI
                    this.updateAuthButton(false);
                    console.log('UI updated to logged out state');

                    console.log('✅ Logged out successfully');
                    this.showUserLogin();
                };
                console.log('Logout button shown and handler attached');
            }
            if (registerLink) registerLink.style.display = 'none';
            if (dashboardLink) dashboardLink.style.display = '';
            if (deviceLink) deviceLink.style.display = '';
        } else {
            console.log('Setting UI to logged out state');
            if (userDisplayName) {
                userDisplayName.textContent = 'Guest';
                console.log('Username set to Guest');
            }

            // Show login link and hide logout button
            if (loginLink) {
                loginLink.style.display = '';
                loginLink.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Login';
                loginLink.onclick = () => this.showUserLogin();
                console.log('Login link shown');
            }
            if (logoutBtn) {
                logoutBtn.style.display = 'none';
                console.log('Logout button hidden');
            }
            if (registerLink) registerLink.style.display = '';
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (deviceLink) deviceLink.style.display = 'none';
            console.log('UI updated to logged out state');
        }
    },

    // Manual logout function for testing
    manualLogout() {
        console.log('🔌 Manual logout triggered');
        // Clear localStorage
        localStorage.removeItem('token');
        localStorage.removeItem('username');
        console.log('🗑️ LocalStorage cleared');

        // Update UI
        this.updateAuthButton(false);
        console.log('🔄 UI updated to logged out state');

        console.log('✅ Manual logout completed');
        this.showUserLogin();
    }

};

// Make UI globally available
window.UI = UI;

// Flag to track initialization
window.uiInitialized = false;
