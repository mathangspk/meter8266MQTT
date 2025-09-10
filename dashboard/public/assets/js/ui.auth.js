const AuthUI = {
    async showUserRegister() {
        if (window.latestReadingInterval) clearInterval(window.latestReadingInterval);
        const html = await fetch('assets/components/user-register.html').then(res => res.text());
        document.getElementById('content').innerHTML = html;
        document.getElementById('registerForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(e.target);
            const allData = Object.fromEntries(formData.entries());

            // Only send required fields to backend
            const data = {
                username: allData.username,
                email: allData.email,
                password: allData.password
            };

            const result = await API.registerUser(data);
            if (result.error) {
                console.log('Register error:', result.error);
                // Show error message in UI
                const errorDiv = document.getElementById('registerError');
                const errorText = document.getElementById('registerErrorText');
                if (errorDiv && errorText) {
                    errorText.textContent = result.error;
                    errorDiv.classList.remove('d-none');
                }
            } else if (result.message) {
                console.log('Register success:', result.message);
                // Hide error message if visible
                const errorDiv = document.getElementById('registerError');
                if (errorDiv) {
                    errorDiv.classList.add('d-none');
                }
                // Show success message or redirect to login
                alert('Registration successful! Please log in with your credentials.');
                AuthUI.showUserLogin();
            } else {
                console.log('Register: Unexpected response from server');
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
        let isSubmitting = false;

        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();

            if (isSubmitting) {
                return; // Prevent multiple submissions
            }

            isSubmitting = true;
            const submitButton = e.target.querySelector('button[type="submit"]');
            const originalText = submitButton ? submitButton.textContent : '';
            if (submitButton) submitButton.textContent = 'Logging in...';
            if (submitButton) submitButton.disabled = true;

            try {
                const formData = new FormData(e.target);
                const data = Object.fromEntries(formData.entries());

                const result = await API.loginUser(data);

                if (result.error) {
                    console.log('Login failed:', result.error);
                    // Show error message in UI
                    const errorDiv = document.getElementById('loginError');
                    const errorText = document.getElementById('loginErrorText');
                    if (errorDiv && errorText) {
                        errorText.textContent = result.error;
                        errorDiv.classList.remove('d-none');
                    }
                } else if (result.message && result.token) {
                    console.log('Login successful:', result.message);

                    // Hide error message if visible
                    const errorDiv = document.getElementById('loginError');
                    if (errorDiv) {
                        errorDiv.classList.add('d-none');
                    }

                    // Store user info
                    const username = result.user?.username || data.username;
                    console.log('Storing username:', username);
                    localStorage.setItem('username', username);
                    localStorage.setItem('token', result.token);

                    // Update UI immediately
                    if (window.UI && typeof UI.updateAuthButton === 'function') {
                        console.log('Updating auth button to logged in state');
                        UI.updateAuthButton(true);
                    }

                    // Navigate to dashboard
                    if (window.UI && typeof UI.showDashboard === 'function') {
                        console.log('Navigating to dashboard');
                        UI.showDashboard();
                    } else {
                        console.log('Reloading page');
                        location.reload();
                    }
                } else {
                    console.log('Login: Unexpected response from server');
                }
            } catch (error) {
                console.error('Login error:', error);
                // Show network error in UI
                const errorDiv = document.getElementById('loginError');
                const errorText = document.getElementById('loginErrorText');
                if (errorDiv && errorText) {
                    errorText.textContent = 'Network error. Please check your connection and try again.';
                    errorDiv.classList.remove('d-none');
                }
            } finally {
                isSubmitting = false;
                if (submitButton) submitButton.textContent = originalText;
                if (submitButton) submitButton.disabled = false;
            }
        });
    }
};

// Make AuthUI globally available
window.AuthUI = AuthUI;


