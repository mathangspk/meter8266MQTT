const AuthUI = {
const AuthUI = {
    async showUserRegister() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/user-register.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const result = await API.registerUser(data);
            if (result.error) {
                alert(`Error: ${result.error}`);
            } else if (result.message) {
                alert(`Success: ${result.message}`);
            } else {
                alert('Unexpected response from server');
            }
        });
    },

    async showUserLogin() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/user-login.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        this.handleLoginForm();
    },

    async handleLoginForm() {
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const data = Object.fromEntries(formData.entries());
            const result = await API.loginUser(data);
            if (result.error) {
                alert(result.error);
            } else if (result.message) {
                alert(result.message);
                localStorage.setItem('username', result.username);
                UI.updateAuthButton(true);
                UI.showDashboard();
            }
        });
    }
};

// Make AuthUI globally available
window.AuthUI = AuthUI;


