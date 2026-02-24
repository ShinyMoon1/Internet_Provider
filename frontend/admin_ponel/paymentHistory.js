// payments.js - С ИМЕНАМИ ПОЛЬЗОВАТЕЛЕЙ И ПОИСКОМ ПО ИМЕНИ
class PaymentsAPI {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/v1/admin';
        this.allPayments = [];
        this.allUsers = []; // Кэш пользователей
    }

    async getPayments(params = {}) {
        try {
            if (!window.authService || !window.authService.token) {
                throw new Error('Не авторизован');
            }
            
            const token = window.authService.token;
            
            const queryString = new URLSearchParams(params).toString();
            const url = `${this.baseUrl}/payments${queryString ? `?${queryString}` : ''}`;
            
            console.log('📤 Запрос платежей:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Ошибка: ${response.status}`);
            }
            
            const data = await response.json();
            return data;
            
        } catch (error) {
            console.error('Ошибка при загрузке платежей:', error);
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
            
            const data = await response.json();
            this.allUsers = data.user || data.users || [];
            console.log(`👥 Загружено пользователей: ${this.allUsers.length}`);
            
            return this.allUsers;
            
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            throw error;
        }
    }

    // Получить пользователя по ID
    getUserById(userId) {
        return this.allUsers.find(user => user.id == userId);
    }

    // Поиск пользователей по имени или email
    searchUsers(searchText) {
        if (!searchText || searchText.length < 2) return [];
        
        const searchLower = searchText.toLowerCase();
        return this.allUsers.filter(user => {
            const name = (user.name || user.username || '').toLowerCase();
            
            return name.includes(searchLower) || 
                   user.id.toString().includes(searchText);
        });
    }
}

class PaymentsUI {
    constructor() {
        this.api = new PaymentsAPI();
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentDate = '';
        this.allPayments = [];
        this.allUsers = [];
        this.paymentsWithUserInfo = []; // Платежи с информацией о пользователях
        this.filteredPayments = []; // Отфильтрованные платежи для отображения
        this.isInitialized = false;
    }

    async loadAllData() {
        try {
            console.log('📥 Загружаем все данные...');
            
            // Загружаем платежи
            const paymentsData = await this.api.getPayments({ limit: 1000 });
            this.allPayments = paymentsData.payments || [];
            console.log(`📊 Загружено платежей: ${this.allPayments.length}`);
            
            // Загружаем пользователей
            this.allUsers = await this.api.getAllUsers();
            
            // Объединяем данные
            this.combinePaymentsWithUserInfo();
            
            // Применяем фильтры
            this.applyFilters();
            
        } catch (error) {
            console.error('Ошибка загрузки данных:', error);
            this.showError('Не удалось загрузить данные: ' + error.message);
        }
    }

    combinePaymentsWithUserInfo() {
        console.log('🔗 Объединяем платежи с информацией о пользователях...');
        
        this.paymentsWithUserInfo = this.allPayments.map(payment => {
            const user = this.api.getUserById(payment.user_id);
            
            return {
                ...payment,
                user_info: user ? {
                    id: user.id,
                    name: user.name || user.username || `Пользователь #${user.id}`,
                    email: user.email || '',
                    phone: user.phone || user.phone_number || '',
                    tariff: user.tariff_name || user.tariff || 'Без тарифа'
                } : {
                    id: payment.user_id,
                    name: `Пользователь #${payment.user_id}`,
                    email: '',
                    phone: '',
                    tariff: 'Неизвестно'
                }
            };
        });
        
        console.log(`✅ Объединено ${this.paymentsWithUserInfo.length} платежей`);
    }

    async loadPayments() {
        console.log(`🔄 Загружаем платежи...`);
        
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) {
            console.error('❌ Не найден paymentsTable');
            return;
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px;">
                    <div style="display: flex; flex-direction: column; align-items: center;">
                        <i class="fas fa-spinner fa-spin" style="font-size: 24px; margin-bottom: 10px;"></i>
                        <span>Загрузка данных...</span>
                    </div>
                </td>
            </tr>
        `;
        
        try {
            // Загружаем все данные если еще не загружены
            if (this.paymentsWithUserInfo.length === 0) {
                await this.loadAllData();
                return;
            }
            
            // Применяем фильтры
            this.applyFilters();
            
        } catch (error) {
            console.error('Ошибка загрузки платежей:', error);
            this.showError('Не удалось загрузить платежи: ' + error.message);
        }
    }

    applyFilters() {
        let filtered = [...this.paymentsWithUserInfo];
        
        console.log('🎛️ Применяем фильтры:', {
            search: this.currentSearch,
            filter: this.currentFilter,
            date: this.currentDate
        });
        
        // 1. Поиск по имени пользователя, email или ID
        if (this.currentSearch) {
            const searchLower = this.currentSearch.toLowerCase().trim();
            
            filtered = filtered.filter(payment => {
                const user = payment.user_info;
                
                // Поиск по имени пользователя
                if (user.name.toLowerCase().includes(searchLower)) return true;
                
                // Поиск по ID платежа
                if (payment.id && payment.id.toString().includes(searchLower)) return true;
                
                return false;
            });
            console.log(`🔍 После поиска "${this.currentSearch}": ${filtered.length} платежей`);
        }
        
        // 2. Фильтр по статусу
        if (this.currentFilter !== 'all') {
            filtered = filtered.filter(payment => payment.status === this.currentFilter);
            console.log(`✅ После фильтра по статусу "${this.currentFilter}": ${filtered.length} платежей`);
        }
        
        // 3. Фильтр по дате
        if (this.currentDate) {
            const selectedDate = new Date(this.currentDate);
            selectedDate.setHours(0, 0, 0, 0);
            
            filtered = filtered.filter(payment => {
                if (!payment.created_at) return false;
                
                try {
                    const paymentDate = new Date(payment.created_at);
                    paymentDate.setHours(0, 0, 0, 0);
                    return paymentDate.getTime() === selectedDate.getTime();
                } catch (e) {
                    return false;
                }
            });
            console.log(`📅 После фильтра по дате "${this.currentDate}": ${filtered.length} платежей`);
        }
        
        // Сортировка по дате (новые сверху)
        filtered.sort((a, b) => {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        });
        
        this.filteredPayments = filtered;
        console.log(`📊 Всего отфильтровано: ${filtered.length} платежей`);
        
        if (filtered.length === 0) {
            this.showNoPayments();
        } else {
            this.renderPaymentsTable(filtered);
        }
        
        this.updateInfo();
    }

    renderPaymentsTable(payments) {
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) return;
        
        let html = '';
        
        payments.forEach(payment => {
            const user = payment.user_info;
            
            // Статус
            let statusText = 'Неизвестно';
            let statusClass = 'status-inactive';
            
            if (payment.status === 'completed') {
                statusText = 'Успешно';
                statusClass = 'status-active';
            } else if (payment.status === 'pending') {
                statusText = 'В обработке';
                statusClass = 'status-warning';
            }
            
            // Дата
            let paymentDate = '-';
            if (payment.created_at) {
                try {
                    const date = new Date(payment.created_at);
                    paymentDate = date.toLocaleString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    paymentDate = payment.created_at;
                }
            }
            
            // Дополнительная информация о пользователе
            const userEmail = user.email ? `<br><small style="color: #666;">${user.email}</small>` : '';
            const userPhone = user.phone ? `<br><small style="color: #666;">📱 ${user.phone}</small>` : '';
            const userTariff = user.tariff ? `<br><small style="color: #888; font-size: 11px;">Тариф: ${user.tariff}</small>` : '';
            
            html += `
                <tr>
                    <td>${payment.id || '-'}</td>
                    <td>
                        <div style="font-weight: 500; margin-bottom: 4px;">${user.name}</div>
                        <div style="font-size: 12px; color: #666;">
                            <span>ID: ${payment.user_id}</span>
                        </div>
                    </td>
                    <td>
                        <span class="amount positive">
                            ${payment.amount || 0} ₽
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td>${paymentDate}</td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        console.log('✅ Таблица платежей отрендерена');
    }

    updateInfo() {
        // Удаляем старую информацию если есть
        const oldInfo = document.getElementById('paymentsInfo');
        if (oldInfo) {
            oldInfo.remove();
        }
        
        const tableContainer = document.querySelector('#payments .table-container');
        if (!tableContainer) return;
        
        let filterInfo = '';
        if (this.currentSearch || this.currentFilter !== 'all' || this.currentDate) {
            const filters = [];
            if (this.currentSearch) filters.push(`поиск: "${this.currentSearch}"`);
            if (this.currentFilter !== 'all') filters.push(`статус: ${this.currentFilter}`);
            if (this.currentDate) filters.push(`дата: ${this.currentDate}`);
            
            filterInfo = `(фильтры: ${filters.join(', ')})`;
        }
        
        const infoHTML = `
            <div class="payments-info" id="paymentsInfo" style="
                margin-top: 20px;
                padding: 12px 16px;
                background: #f8f9fa;
                border-radius: 8px;
                border: 1px solid #e9ecef;
                font-size: 14px;
                color: #666;
            ">
                <i class="fas fa-info-circle"></i>
                Показано: <strong>${this.filteredPayments.length}</strong> платежей 
                ${filterInfo}
            </div>
        `;
        
        tableContainer.insertAdjacentHTML('afterend', infoHTML);
    }

    showNoPayments() {
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) return;
        
        let message = 'Платежи не найдены';
        let hint = '';
        
        if (this.currentSearch || this.currentDate || this.currentFilter !== 'all') {
            message = 'Платежи не найдены по заданным критериям';
            hint = 'Попробуйте изменить параметры поиска';
            
            if (this.currentSearch) {
                hint = `По запросу "${this.currentSearch}" ничего не найдено`;
            }
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px;">
                    <i class="fas fa-credit-card" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #666;">${message}</h3>
                    <p style="color: #999;">${hint}</p>
                </td>
            </tr>
        `;
        
        // Обновляем информацию
        this.updateInfo();
    }

    showError(message) {
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Ошибка</h3>
                    <p>${message}</p>
                </td>
            </tr>
        `;
    }
}

// Глобальный экземпляр
window.paymentsUI = new PaymentsUI();

// Функция для загрузки вкладки платежей
window.loadPaymentsTab = async function() {
    console.log('📥 Загружаем вкладку платежей...');
    
    if (!window.paymentsUI) {
        console.error('❌ paymentsUI не инициализирован');
        return;
    }
    
    await paymentsUI.loadPayments();
    
    // Инициализируем обработчики только после загрузки данных
    initPaymentsTabHandlers();
};

// Инициализация обработчиков фильтров
function initPaymentsTabHandlers() {
    console.log('🔧 Инициализация обработчиков платежей...');
    
    // Удаляем старую кнопку очистки если есть
    const oldClearBtn = document.querySelector('#payments .clear-filters-btn');
    if (oldClearBtn) oldClearBtn.remove();
    
    const searchInput = document.getElementById('paymentSearch');
    const filterSelect = document.getElementById('paymentFilter');
    const dateInput = document.getElementById('paymentDate');
    
    // Обновляем placeholder для поиска
    if (searchInput) {
        searchInput.placeholder = 'Поиск по имени или ID...';
        searchInput.title = 'Ищите по: имени пользователя или ID платежа';
    }
    
    // Кнопка очистки
    const clearFiltersBtn = document.createElement('button');
    clearFiltersBtn.type = 'button';
    clearFiltersBtn.className = 'btn btn-outline clear-filters-btn';
    clearFiltersBtn.innerHTML = '<i class="fas fa-times"></i> Очистить';
    clearFiltersBtn.style.cssText = `
        margin-left: 10px;
        padding: 8px 16px;
        background: #6c757d;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    `;
    
    clearFiltersBtn.onclick = function() {
        console.log('🧹 Очищаем фильтры...');
        
        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.value = 'all';
        if (dateInput) dateInput.value = '';
        
        paymentsUI.currentSearch = '';
        paymentsUI.currentFilter = 'all';
        paymentsUI.currentDate = '';
        paymentsUI.applyFilters();
    };
    
    // Добавляем кнопку в фильтры
    const filtersDiv = document.querySelector('#payments .filters');
    if (filtersDiv) {
        filtersDiv.appendChild(clearFiltersBtn);
    }
    
    // Обработчики событий
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const searchText = this.value.trim();
            console.log('🔍 Поиск:', searchText);
            paymentsUI.currentSearch = searchText;
            paymentsUI.applyFilters();
        }, 500));
    }
    
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            console.log('🎛️ Фильтр по статусу:', this.value);
            paymentsUI.currentFilter = this.value;
            paymentsUI.applyFilters();
        });
    }
    
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            console.log('📅 Фильтр по дате:', this.value);
            paymentsUI.currentDate = this.value;
            paymentsUI.applyFilters();
        });
    }
    
    console.log('✅ Обработчики платежей инициализированы');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Добавляем стили
const style = document.createElement('style');
style.textContent = `
    .status-badge {
        padding: 4px 10px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
    }
    
    .status-active {
        background: #d4edda;
        color: #155724;
    }
    
    .status-warning {
        background: #fff3cd;
        color: #856404;
    }
    
    .status-inactive {
        background: #e9ecef;
        color: #495057;
    }
    
    .amount.positive {
        color: #28a745;
        font-weight: bold;
        font-size: 16px;
    }
    
    .btn-outline {
        background: #6c757d;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    
    .btn-outline:hover {
        background: #5a6268;
        transform: translateY(-1px);
    }
`;
document.head.appendChild(style);