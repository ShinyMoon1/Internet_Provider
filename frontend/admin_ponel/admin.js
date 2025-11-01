// admin.js

// Перенесем инициализацию сюда чтобы она была глобальной
window.initializeAdminPanel = async function() {
    try {
        console.log('🚀 Initializing admin panel...');

        // Обновляем информацию о администраторе
        updateAdminInfo();
        
        // Загружаем начальные данные
        await loadInitialData();
        
        // Настраиваем обработчики событий
        setupEventListeners();

        console.log('✅ Admin panel initialized successfully');
        
    } catch (error) {
        console.error('❌ Admin panel initialization failed:', error);
    }
};

function updateAdminInfo() {
    const adminNameElement = document.getElementById('adminName');
    if (adminNameElement && window.authService.adminData) {
        adminNameElement.textContent = window.authService.adminData.username;
        console.log('✅ Admin info updated:', window.authService.adminData.username);
    }
}

async function loadInitialData() {
    try {
        console.log('📥 Loading initial data...');
        
        // Загружаем данные для активной вкладки
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab) {
            await loadTabData(activeTab.id);
        }
        
    } catch (error) {
        console.error('❌ Initial data loading failed:', error);
    }
}

async function loadTabData(tabId) {
    console.log(`📊 Loading data for tab: ${tabId}`);
    
    switch (tabId) {
        case 'dashboard':
            if (window.adminUI) {
                await window.adminUI.updateDashboard();
            }
            break;
        case 'users':
            if (window.adminUI) {
                await window.adminUI.updateUsersTable();
            }
            break;
        default:
            console.log(`ℹ️ No data loader for tab: ${tabId}`);
    }
}
function setupEventListeners() {
    console.log('🔧 Setting up event listeners...');
    
    // Обработчики меню
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            console.log(`🎯 Switching to tab: ${tabName}`);
            switchTab(tabName);
        });
    });

    // Поиск пользователей
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(async function() {
            console.log('🔍 User search:', this.value);
            await window.adminUI.updateUsersTable(this.value);
        }, 300));
    }

    // Фильтр пользователей
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', async function() {
            console.log('🎛️ User filter:', this.value);
            await window.adminUI.updateUsersTable('', this.value);
        });
    }

    // Выход из системы
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            console.log('🚪 Logging out...');
            window.authService.logout();
        });
    }

    console.log('✅ Event listeners setup complete');
}

// Утилиты
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Переключение вкладок
async function switchTab(tabName) {
    console.log(`🔄 Switching to tab: ${tabName}`);
    
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    const menuItem = document.querySelector(`[data-tab="${tabName}"]`);
    const tabContent = document.getElementById(tabName);
    
    if (menuItem && tabContent) {
        menuItem.classList.add('active');
        tabContent.classList.add('active');
        await loadTabData(tabName);
    } else {
        console.error(`❌ Tab elements not found for: ${tabName}`);
    }
}

// Глобальные функции для HTML onclick
window.switchTab = switchTab;

// Заглушки для модальных окон
window.showUserModal = function() {
    alert('Добавление пользователя - функция в разработке');
};

window.closeUserModal = function() {
    console.log('Close user modal');
};

window.saveUser = function() {
    alert('Сохранение пользователя - функция в разработке');
};

window.showTariffModal = function() {
    alert('Добавление тарифа - функция в разработке');
};

// admin.js
class AdminAPI {
    constructor() {
        // Не инициализируем authService здесь, будем получать его при вызове методов
    }

    getAuthService() {
        if (!window.authService) {
            throw new Error('AuthService not available');
        }
        return window.authService;
    }

    async getDashboardStats() {
        try {
            console.log('📊 Fetching dashboard stats...');
            
            const response = await fetch(`http://localhost:8080/api/v1/admin/dashboard`, {
                headers: this.getAuthService().getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Dashboard data:', data);
            return data;
        } catch (error) {
            console.error('❌ Dashboard error:', error);
            throw error;
        }
    }

    async getUsers(params = {}) {
        try {
            console.log('👥 Fetching users...', params);
            
            const queryString = new URLSearchParams(params).toString();
            const url = `http://localhost:8080/api/v1/admin/users${queryString ? `?${queryString}` : ''}`;

            const response = await fetch(url, {
                headers: this.getAuthService().getAuthHeaders()
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Users data:', data);
            return data;
        } catch (error) {
            console.error('❌ Users error:', error);
            throw error;
        }
    }
}

class UIManager {
    constructor() {
        this.adminAPI = new AdminAPI();
    }

    async updateDashboard() {
        try {
            console.log('🔄 Updating dashboard...');
            
            // Проверим доступность authService
            if (!window.authService || !window.authService.getAuthHeaders) {
                throw new Error('AuthService not ready');
            }
            
            const stats = await this.adminAPI.getDashboardStats();
            
            this.updateElement('totalUsers', stats.total_users || 0);
            this.updateElement('totalPayments', stats.total_payments || 0);
            this.updateElement('totalRevenue', `${stats.total_revenue || 0} ₽`);
            this.updateElement('activeTariffs', stats.active_tariffs || 0);
            
            console.log('✅ Dashboard updated successfully');
            
        } catch (error) {
            console.error('❌ Dashboard update failed:', error);
            this.showError('Ошибка загрузки дашборда: ' + error.message);
        }
    }

    async updateUsersTable(search = '', filter = 'all', page = 1) {
        try {
            console.log('🔄 Updating users table...');
            
            // Проверим доступность authService
            if (!window.authService || !window.authService.getAuthHeaders) {
                throw new Error('AuthService not ready');
            }
            
            const params = { search, filter, page, limit: 20 };
            const data = await this.adminAPI.getUsers(params);
            
            this.renderUsersTable(data.users || []);
            console.log('✅ Users table updated successfully');
            
        } catch (error) {
            console.error('❌ Users table update failed:', error);
            this.showError('Ошибка загрузки пользователей: ' + error.message);
        }
    }

    renderUsersTable(users) {
        const tbody = document.getElementById('usersTable');
        if (!tbody) {
            console.warn('⚠️ usersTable element not found');
            return;
        }

        if (users.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" style="text-align: center; padding: 2rem;">
                        <i class="fas fa-users" style="font-size: 3rem; color: #ccc; margin-bottom: 1rem;"></i>
                        <p>Пользователи не найдены</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td>
                <td>${this.escapeHtml(user.name || 'Не указано')}</td>
                <td>${this.escapeHtml(user.email || 'Не указано')}</td>
                <td>${user.phone || '-'}</td>
                <td>${user.balance || 0} ₽</td>
                <td>${user.tariff_name || 'Не активирован'}</td>
                <td>
                    <span class="status-badge ${user.tariff_id ? 'status-active' : 'status-inactive'}">
                        ${user.tariff_id ? 'Активен' : 'Неактивен'}
                    </span>
                </td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn edit" onclick="adminUI.editUser(${user.id})" title="Редактировать">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn view" onclick="adminUI.viewUser(${user.id})" title="Просмотр">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    updateElement(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        } else {
            console.warn(`⚠️ Element #${elementId} not found`);
        }
    }

    showError(message) {
        console.error('💥 UI Error:', message);
        alert(message);
    }

    escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    editUser(userId) {
        console.log('Edit user:', userId);
        alert(`Редактирование пользователя ${userId} - функция в разработке`);
    }

    viewUser(userId) {
        console.log('View user:', userId);
        alert(`Просмотр пользователя ${userId} - функция в разработке`);
    }
}

// Создаем глобальный экземпляр
window.adminUI = new UIManager();