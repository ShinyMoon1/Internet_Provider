// payments.js - С ПОЛУЧЕНИЕМ ИМЕН ПОЛЬЗОВАТЕЛЕЙ
class PaymentsAPI {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/v1/admin';
        this.allPayments = [];
        this.usersCache = new Map(); // Кэш пользователей
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
                throw new Error(`Ошибка: ${response.status} - ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Сохраняем все платежи для клиентской фильтрации
            if (data.payments && Array.isArray(data.payments)) {
                this.allPayments = data.payments;
                
                // Получаем информацию о пользователях
                await this.fetchUserNamesForPayments(this.allPayments);
            }
            
            return data;
            
        } catch (error) {
            console.error('Ошибка при загрузке платежей:', error);
            throw error;
        }
    }

    async fetchUserNamesForPayments(payments) {
        try {
            // Собираем уникальные ID пользователей
            const userIds = [...new Set(payments.map(p => p.user_id).filter(id => id))];
            
            if (userIds.length === 0) return;
            
            console.log(`👥 Загружаем имена для пользователей: ${userIds.join(', ')}`);
            
            // Получаем информацию о пользователях
            const token = window.authService.token;
            
            // Пробуем получить пользователей пачкой или по одному
            for (const userId of userIds) {
                if (!this.usersCache.has(userId)) {
                    try {
                        const user = await this.getUserById(userId, token);
                        if (user) {
                            this.usersCache.set(userId, {
                                id: userId,
                                name: user.name || user.username || `Пользователь #${userId}`,
                                email: user.email || '',
                                phone: user.phone || ''
                            });
                        }
                    } catch (error) {
                        console.warn(`⚠️ Не удалось получить пользователя ${userId}:`, error);
                        this.usersCache.set(userId, {
                            id: userId,
                            name: `Пользователь #${userId}`,
                            email: '',
                            phone: ''
                        });
                    }
                }
            }
            
            // Обновляем платежи с именами пользователей
            payments.forEach(payment => {
                if (payment.user_id && this.usersCache.has(payment.user_id)) {
                    const user = this.usersCache.get(payment.user_id);
                    payment.user_real_name = user.name;
                    payment.user_email = user.email;
                    payment.user_phone = user.phone;
                }
            });
            
        } catch (error) {
            console.error('Ошибка при загрузке имен пользователей:', error);
        }
    }

    async getUserById(userId, token) {
        try {
            // Пробуем endpoint для получения пользователя
            const response = await fetch(`${this.baseUrl}/users/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.user || data;
            }
            
            // Если нет отдельного endpoint, пробуем получить всех пользователей
            const allUsersResponse = await fetch(`${this.baseUrl}/users?limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (allUsersResponse.ok) {
                const data = await allUsersResponse.json();
                const users = data.users || data.user || [];
                const user = users.find(u => u.id == userId);
                return user;
            }
            
            return null;
            
        } catch (error) {
            console.error(`Ошибка при получении пользователя ${userId}:`, error);
            return null;
        }
    }

    async searchUsers(search) {
        try {
            if (!window.authService || !window.authService.token) {
                return [];
            }
            
            const token = window.authService.token;
            const response = await fetch(`${this.baseUrl}/users?search=${encodeURIComponent(search)}&limit=50`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.users || data.user || [];
            }
            
            return [];
            
        } catch (error) {
            console.error('Ошибка при поиске пользователей:', error);
            return [];
        }
    }
}

class PaymentsUI {
    constructor() {
        this.api = new PaymentsAPI();
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.limit = 20;
        this.currentFilter = 'all';
        this.currentSearch = '';
        this.currentDate = '';
        this.allPayments = [];
    }

    async loadAllPayments() {
        try {
            console.log('📥 Загружаем все платежи для фильтрации...');
            
            const params = {
                limit: 1000,
                page: 1
            };
            
            const data = await this.api.getPayments(params);
            this.allPayments = data.payments || [];
            console.log(`📊 Загружено платежей: ${this.allPayments.length}`);
            
            // Применяем текущие фильтры
            this.applyFilters();
            
        } catch (error) {
            console.error('Ошибка загрузки всех платежей:', error);
            this.showError('Не удалось загрузить платежи: ' + error.message);
        }
    }

    async searchUsers(search) {
        if (!search || search.length < 2) return [];
        
        try {
            console.log(`🔍 Поиск пользователей: "${search}"`);
            const users = await this.api.searchUsers(search);
            console.log(`✅ Найдено пользователей: ${users.length}`);
            return users;
        } catch (error) {
            console.error('Ошибка поиска пользователей:', error);
            return [];
        }
    }

    applyFilters() {
        console.log('🎛️ Применяем фильтры...');
        console.log('🔍 Поиск:', this.currentSearch);
        console.log('🎯 Фильтр:', this.currentFilter);
        console.log('📅 Дата:', this.currentDate);
        
        // Фильтруем платежи на клиенте
        let filteredPayments = [...this.allPayments];
        
        // 1. Фильтр по дате
        if (this.currentDate) {
            const selectedDate = new Date(this.currentDate);
            selectedDate.setHours(0, 0, 0, 0);
            
            filteredPayments = filteredPayments.filter(payment => {
                if (!payment.created_at) return false;
                
                try {
                    const paymentDate = new Date(payment.created_at);
                    paymentDate.setHours(0, 0, 0, 0);
                    
                    return paymentDate.getTime() === selectedDate.getTime();
                } catch (e) {
                    return false;
                }
            });
            
            console.log(`📅 После фильтра по дате: ${filteredPayments.length} платежей`);
        }
        
        // 2. Поиск
        if (this.currentSearch) {
            const searchLower = this.currentSearch.toLowerCase().trim();
            
            filteredPayments = filteredPayments.filter(payment => {
                // Поиск по ID платежа
                if (payment.id && payment.id.toString().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по ID пользователя
                if (payment.user_id && payment.user_id.toString().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по реальному имени пользователя
                if (payment.user_real_name && payment.user_real_name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по email пользователя
                if (payment.user_email && payment.user_email.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по телефону пользователя
                if (payment.user_phone && payment.user_phone.includes(searchLower)) {
                    return true;
                }
                
                // Поиск по старому имени (из API)
                if (payment.user_name && payment.user_name.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по сумме
                if (payment.amount && payment.amount.toString().includes(searchLower)) {
                    return true;
                }
                
                // Поиск по методу оплаты
                if (payment.payment_method && payment.payment_method.toLowerCase().includes(searchLower)) {
                    return true;
                }
                
                return false;
            });
            
            console.log(`🔍 После поиска: ${filteredPayments.length} платежей`);
        }
        
        // 3. Сортируем по дате (новые сверху)
        filteredPayments.sort((a, b) => {
            const dateA = new Date(a.created_at || 0);
            const dateB = new Date(b.created_at || 0);
            return dateB - dateA;
        });
        
        // Обновляем общее количество
        this.totalItems = filteredPayments.length;
        this.totalPages = Math.ceil(this.totalItems / this.limit);
        
        // Получаем платежи для текущей страницы
        const startIndex = (this.currentPage - 1) * this.limit;
        const endIndex = startIndex + this.limit;
        const pagePayments = filteredPayments.slice(startIndex, endIndex);
        
        console.log(`📊 Отображаем: ${pagePayments.length} платежей (страница ${this.currentPage}/${this.totalPages})`);
        
        // Рендерим таблицу
        if (pagePayments.length === 0) {
            this.showNoPayments();
        } else {
            this.renderPaymentsTable(pagePayments);
        }
        
        this.updatePagination();
    }

    async loadPayments(page = 1) {
        console.log(`🔄 Загружаем платежи, страница ${page}...`);
        
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) {
            console.error('❌ Не найден paymentsTable');
            return;
        }
        
        // Если это первая загрузка, загружаем все платежи
        if (this.allPayments.length === 0) {
            await this.loadAllPayments();
            return;
        }
        
        // Иначе применяем фильтры
        this.currentPage = page;
        this.applyFilters();
    }

    renderPaymentsTable(payments) {
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) return;
        
        console.log('🎨 Рендерим', payments.length, 'платежей');
        
        let html = '';
        
        payments.forEach(payment => {
            // Получаем имя пользователя
            const userName = payment.user_real_name || 
                           payment.user_name || 
                           `Пользователь #${payment.user_id}`;
            
            // Дополнительная информация о пользователе
            const userEmail = payment.user_email ? `<br><small style="color: #666;">${payment.user_email}</small>` : '';
            const userPhone = payment.user_phone ? `<br><small style="color: #666;">📱 ${payment.user_phone}</small>` : '';
            
            // Определяем статус
            let statusText = 'Неизвестно';
            let statusClass = 'status-inactive';
            
            if (payment.status === 'completed') {
                statusText = 'Успешно';
                statusClass = 'status-active';
            } else if (payment.status === 'pending') {
                statusText = 'В обработке';
                statusClass = 'status-warning';
            } else if (payment.status === 'failed' || payment.status === 'cancelled') {
                statusText = 'Ошибка';
                statusClass = 'status-danger';
            } else if (payment.status === 'refunded') {
                statusText = 'Возврат';
                statusClass = 'status-info';
            }
            
            // Форматируем дату
            let paymentDate = '-';
            let paymentTime = '';
            if (payment.created_at) {
                try {
                    const date = new Date(payment.created_at);
                    paymentDate = date.toLocaleDateString('ru-RU', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric'
                    });
                    paymentTime = date.toLocaleTimeString('ru-RU', {
                        hour: '2-digit',
                        minute: '2-digit'
                    });
                } catch (e) {
                    paymentDate = payment.created_at;
                }
            }
            
            // Форматируем сумму
            const amount = payment.amount || 0;
            const formattedAmount = `${amount} ₽`;
            
            html += `
                <tr>
                    <td>${payment.id || '-'}</td>
                    <td>
                        <div style="font-weight: 500;">${userName}</div>
                        <small style="color: #666; font-size: 11px;">ID: ${payment.user_id}</small>
                        ${userEmail}
                        ${userPhone}
                    </td>
                    <td>
                        <span class="amount positive">
                            ${formattedAmount}
                        </span>
                    </td>
                    <td>
                        <span class="status-badge ${statusClass}">
                            ${statusText}
                        </span>
                    </td>
                    <td>
                        <div>${paymentDate}</div>
                        <small style="color: #666;">${paymentTime}</small>
                    </td>
                </tr>
            `;
        });
        
        tableBody.innerHTML = html;
        console.log('✅ Таблица платежей отрендерена');
    }

    updatePagination() {
        let paginationContainer = document.getElementById('paymentsPagination');
        
        if (!paginationContainer) {
            const tableContainer = document.querySelector('#payments .table-container');
            if (tableContainer) {
                const paginationHTML = `
                    <div class="pagination" id="paymentsPagination">
                        <div class="pagination-info">
                            Показано: <span id="paymentsStart">0</span>-<span id="paymentsEnd">0</span> из <span id="paymentsTotal">${this.totalItems}</span>
                        </div>
                        <div class="pagination-controls">
                            <button class="pagination-btn" id="paymentsFirst" ${this.currentPage <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-angle-double-left"></i>
                            </button>
                            <button class="pagination-btn" id="paymentsPrev" ${this.currentPage <= 1 ? 'disabled' : ''}>
                                <i class="fas fa-angle-left"></i>
                            </button>
                            <span class="pagination-current">
                                ${this.currentPage} / ${this.totalPages}
                            </span>
                            <button class="pagination-btn" id="paymentsNext" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
                                <i class="fas fa-angle-right"></i>
                            </button>
                            <button class="pagination-btn" id="paymentsLast" ${this.currentPage >= this.totalPages ? 'disabled' : ''}>
                                <i class="fas fa-angle-double-right"></i>
                            </button>
                        </div>
                    </div>
                `;
                
                tableContainer.insertAdjacentHTML('afterend', paginationHTML);
                paginationContainer = document.getElementById('paymentsPagination');
            }
        }
        
        if (paginationContainer) {
            const start = Math.min((this.currentPage - 1) * this.limit + 1, this.totalItems);
            const end = Math.min(this.currentPage * this.limit, this.totalItems);
            
            document.getElementById('paymentsStart').textContent = start;
            document.getElementById('paymentsEnd').textContent = end;
            document.getElementById('paymentsTotal').textContent = this.totalItems;
            
            document.getElementById('paymentsFirst').disabled = this.currentPage <= 1;
            document.getElementById('paymentsPrev').disabled = this.currentPage <= 1;
            document.getElementById('paymentsNext').disabled = this.currentPage >= this.totalPages;
            document.getElementById('paymentsLast').disabled = this.currentPage >= this.totalPages;
            
            const currentPageSpan = paginationContainer.querySelector('.pagination-current');
            if (currentPageSpan) {
                currentPageSpan.textContent = `${this.currentPage} / ${this.totalPages}`;
            }
            
            this.setupPaginationEvents();
        }
    }

    setupPaginationEvents() {
        document.getElementById('paymentsFirst')?.addEventListener('click', () => this.goToPage(1));
        document.getElementById('paymentsPrev')?.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        document.getElementById('paymentsNext')?.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        document.getElementById('paymentsLast')?.addEventListener('click', () => this.goToPage(this.totalPages));
    }

    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;
        
        this.currentPage = page;
        this.loadPayments(page);
    }

    showNoPayments() {
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) return;
        
        let message = 'Платежи не найдены';
        let submessage = '';
        
        if (this.currentSearch || this.currentDate || this.currentFilter !== 'all') {
            message = 'Платежи не найдены по заданным критериям';
            submessage = 'Попробуйте изменить параметры поиска';
        }
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px;">
                    <i class="fas fa-credit-card" style="font-size: 48px; color: #ccc; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0; color: #666;">${message}</h3>
                    <p style="color: #999;">${submessage}</p>
                </td>
            </tr>
        `;
    }

    showError(message) {
        const tableBody = document.getElementById('paymentsTable');
        if (!tableBody) return;
        
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 40px; color: #dc3545;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; margin-bottom: 15px;"></i>
                    <h3 style="margin: 0 0 10px 0;">Ошибка загрузки</h3>
                    <p>${message}</p>
                    <button onclick="paymentsUI.loadAllPayments()" style="margin-top: 15px; padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                        Попробовать снова
                    </button>
                </td>
            </tr>
        `;
    }
}

// Глобальный экземпляр
window.paymentsUI = new PaymentsUI();

window.loadPaymentsTab = async function() {
    if (!window.paymentsUI) return;
    
    await paymentsUI.loadPayments();
};

window.initPaymentsTab = function() {
    console.log('🔧 Инициализация вкладки платежей...');
    
    const searchInput = document.getElementById('paymentSearch');
    const filterSelect = document.getElementById('paymentFilter');
    const dateInput = document.getElementById('paymentDate');
    
    // Обновляем placeholder для поиска
    if (searchInput) {
        searchInput.placeholder = 'Поиск по имени, email, телефону или ID...';
    }
    
    // Добавляем подсказку при фокусе
    if (searchInput) {
        searchInput.addEventListener('focus', function() {
            this.title = 'Ищите по: имени, email, телефону, ID пользователя, ID платежа, сумме';
        });
    }
    
    // Очистка фильтров
    const clearFiltersBtn = document.createElement('button');
    clearFiltersBtn.className = 'btn btn-outline';
    clearFiltersBtn.innerHTML = '<i class="fas fa-times"></i> Очистить';
    clearFiltersBtn.style.marginLeft = '10px';
    clearFiltersBtn.onclick = function() {
        if (searchInput) searchInput.value = '';
        if (filterSelect) filterSelect.value = 'all';
        if (dateInput) dateInput.value = '';
        
        paymentsUI.currentSearch = '';
        paymentsUI.currentFilter = 'all';
        paymentsUI.currentDate = '';
        paymentsUI.currentPage = 1;
        paymentsUI.applyFilters();
    };
    
    const filtersDiv = document.querySelector('#payments .filters');
    if (filtersDiv) {
        filtersDiv.appendChild(clearFiltersBtn);
    }
    
    // Поиск
    if (searchInput) {
        searchInput.addEventListener('input', debounce(function() {
            const searchText = this.value.trim();
            console.log('🔍 Поиск платежей:', searchText);
            
            paymentsUI.currentSearch = searchText;
            paymentsUI.currentPage = 1;
            paymentsUI.applyFilters();
            
            // Показываем подсказку если набрали мало символов
            if (searchText.length === 1) {
                console.log('💡 Введите 2 или более символов для поиска по имени');
            }
        }, 500));
    }
    
    // Фильтр по типу
    if (filterSelect) {
        filterSelect.addEventListener('change', function() {
            console.log('🎛️ Фильтр платежей:', this.value);
            paymentsUI.currentFilter = this.value;
            paymentsUI.currentPage = 1;
            paymentsUI.applyFilters();
        });
    }
    
    // Фильтр по дате
    if (dateInput) {
        dateInput.addEventListener('change', function() {
            console.log('📅 Фильтр по дате:', this.value);
            paymentsUI.currentDate = this.value;
            paymentsUI.currentPage = 1;
            paymentsUI.applyFilters();
        });
    }
    
    console.log('✅ Вкладка платежей инициализирована');
};

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}