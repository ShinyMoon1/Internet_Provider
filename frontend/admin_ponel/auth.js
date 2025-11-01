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
            console.log('🔐 Attempting login for:', username);
            
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
            console.log('✅ Login response received');
            console.log('📏 Token length from server:', data.token.length);
            console.log('🔐 Token from server (first 50):', data.token.substring(0, 50));
            
            // Проверим структуру токена ДО сохранения
            const parts = data.token.split('.');
            console.log('📋 Token parts from server:', parts.length);
            console.log('📏 Part lengths from server:', parts.map(p => p.length));
            
            this.token = data.token;
            this.adminData = data.admin;
            
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminData', JSON.stringify(data.admin));
            
            console.log('✅ Token saved to localStorage');
            
            // Проверим что сохранилось
            const savedToken = localStorage.getItem('adminToken');
            console.log('📏 Saved token length:', savedToken.length);
            console.log('🔐 Saved token (first 50):', savedToken.substring(0, 50));
            
            return data;
        } catch (error) {
            console.error('❌ Login error:', error);
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
            console.log('❌ No token available for verification');
            return false;
        }

        try {
            console.log('🔐 Verifying token...');
            console.log('📤 Token being sent:', this.token.substring(0, 20) + '...');
            
            const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.ADMIN.VERIFY}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('📡 Verify response status:', response.status);
            console.log('📡 Verify response ok:', response.ok);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.log('❌ Verify failed with response:', errorText);
                return false;
            }
            
            console.log('✅ Token verification successful');
            return true;
            
        } catch (error) {
            console.error('❌ Token verification failed:', error);
            return false;
        }
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

// Создаем глобальный экземпляр
window.authService = new AuthService();

// Обработчик формы логина
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
                console.log('🔄 Processing login...');
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Вход...';
                submitBtn.disabled = true;
                
                await window.authService.login(username, password);
                
                console.log('✅ Login successful, reloading page...');
                // Перезагружаем страницу для полной инициализации админки
                location.reload();
                
            } catch (error) {
                console.error('❌ Login failed:', error);
                alert('Ошибка входа: ' + error.message);
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        });
    }
    
    // Проверяем авторизацию при загрузке
    setTimeout(() => {
        if (window.authService.isAuthenticated()) {
            console.log('✅ User is authenticated, verifying token...');
            window.authService.verifyToken().then(isValid => {
                if (isValid) {
                    console.log('✅ Token is valid, showing admin panel');
                    window.authService.showAdminPanel();
                    
                    // Инициализируем админку если скрипт загружен
                    if (window.initializeAdminPanel) {
                        initializeAdminPanel();
                    }
                } else {
                    console.log('❌ Token invalid, showing login');
                    window.authService.showLoginModal();
                }
            });
        } else {
            console.log('❌ Not authenticated, showing login modal');
            window.authService.showLoginModal();
        }
    }, 100);
});