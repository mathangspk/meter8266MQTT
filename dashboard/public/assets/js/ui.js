const UI = {
    showDashboard: () => DashboardUI.showDashboard(),
    showDeviceList: () => DevicesUI.showDeviceList(),
    showDeviceDetail: (serialNumber) => DevicesUI.showDeviceDetail(serialNumber),
    showUserRegister: () => AuthUI.showUserRegister(),
    showUserLogin: () => AuthUI.showUserLogin(),
    handleLoginForm: () => AuthUI.handleLoginForm(),
    updateAuthButton(isLoggedIn) {
        const loginLink = document.getElementById('loginLink');
        const registerLink = document.getElementById('registerLink');
        const dashboardLink = document.querySelector('nav a[onclick="UI.showDashboard()"]');
        const deviceLink = document.querySelector('nav a[onclick="UI.showDeviceList()"]');
        const userDisplayName = document.getElementById('userDisplayName');

        if (isLoggedIn) {
            const username = localStorage.getItem('username') || 'User';
            if (userDisplayName) userDisplayName.textContent = username;

            if (loginLink) {
                loginLink.innerHTML = '<i class="bi bi-box-arrow-right me-2"></i>Logout';
                loginLink.onclick = () => {
                    const result = API.logoutUser();
                    localStorage.removeItem('username');
                    UI.updateAuthButton(false);
                    alert(result.message);
                    UI.showDashboard();
                };
            }
            if (registerLink) registerLink.style.display = 'none';
            if (dashboardLink) dashboardLink.style.display = '';
            if (deviceLink) deviceLink.style.display = '';
        } else {
            if (userDisplayName) userDisplayName.textContent = 'Guest';

            if (loginLink) {
                loginLink.innerHTML = '<i class="bi bi-box-arrow-in-right me-2"></i>Login';
                loginLink.onclick = () => UI.showUserLogin();
            }
            if (registerLink) registerLink.style.display = '';
            if (dashboardLink) dashboardLink.style.display = 'none';
            if (deviceLink) deviceLink.style.display = 'none';
        }
    }
};
