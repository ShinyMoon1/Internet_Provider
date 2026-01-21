// auth.js
const API_CONFIG = {
    BASE_URL: 'http://localhost:8080/api/v1',
    ENDPOINTS: {
        ADMIN: {
            LOGIN: '/admin/login',
            VERIFY: '/admin/verify',
            DASHBOARD: '/admin/dashboard',
            USERS: '/admin/users'
        }
    }
};

class AuthService {
    constructor() {
        this.token = localStorage.getItem('adminToken');
        this.adminData = JSON.parse(localStorage.getItem('adminData')) || null;
    }

    async login(username, password) {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.LOGIN}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            
            this.token = data.token;
            this.adminData = data.admin;
            
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminData', JSON.stringify(data.admin));
            
            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    logout() {
        this.token = null;
        this.adminData = null;
        localStorage.removeItem('adminToken');
        localStorage.removeItem('adminData');
        this.showLoginModal();
    }

    async verifyToken() {
        if (!this.token) {
            return false;
        }

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.VERIFY}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            return response.ok;
            
        } catch (error) {
            console.error('Token verification failed:', error);
            return false;
        }
    }

    // ДОБАВЛЯЕМ ЭТОТ МЕТОД
    getToken() {
        return this.token;
    }

    getAuthHeaders() {
        if (!this.token) {
            throw new Error('No token available');
        }
        return {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
        };
    }

    isAuthenticated() {
        return !!this.token;
    }

    showLoginModal() {
        document.getElementById('loginModal').style.display = 'flex';
        document.getElementById('adminPanel').style.display = 'none';
    }

    showAdminPanel() {
        document.getElementById('loginModal').style.display = 'none';
        document.getElementById('adminPanel').style.display = 'grid';
    }
}

window.authService = new AuthService();

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const formData = new FormData(this);
            const username = formData.get('username');
            const password = formData.get('password');
            
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.innerHTML;
            
            try {
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
                submitBtn.disabled = true;
                
                await window.authService.login(username, password);
                
                location.reload();
                
            } catch (error) {
                console.error('Login failed:', error);
                alert('Ошибка входа: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    setTimeout(() => {
        if (window.authService.isAuthenticated()) {
            window.authService.verifyToken().then(isValid => {
                if (isValid) {
                    window.authService.showAdminPanel();
                    
                    if (window.initializeAdminPanel) {
                        initializeAdminPanel();
                    }
                } else {
                    window.authService.showLoginModal();
                }
            });
        } else {
            window.authService.showLoginModal();
        }
    }, 100);
});