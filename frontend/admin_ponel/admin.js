// Основной файл JavaScript для админ панели
document.addEventListener('DOMContentLoaded', function() {
    initializeAdminPanel();
});

function initializeAdminPanel() {
    // Проверяем авторизацию
    checkAdminAuth();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Загружаем начальные данные
    loadDashboardData();
}

function checkAdminAuth() {
    const token = localStorage.getItem('adminToken');
    if (token) {
        showAdminPanel();
        verifyAdminToken(token);
    } else {
        showLoginModal();
    }
}

function showLoginModal() {
    document.getElementById('loginModal').style.display = 'flex';
    document.getElementById('adminPanel').style.display = 'none';
}

function showAdminPanel() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'grid';
}

// Обработчик формы логина
document.getElementById('adminLoginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    const credentials = {
        username: formData.get('username'),
        password: formData.get('password')
    };
    
    try {
        const response = await fetch('/api/v1/admin/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(credentials)
        });
        
        if (response.ok) {
            const data = await response.json();
            localStorage.setItem('adminToken', data.token);
            localStorage.setItem('adminName', data.admin.username);
            showAdminPanel();
            loadDashboardData();
        } else {
            alert('Ошибка авторизации!');
        }
    } catch (error) {
        console.error('Login error:', error);
        alert('Ошибка подключения к серверу');
    }
});

// Выход из системы
document.getElementById('logoutBtn').addEventListener('click', function() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminName');
    showLoginModal();
});

// Переключение между вкладками
function setupEventListeners() {
    // Меню сайдбара
    document.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
    
    // Поиск и фильтры
    document.getElementById('userSearch').addEventListener('input', debounce(loadUsers, 300));
    document.getElementById('paymentSearch').addEventListener('input', debounce(loadPayments, 300));
    document.getElementById('userFilter').addEventListener('change', loadUsers);
    document.getElementById('paymentFilter').addEventListener('change', loadPayments);
    document.getElementById('applicationFilter').addEventListener('change', loadApplications);
}

function switchTab(tabName) {
    // Убираем активный класс у всех вкладок и пунктов меню
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Активируем выбранную вкладку
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Загружаем данные для вкладки
    switch(tabName) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'users':
            loadUsers();
            break;
        case 'payments':
            loadPayments();
            break;
        case 'applications':
            loadApplications();
            break;
        case 'tariffs':
            loadTariffs();
            break;
    }
}

// Загрузка данных дашборда
async function loadDashboardData() {
    try {
        const token = localStorage.getItem('adminToken');
        const response = await fetch('/api/v1/admin/dashboard', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            updateDashboard(data);
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboard(data) {
    // Обновляем статистику
    document.getElementById('totalUsers').textContent = data.total_users || 0;
    document.getElementById('totalPayments').textContent = data.total_payments || 0;
    document.getElementById('totalRevenue').textContent = (data.total_revenue || 0) + ' ₽';
    document.getElementById('activeTariffs').textContent = data.active_tariffs || 0;
    
    // Обновляем бейдж заявок
    const badge = document.getElementById('applicationsBadge');
    if (data.pending_applications > 0) {
        badge.textContent = data.pending_applications;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// Загрузка пользователей
async function loadUsers() {
    try {
        const token = localStorage.getItem('adminToken');
        const search = document.getElementById('userSearch').value;
        const filter = document.getElementById('userFilter').value;
        
        const response = await fetch(`/api/v1/admin/users?search=${search}&filter=${filter}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            const users = await response.json();
            renderUsersTable(users);
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

function renderUsersTable(users) {
    const tbody = document.getElementById('usersTable');
    tbody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.email}</td>
            <td>${user.phone || '-'}</td>
            <td>${user.balance} ₽</td>
            <td>${user.tariff_name || 'Не активирован'}</td>
            <td><span class="status-badge ${user.tariff_id ? 'status-active' : 'status-inactive'}">${user.tariff_id ? 'Активен' : 'Неактивен'}</span></td>
            <td>
                <div class="table-actions">
                    <button class="action-btn edit" onclick="editUser(${user.id})" title="Редактировать">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteUser(${user.id})" title="Удалить">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// Модальные окна
function showUserModal() {
    document.getElementById('userModal').style.display = 'flex';
}

function closeUserModal() {
    document.getElementById('userModal').style.display = 'none';
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

async function verifyAdminToken(token) {
    try {
        const response = await fetch('/api/v1/admin/verify', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Invalid token');
        }
        
        const adminData = await response.json();
        document.getElementById('adminName').textContent = adminData.username;
    } catch (error) {
        localStorage.removeItem('adminToken');
        showLoginModal();
    }
}

// Заглушки для остальных функций (реализуйте по аналогии)
async function loadPayments() {
    console.log('Loading payments...');
}

async function loadApplications() {
    console.log('Loading applications...');
}

async function loadTariffs() {
    console.log('Loading tariffs...');
}

function editUser(userId) {
    console.log('Edit user:', userId);
}

function deleteUser(userId) {
    if (confirm('Вы уверены, что хотите удалить пользователя?')) {
        console.log('Delete user:', userId);
    }
}

function saveUser() {
    console.log('Saving user...');
    closeUserModal();
}

function showTariffModal() {
    console.log('Show tariff modal');
}