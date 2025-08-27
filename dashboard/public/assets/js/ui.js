const UI = {
    showDashboard: () => DashboardUI.showDashboard(),
    showDeviceList: () => DevicesUI.showDeviceList(),
    showDeviceDetail: (serialNumber) => DevicesUI.showDeviceDetail(serialNumber),
    showUserRegister: () => AuthUI.showUserRegister(),
    showUserLogin: () => AuthUI.showUserLogin(),
    handleLoginForm: () => AuthUI.handleLoginForm(),
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
