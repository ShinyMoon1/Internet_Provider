// admin.js - ИСПРАВЛЕННЫЙ ДАШБОРД
class AdminAPI {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/v1/admin';
    }

    async getUsers(search = '', filter = 'all', page = 1, limit = 20) {
        try {
            if (!window.authService || !window.authService.token) {
                throw new Error('Не авторизован');
            }
            
            const token = window.authService.token;
            
            const params = new URLSearchParams();
            if (search) params.append('search', search);
            if (filter && filter !== 'all') params.append('filter', filter);
            params.append('page', page);
            params.append('limit', limit);
            
            const url = `${this.baseUrl}/users?${params.toString()}`;
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Ошибка при загрузке пользователей:', error);
            throw error;
        }
    }

    async getDashboardStats() {
        try {
            if (!window.authService || !window.authService.token) {
                throw new Error('Не авторизован');
            }
            
            const token = window.authService.token;
            const response = await fetch(`${this.baseUrl}/dashboard`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Ошибка дашборда:', error);
            throw error;
        }
    }

    async getAllPayments() {
        try {
            if (!window.authService || !window.authService.token) {
                throw new Error('Не авторизован');
            }
            
            const token = window.authService.token;
            const response = await fetch(`${this.baseUrl}/payments?limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Ошибка загрузки платежей:', error);
            throw error;
        }
    }

    async getAllUsers() {
        try {
            if (!window.authService || !window.authService.token) {
                throw new Error('Не авторизован');
            }
            
            const token = window.authService.token;
            const response = await fetch(`${this.baseUrl}/users?limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status}`);
            }
            
            return await response.json();
            
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            throw error;
        }
    }
}

class AdminUI {
    constructor() {
        this.api = new AdminAPI();
        this.allUsers = []; // Кэш пользователей для поиска
    }

    async loadDashboard() {
        try {
            console.log('📊 Загружаем дашборд...');
            
            // Загружаем статистику с API
            const stats = await this.api.getDashboardStats();
            console.log('📈 Статистика API:', stats);
            
            // Показываем базовую статистику
            this.updateElement('totalUsers', stats.total_users || 0);
            this.updateElement('totalPayments', stats.total_payments || 0);
            this.updateElement('totalRevenue', `${stats.total_revenue || 0} ₽`);
            this.updateElement('activeTariffs', stats.active_tariffs || 0);
            
            // Если статистика пустая или неполная, рассчитываем сами
            if (!stats.total_payments || !stats.total_revenue || !stats.active_tariffs) {
                console.log('⚠️ Статистика неполная, загружаем детальные данные...');
                await this.calculateDetailedStats();
            }
            
            // Загружаем пользователей для отображения имен
            await this.loadUsersForDashboard();
            
            // Загружаем последние платежи с именами пользователей
            await this.loadRecentPayments();
            
            // Загружаем новых пользователей
            await this.loadRecentUsers();
            
        } catch (error) {
            console.error('Ошибка дашборда:', error);
            
            // Показываем заглушки
            this.updateElement('totalUsers', '0');
            this.updateElement('totalPayments', '0');
            this.updateElement('totalRevenue', '0 ₽');
            this.updateElement('activeTariffs', '0');
            
            // Пробуем загрузить данные для расчета
            try {
                await this.calculateDetailedStats();
            } catch (calcError) {
                console.error('Не удалось рассчитать статистику:', calcError);
            }
        }
    }

    async loadUsersForDashboard() {
        try {
            console.log('👥 Загружаем пользователей для дашборда...');
            const data = await this.api.getAllUsers();
            this.allUsers = data.user || data.users || [];
            console.log(`✅ Загружено ${this.allUsers.length} пользователей для дашборда`);
        } catch (error) {
            console.error('Ошибка загрузки пользователей для дашборда:', error);
            this.allUsers = [];
        }
    }

    // Найти пользователя по ID
    findUserById(userId) {
        if (!this.allUsers.length) return null;
        return this.allUsers.find(user => user.id == userId);
    }

    // Получить имя пользователя по ID
    getUserNameById(userId) {
        const user = this.findUserById(userId);
        if (!user) return `Пользователь #${userId}`;
        
        return user.name || user.username || user.full_name || `Пользователь #${userId}`;
    }

    async calculateDetailedStats() {
        try {
            console.log('🧮 Рассчитываем детальную статистику...');
            
            // Загружаем все платежи
            const paymentsData = await this.api.getAllPayments();
            const allPayments = paymentsData.payments || paymentsData.data || [];
            console.log(`📊 Всего платежей в системе: ${allPayments.length}`);
            
            // Рассчитываем общее количество платежей
            const totalPayments = allPayments.length;
            
            // Рассчитываем общий доход (сумма всех платежей)
            const totalRevenue = allPayments.reduce((sum, payment) => {
                return sum + (parseFloat(payment.amount) || 0);
            }, 0);
            
            // Загружаем всех пользователей для подсчета активных тарифов
            if (this.allUsers.length === 0) {
                const usersData = await this.api.getAllUsers();
                this.allUsers = usersData.user || usersData.users || [];
            }
            
            // Подсчитываем активные тарифы
            const activeTariffs = this.allUsers.filter(user => {
                // Проверяем наличие тарифа
                return user.tariff_id || 
                       user.tariff_active || 
                       user.active_tariff || 
                       user.tariff_name;
            }).length;
            
            console.log('📈 Рассчитанная статистика:', {
                totalPayments,
                totalRevenue,
                activeTariffs,
                totalUsers: this.allUsers.length
            });
            
            // Обновляем данные на дашборде
            this.updateElement('totalPayments', totalPayments);
            this.updateElement('totalRevenue', `${Math.round(totalRevenue)} ₽`);
            this.updateElement('activeTariffs', activeTariffs);
            this.updateElement('totalUsers', this.allUsers.length);
            
        } catch (error) {
            console.error('Ошибка расчета статистики:', error);
            throw error;
        }
    }

    async loadRecentPayments() {
        try {
            // Загружаем все платежи
            const paymentsData = await this.api.getAllPayments();
            const payments = paymentsData.payments || [];
            
            // Загружаем всех пользователей для получения имен
            const usersData = await this.api.getAllUsers();
            const allUsers = usersData.user || usersData.users || [];
            
            // Создаем мап пользователей по ID для быстрого поиска
            const usersMap = {};
            allUsers.forEach(user => {
                usersMap[user.id] = {
                    name: user.name || user.username || `Пользователь #${user.id}`,
                    email: user.email || ''
                };
            });
            
            // Берем 5 последних платежей
            const recentPayments = payments
                .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                .slice(0, 5);
            
            const tableBody = document.getElementById('recentPayments');
            if (!tableBody) return;
            
            let html = '';
            
            if (recentPayments.length === 0) {
                html = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-credit-card"></i>
                            <div>Нет платежей</div>
                        </td>
                    </tr>
                `;
            } else {
                recentPayments.forEach(payment => {
                    // Получаем пользователя из мапа
                    const user = usersMap[payment.user_id];
                    const userName = user ? user.name : 
                                (payment.user_id ? `Пользователь #${payment.user_id}` : 'Неизвестно');
                    const amount = payment.amount || 0;
                    const date = payment.created_at ? 
                        new Date(payment.created_at).toLocaleDateString('ru-RU') : '-';
                    
                    html += `
                        <tr>
                            <td>
                                <div style="font-weight: 500;">${userName}</div>
                                <small style="color: #666;">ID: ${payment.user_id || '?'}</small>
                            </td>
                            <td>
                                <span class="amount positive">
                                    ${amount} ₽
                                </span>
                            </td>
                            <td>${date}</td>
                        </tr>
                    `;
                });
            }
            
            tableBody.innerHTML = html;
            
        } catch (error) {
            console.error('Ошибка загрузки последних платежей:', error);
            const tableBody = document.getElementById('recentPayments');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="4" style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-exclamation-circle"></i>
                            <div>Не удалось загрузить</div>
                        </td>
                    </tr>
                `;
            }
        }
}

    async loadRecentUsers() {
        try {
            if (this.allUsers.length === 0) {
                const data = await this.api.getAllUsers();
                this.allUsers = data.user || data.users || [];
            }
            
            // Берем 5 последних пользователей
            const recentUsers = [...this.allUsers]
                .sort((a, b) => {
                    // Сортируем по дате создания или по ID (новые сначала)
                    const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
                    const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
                    if (dateA.getTime() === dateB.getTime()) {
                        return (b.id || 0) - (a.id || 0); // По ID если нет даты
                    }
                    return dateB - dateA;
                })
                .slice(0, 5);
            
            const tableBody = document.getElementById('recentUsers');
            if (!tableBody) return;
            
            let html = '';
            
            if (recentUsers.length === 0) {
                html = `
                    <tr>
                        <td colspan="3" style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-users"></i>
                            <div>Нет пользователей</div>
                        </td>
                    </tr>
                `;
            } else {
                recentUsers.forEach(user => {
                    const userName = user.name || user.username || `Пользователь #${user.id}`;
                    const email = user.email || 'Не указан';
                    const balance = user.balance || 0;
                    
                    html += `
                        <tr>
                            <td>
                                <div style="font-weight: 500;">${this.escapeHtml(userName)}</div>
                                <small style="color: #666;">ID: ${user.id}</small>
                            </td>
                            <td>
                                ${email}
                                ${user.phone ? `<br><small style="color: #666;">📱 ${user.phone}</small>` : ''}
                            </td>
                            <td>
                                <span style="color: ${balance >= 0 ? '#28a745' : '#dc3545'}; font-weight: bold;">
                                    ${balance} ₽
                                </span>
                                <br>
                            </td>
                        </tr>
                    `;
                });
            }
            
            tableBody.innerHTML = html;
            
        } catch (error) {
            console.error('Ошибка загрузки новых пользователей:', error);
            const tableBody = document.getElementById('recentUsers');
            if (tableBody) {
                tableBody.innerHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; padding: 20px; color: #666;">
                            <i class="fas fa-exclamation-circle"></i>
                            <div>Не удалось загрузить</div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    formatPaymentMethod(method) {
        if (!method) return 'Не указан';
        
        const methods = {
            'card': '💳 Карта',
            'cash': '💵 Наличные',
            'transfer': '🏦 Перевод',
            'online': '🌐 Онлайн'
        };
        
        return methods[method] || method;
    }

    updateElement(id, value) {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
        }
    }

    async loadUsers(search = '', filter = 'all', page = 1) {
        const tableBody = document.getElementById('usersTable');
        if (!tableBody) {
            console.error('Не найден usersTable');
            return;
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 20px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <span>Загрузка пользователей...</span>
                    </div>
                </td>
            </tr>
        `;
        
        try {
            const data = await this.api.getUsers(search, filter, page, 20);
            const usersArray = data.user || data.users || [];
            
            if (usersArray.length === 0) {
                this.showNoUsers();
                return;
            }
            
            this.renderUsersTable(usersArray);
            
        } catch (error) {
            console.error('Ошибка загрузки:', error);
            this.showError('Не удалось загрузить пользователей: ' + error.message);
        }
    }

    renderUsersTable(users) {
        const tableBody = document.getElementById('usersTable');
        if (!tableBody) return;
        
        let html = '';
        
        users.forEach(user => {
            const userName = user.name || user.username || user.full_name || 'Не указано';
            const hasTariff = user.tariff_id || user.tariff_name || user.tariff;
            const tariffName = user.tariff_name || user.tariff || 'Без тарифа';
            const isActive = user.tariff_active || user.active_tariff || user.tariff_id;
            
            html += `
                <tr>
                    <td>${user.id || '-'}</td>
                    <td>
                        <div style="font-weight: 500;">${this.escapeHtml(userName)}</div>
                        ${user.email ? `<small style="color: #666;">${user.email}</small>` : ''}
                    </td>
                    <td>${user.phone || user.phone_number || '-'}</td>
                    <td>
                        <span class="amount ${(user.balance || 0) >= 0 ? 'positive' : 'negative'}">
                            ${user.balance || 0} ₽
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${isActive ? 'status-active' : 'status-inactive'}">
                            ${isActive ? 'Активен' : 'Неактивен'}
                        </span>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
    }

    showNoUsers() {
        const tableBody = document.getElementById('usersTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-users-slash" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #666;">Пользователи не найдены</h3>
                </td>
            </tr>
        `;
    }

    showError(message) {
        const tableBody = document.getElementById('usersTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка</h3>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }

    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Глобальный экземпляр
window.adminUI = new AdminUI();

window.initializeAdminPanel = async function() {
    console.log('🚀 Инициализация админ-панели...');
    
    try {
        // Обновляем имя администратора
        const adminName = document.getElementById('adminName');
        if (adminName && window.authService && window.authService.adminData) {
            adminName.textContent = window.authService.adminData.username || 'Администратор';
        }
        
        // Загружаем данные для активной вкладки
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'dashboard') {
            await adminUI.loadDashboard();
        }
        
        setupEventListeners();
        
        console.log('✅ Админ-панель инициализирована');
        
    } catch (error) {
        console.error('❌ Ошибка инициализации:', error);
    }
};

function setupEventListeners() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    const userSearch = document.getElementById('userSearch');
    if (userSearch) {
        userSearch.addEventListener('input', debounce(function() {
            adminUI.loadUsers(this.value, document.getElementById('userFilter')?.value || 'all');
        }, 500));
    }
    
    const userFilter = document.getElementById('userFilter');
    if (userFilter) {
        userFilter.addEventListener('change', function() {
            adminUI.loadUsers(userSearch?.value || '', this.value);
        });
    }
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            window.authService.logout();
        });
    }
}

async function switchTab(tabName) {
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
        
        if (tabName === 'users') {
            await adminUI.loadUsers();
        } else if (tabName === 'dashboard') {
            await adminUI.loadDashboard();
        } else if (tabName === 'payments') {
            if (window.loadPaymentsTab) {
                await loadPaymentsTab();
            }
        }
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

window.switchTab = switchTab;