// reports.js - Формирование отчетов в Excel (исправленная версия)
class ReportGenerator {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/v1/admin';
        this.isGenerating = false;
        this.currentChunk = 1;
        this.totalChunks = 1;
        this.reportData = [];
        this.reportConfig = {};
        this.tariffMap = null;
    }

    // Методы класса должны быть определены так
    async generateExcelReport(config) {
        try {
            if (this.isGenerating) {
                alert('Отчет уже формируется, пожалуйста подождите');
                return;
            }

            this.isGenerating = true;
            this.reportConfig = config;
            this.currentChunk = 1;
            
            this.showProgress('Подготовка данных...', 0);
            
            switch(config.type) {
                case 'payments':
                    await this.generatePaymentsReport(config);
                    break;
                case 'users':
                    await this.generateUsersReport(config);
                    break;
                case 'combined':
                    await this.generateCombinedReport(config);
                    break;
                default:
                    throw new Error('Неизвестный тип отчета');
            }
            
        } catch (error) {
            console.error('Ошибка формирования отчета:', error);
            this.hideProgress();
            alert('Ошибка при формировании отчета: ' + error.message);
        } finally {
            this.isGenerating = false;
        }
    }

    async generatePaymentsReport(config) {
        await this.loadPaymentsData(config);
        
        if (this.reportData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета за выбранный период');
            return;
        }
        
        const chunkSize = config.chunkSize === 'all' ? this.reportData.length : parseInt(config.chunkSize);
        this.totalChunks = Math.ceil(this.reportData.length / chunkSize);
        
        for (let i = 0; i < this.totalChunks; i++) {
            this.currentChunk = i + 1;
            const startIdx = i * chunkSize;
            const endIdx = Math.min(startIdx + chunkSize, this.reportData.length);
            const chunkData = this.reportData.slice(startIdx, endIdx);
            
            const progress = Math.round(((i + 1) / this.totalChunks) * 100);
            this.showProgress(`Формирование платежей ${this.currentChunk}/${this.totalChunks}`, progress);
            
            await this.createPaymentsExcelFile(chunkData, this.currentChunk);
            
            if (i < this.totalChunks - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        this.hideProgress();
        alert(`Отчет по платежам сформирован! Файлов: ${this.totalChunks}`);
    }

    async generateUsersReport(config) {
        await this.loadUsersData(config);
        
        if (this.reportData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета по пользователям');
            return;
        }
        
        const chunkSize = config.chunkSize === 'all' ? this.reportData.length : parseInt(config.chunkSize);
        this.totalChunks = Math.ceil(this.reportData.length / chunkSize);
        
        for (let i = 0; i < this.totalChunks; i++) {
            this.currentChunk = i + 1;
            const startIdx = i * chunkSize;
            const endIdx = Math.min(startIdx + chunkSize, this.reportData.length);
            const chunkData = this.reportData.slice(startIdx, endIdx);
            
            const progress = Math.round(((i + 1) / this.totalChunks) * 100);
            this.showProgress(`Формирование пользователей ${this.currentChunk}/${this.totalChunks}`, progress);
            
            await this.createUsersExcelFile(chunkData, this.currentChunk);
            
            if (i < this.totalChunks - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }
        
        this.hideProgress();
        alert(`Отчет по пользователям сформирован! Файлов: ${this.totalChunks}`);
    }

    async generateCombinedReport(config) {
        this.showProgress('Загрузка данных...', 25);
        
        const promises = [];
        let paymentsData = [];
        let usersData = [];
        
        if (config.includePayments) {
            promises.push(this.loadPaymentsData(config).then(data => paymentsData = data));
        }
        
        if (config.includeUsers) {
            promises.push(this.loadUsersData(config).then(data => usersData = data));
        }
        
        await Promise.all(promises);
        
        this.showProgress('Формирование отчета...', 75);
        
        if (paymentsData.length === 0 && usersData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования комбинированного отчета');
            return;
        }
        
        await this.createCombinedExcelFile(paymentsData, usersData, config);
        
        this.hideProgress();
        alert('Комбинированный отчет успешно сформирован!');
    }

    async loadPaymentsData(config) {
        if (!window.authService || !window.authService.token) {
            throw new Error('Не авторизован');
        }
        
        const token = window.authService.token;
        const allPayments = [];
        
        console.log('📤 Загрузка платежей для отчета...', config);
        
        try {
            // Загружаем ВСЕ платежи сначала
            let page = 1;
            const limit = 100;
            let hasMore = true;
            let allRawPayments = [];
            
            while (hasMore) {
                const params = new URLSearchParams({
                    page: page,
                    limit: limit
                });
                
                console.log(`📄 Загрузка страницы ${page} всех платежей...`);
                
                const response = await fetch(`${this.baseUrl}/payments?${params.toString()}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Ошибка сервера: ${response.status}`);
                }
                
                const data = await response.json();
                const payments = data.payments || [];
                
                if (payments.length === 0) {
                    hasMore = false;
                } else {
                    allRawPayments.push(...payments);
                    console.log(`✅ Загружено платежей: ${allRawPayments.length}`);
                    
                    const progress = Math.min(50, Math.round((page * 100) / 50));
                    this.showProgress(`Загрузка всех платежей... (${allRawPayments.length})`, progress);
                    
                    page++;
                }
            }
            
            console.log(`📊 Всего загружено платежей: ${allRawPayments.length}`);
            
            // Фильтруем платежи по дате локально
            let filteredPayments = allRawPayments;
            
            if (config.dateStart && config.dateEnd) {
                const startDate = new Date(config.dateStart);
                const endDate = new Date(config.dateEnd);
                endDate.setHours(23, 59, 59, 999);
                
                console.log(`📅 Фильтрация по дате: ${config.dateStart} - ${config.dateEnd}`);
                
                filteredPayments = allRawPayments.filter(payment => {
                    if (!payment.created_at) return false;
                    
                    try {
                        const paymentDate = new Date(payment.created_at);
                        return paymentDate >= startDate && paymentDate <= endDate;
                    } catch (error) {
                        console.error('Ошибка парсинга даты платежа:', payment.created_at);
                        return false;
                    }
                });
                
                console.log(`✅ После фильтра по дате: ${filteredPayments.length} платежей`);
            }
            
            if (config.status && config.status !== 'all') {
                filteredPayments = filteredPayments.filter(payment => 
                    payment.status === config.status
                );
                
                console.log(`✅ После фильтра по статусу ${config.status}: ${filteredPayments.length} платежей`);
            }
            
            if (config.chunkSize !== 'all') {
                const limit = parseInt(config.chunkSize);
                if (filteredPayments.length > limit) {
                    filteredPayments = filteredPayments.slice(0, limit);
                    console.log(`✂️ Ограничение до ${limit} записей: ${filteredPayments.length}`);
                }
            }
            
            allPayments.push(...filteredPayments);
            
        } catch (error) {
            console.error('Ошибка загрузки платежей:', error);
            throw error;
        }
        
        console.log('👥 Загрузка данных пользователей...');
        try {
            const usersMap = await this.loadUsersDetailsForPayments(token, allPayments);
            
            this.reportData = allPayments.map(payment => {
                const user = usersMap[payment.user_id];
                
                return {
                    id: payment.id || '-',
                    payment_date: payment.created_at ? 
                        new Date(payment.created_at).toLocaleString('ru-RU') : '',
                    user_id: payment.user_id || '-',
                    user_name: user ? user.name : `Пользователь #${payment.user_id}`,
                    user_email: user ? user.email : '',
                    user_phone: user ? user.phone : '',
                    amount: parseFloat(payment.amount) || 0,
                    status: this.getStatusText(payment.status),
                    description: payment.description || ''
                };
            });
            
            console.log(`📊 Сформировано записей для отчета: ${this.reportData.length}`);
            
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            throw error;
        }
        
        return this.reportData;
    }

    async loadUsersDetailsForPayments(token, payments) {
        const userIds = [...new Set(payments.map(p => p.user_id).filter(id => id))];
        console.log(`👥 Загрузка данных для ${userIds.length} пользователей...`);
        
        const usersMap = {};
        const totalUsers = userIds.length;
        
        for (let i = 0; i < userIds.length; i++) {
            const userId = userIds[i];
            
            try {
                const userDetails = await this.getUserDetails(userId, token);
                if (userDetails) {
                    usersMap[userId] = {
                        name: userDetails.name || `Пользователь #${userId}`,
                        email: userDetails.email || '',
                        phone: userDetails.phone || userDetails.phone_number || '',
                        tariff: userDetails.tariff_name || `Тариф #${userDetails.tariff_id}` || 'Без тарифа'
                    };
                }
                
                const progress = 50 + Math.round(((i + 1) / totalUsers) * 25);
                this.showProgress(`Загрузка данных пользователей... (${i + 1}/${totalUsers})`, progress);
                
            } catch (error) {
                console.warn(`⚠️ Не удалось загрузить данные пользователя ${userId}:`, error.message);
                usersMap[userId] = {
                    name: `Пользователь #${userId}`,
                    email: '',
                    phone: '',
                    tariff: 'Неизвестно'
                };
            }
        }
        
        return usersMap;
    }

    async loadUsersData(config) {
        if (!window.authService || !window.authService.token) {
            throw new Error('Не авторизован');
        }
        
        const token = window.authService.token;
        const allUsers = [];
        
        console.log('👤 Загрузка пользователей для отчета...', config);
        
        try {
            // Загружаем ВСЕХ пользователей сначала
            let page = 1;
            const limit = 100;
            let hasMore = true;
            let allRawUsers = [];
            
            while (hasMore) {
                const params = new URLSearchParams({
                    page: page,
                    limit: limit
                });
                
                console.log(`📄 Загрузка страницы ${page} всех пользователей...`);
                
                const response = await fetch(`${this.baseUrl}/users?${params.toString()}`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Ошибка сервера: ${response.status}`);
                }
                
                const data = await response.json();
                const users = data.user || data.users || [];
                
                if (users.length === 0) {
                    hasMore = false;
                } else {
                    allRawUsers.push(...users);
                    console.log(`✅ Загружено пользователей: ${allRawUsers.length}`);
                    
                    const progress = Math.min(50, Math.round((page * 100) / 50));
                    this.showProgress(`Загрузка всех пользователей... (${allRawUsers.length})`, progress);
                    
                    page++;
                }
            }
            
            console.log(`👥 Всего загружено пользователей: ${allRawUsers.length}`);
            
            // Фильтрация по дате регистрации
            let filteredUsers = allRawUsers;
            
            if (config.dateStart && config.dateEnd) {
                const startDate = new Date(config.dateStart);
                const endDate = new Date(config.dateEnd);
                endDate.setHours(23, 59, 59, 999);
                
                console.log(`📅 Фильтрация пользователей по дате: ${config.dateStart} - ${config.dateEnd}`);
                
                filteredUsers = allRawUsers.filter(user => {
                    if (!user.created_at) return false;
                    
                    try {
                        const regDate = new Date(user.created_at);
                        return regDate >= startDate && regDate <= endDate;
                    } catch (error) {
                        console.error('Ошибка парсинга даты регистрации:', user.created_at);
                        return false;
                    }
                });
                
                console.log(`✅ После фильтра по дате: ${filteredUsers.length} пользователей`);
            }
            
            // Ограничение по количеству
            if (config.chunkSize !== 'all') {
                const limit = parseInt(config.chunkSize);
                if (filteredUsers.length > limit) {
                    filteredUsers = filteredUsers.slice(0, limit);
                    console.log(`✂️ Ограничение до ${limit} записей: ${filteredUsers.length}`);
                }
            }
            
            // Загружаем детальные данные
            console.log('🔍 Загрузка детальных данных пользователей...');
            this.showProgress('Загрузка данных тарифов...', 75);
            
            const usersWithDetails = [];
            const totalUsers = filteredUsers.length;
            
            for (let i = 0; i < filteredUsers.length; i++) {
                const user = filteredUsers[i];
                
                // ЗДЕСЬ ИСПРАВЛЕНИЕ: используем правильный URL
                const userDetails = await this.getUserDetails(user.id, token);
                
                if (userDetails) {
                    const combinedUser = {
                        ...user,
                        ...userDetails,
                        name: userDetails.name || user.name || user.username,
                        email: userDetails.email || user.email,
                        phone: userDetails.phone || user.phone,
                        balance: userDetails.balance || user.balance
                    };
                    
                    usersWithDetails.push(combinedUser);
                } else {
                    usersWithDetails.push(user);
                }
                
                const progress = 75 + Math.round(((i + 1) / totalUsers) * 25);
                this.showProgress(`Загрузка данных пользователей... (${i + 1}/${totalUsers})`, progress);
            }
            
            console.log(`✅ Загружено детальных данных: ${usersWithDetails.length} пользователей`);
            
            // Фильтрация по тарифу
            let finalUsers = usersWithDetails;
            
            if (config.tariffFilter && config.tariffFilter !== 'all') {
                console.log('🔍 Применяем фильтр по тарифу:', config.tariffFilter);
                
                if (config.tariffFilter === 'with_tariff') {
                    finalUsers = usersWithDetails.filter(user => 
                        user.tariff_id || user.tariff_name
                    );
                    console.log(`✅ Пользователей с тарифом: ${finalUsers.length}`);
                } else if (config.tariffFilter === 'without_tariff') {
                    finalUsers = usersWithDetails.filter(user => 
                        !user.tariff_id && !user.tariff_name
                    );
                    console.log(`✅ Пользователей без тарифа: ${finalUsers.length}`);
                }
            }
            
            allUsers.push(...finalUsers);
            
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            throw error;
        }
        
        // Формируем финальные данные
        this.reportData = allUsers.map(user => {
            const tariffInfo = this.getUserTariffInfo(user);
            
            return {
                id: user.id || '-',
                name: user.name || user.username || `Пользователь #${user.id}`,
                email: user.email || '',
                phone: user.phone || user.phone_number || '',
                balance: parseFloat(user.balance) || 0,
                tariff: tariffInfo.tariffName,
                tariff_status: tariffInfo.tariffStatus,
                registration_date: user.created_at ? 
                    new Date(user.created_at).toLocaleDateString('ru-RU') : ''
            };
        });
        
        console.log(`👥 Сформировано записей пользователей для отчета: ${this.reportData.length}`);
        
        return this.reportData;
    }

    async getUserDetails(userId, token) {
        try {
            // ИСПРАВЛЕНИЕ: используем правильный URL без /admin
            const response = await fetch(`http://localhost:8080/api/v1/auth/${userId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                console.warn(`⚠️ Не удалось загрузить данные пользователя ${userId}: ${response.status}`);
                return null;
            }
            
            const data = await response.json();
            return data.user || data;
            
        } catch (error) {
            console.warn(`⚠️ Ошибка загрузки пользователя ${userId}:`, error.message);
            return null;
        }
    }

    async loadTariffsMap(token) {
        try {
            const response = await fetch(`${this.baseUrl}/tariffs?limit=100`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                const tariffs = data.tariffs || data.data || [];
                
                const tariffMap = {};
                tariffs.forEach(tariff => {
                    if (tariff.id && tariff.name) {
                        tariffMap[tariff.id] = tariff.name;
                    }
                });
                
                console.log('✅ Загружен словарь тарифов:', tariffMap);
                return tariffMap;
            }
        } catch (error) {
            console.warn('⚠️ Не удалось загрузить тарифы:', error.message);
        }
        
        return null;
    }

    getTariffNameById(tariffId) {
        if (this.tariffMap && this.tariffMap[tariffId]) {
            return this.tariffMap[tariffId];
        }
        
        const defaultTariffMap = {
            1: 'Базовый',
            2: 'Стандартный', 
            3: 'Премиум',
            4: 'Бизнес',
            5: 'Безлимитный',
            6: 'Эконом',
            7: 'Оптимальный',
            8: 'Максимальный'
        };
        
        return defaultTariffMap[tariffId] || `Тариф #${tariffId}`;
    }

    // ВАЖНО: этот метод должен быть внутри класса
    getUserTariffInfo(user) {
        let tariffName = 'Без тарифа';
        let tariffStatus = 'Неактивен';
        
        if (!user) {
            return { tariffName, tariffStatus };
        }
        
        // Проверяем наличие tariff_id
        if (user.tariff_id) {
            tariffStatus = 'Активен';
            
            if (user.tariff_name) {
                tariffName = user.tariff_name;
            } else {
                tariffName = this.getTariffNameById(user.tariff_id);
            }
            
            if (user.accountn && user.balance > 0) {
                tariffStatus = 'Активен';
            }
        }
        else if (user.tariff_name) {
            tariffName = user.tariff_name;
            tariffStatus = 'Активен';
        }
        else if (user.accountn && user.balance > 100) {
            tariffName = 'Тариф (не указан)';
            tariffStatus = 'Активен';
        }
        
        console.log(`✅ Пользователь ${user.id}: Тариф "${tariffName}", Статус: "${tariffStatus}"`);
        
        return { tariffName, tariffStatus };
    }

    async createPaymentsExcelFile(data, chunkNumber) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Платежи');
        
        worksheet.columns = [
            { header: 'ID платежа', key: 'id', width: 15 },
            { header: 'Дата и время', key: 'payment_date', width: 20 },
            { header: 'ID пользователя', key: 'user_id', width: 15 },
            { header: 'Имя пользователя', key: 'user_name', width: 25 },
            { header: 'Email', key: 'user_email', width: 25 },
            { header: 'Телефон', key: 'user_phone', width: 20 },
            { header: 'Сумма (₽)', key: 'amount', width: 15 },
            { header: 'Статус', key: 'status', width: 15 },
            { header: 'Описание', key: 'description', width: 30 }
        ];
        
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F81BD' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        data.forEach(item => {
            worksheet.addRow(item);
        });
        
        worksheet.getColumn('amount').numFmt = '#,##0.00 ₽';
        worksheet.getColumn('amount').alignment = { horizontal: 'right' };
        
        if (data.length > 0) {
            const totalRow = worksheet.addRow({});
            totalRow.getCell('user_name').value = 'ИТОГО:';
            totalRow.getCell('user_name').font = { bold: true };
            
            const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            totalRow.getCell('amount').value = totalAmount;
            totalRow.getCell('amount').numFmt = '#,##0.00 ₽';
            totalRow.getCell('amount').font = { bold: true };
        }
        
        worksheet.addRow({});
        const titleRow = worksheet.addRow({});
        titleRow.getCell('user_name').value = 'ОТЧЕТ ПО ПЛАТЕЖАМ';
        titleRow.getCell('user_name').font = { bold: true, size: 14 };
        titleRow.getCell('status').value = new Date().toLocaleDateString('ru-RU');
        
        worksheet.addRow({});
        const infoRow = worksheet.addRow({});
        infoRow.getCell('user_name').value = 'Сформировано:';
        infoRow.getCell('status').value = new Date().toLocaleString('ru-RU');
        
        if (this.reportConfig.dateStart && this.reportConfig.dateEnd) {
            worksheet.addRow({});
            const periodRow = worksheet.addRow({});
            periodRow.getCell('user_name').value = 'Период отчета:';
            periodRow.getCell('status').value = 
                `${this.reportConfig.dateStart} — ${this.reportConfig.dateEnd}`;
            
            worksheet.addRow({});
            const daysRow = worksheet.addRow({});
            const startDate = new Date(this.reportConfig.dateStart);
            const endDate = new Date(this.reportConfig.dateEnd);
            const diffTime = Math.abs(endDate - startDate);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            daysRow.getCell('user_name').value = 'Дней в периоде:';
            daysRow.getCell('status').value = diffDays;
        }
        
        if (this.reportConfig.status && this.reportConfig.status !== 'all') {
            worksheet.addRow({});
            const statusRow = worksheet.addRow({});
            statusRow.getCell('user_name').value = 'Фильтр по статусу:';
            statusRow.getCell('status').value = this.getStatusText(this.reportConfig.status);
        }
        
        await this.saveWorkbook(workbook, 'payments', chunkNumber);
    }

    async createUsersExcelFile(data, chunkNumber) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Пользователи');
        
        worksheet.columns = [
            { header: 'ID', key: 'id', width: 10 },
            { header: 'Имя', key: 'name', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Телефон', key: 'phone', width: 20 },
            { header: 'Баланс (₽)', key: 'balance', width: 15 },
            { header: 'Тариф', key: 'tariff', width: 20 },
            { header: 'Статус тарифа', key: 'tariff_status', width: 15 },
            { header: 'Дата регистрации', key: 'registration_date', width: 15 }
        ];
        
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2196F3' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        data.forEach(user => {
            console.log(`📝 Запись в отчет: Пользователь ${user.id} - Тариф: "${user.tariff}", Статус: "${user.tariff_status}"`);
            worksheet.addRow({
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                balance: user.balance,
                tariff: user.tariff,
                tariff_status: user.tariff_status,
                registration_date: user.registration_date
            });
        });
        
        worksheet.getColumn('balance').numFmt = '#,##0.00 ₽';
        worksheet.getColumn('balance').alignment = { horizontal: 'right' };
        
        const totalUsers = data.length;
        const totalBalance = data.reduce((sum, user) => sum + (parseFloat(user.balance) || 0), 0);
        const activeTariffs = data.filter(user => user.tariff_status === 'Активен').length;
        const inactiveTariffs = data.filter(user => user.tariff_status === 'Неактивен').length;
        
        console.log(`📊 Статистика отчета: Всего: ${totalUsers}, Активных: ${activeTariffs}, Неактивных: ${inactiveTariffs}`);
        
        worksheet.addRow({});
        const titleRow = worksheet.addRow({});
        titleRow.getCell('name').value = 'ОТЧЕТ ПО ПОЛЬЗОВАТЕЛЯМ';
        titleRow.getCell('name').font = { bold: true, size: 14 };
        titleRow.getCell('registration_date').value = new Date().toLocaleDateString('ru-RU');
        
        worksheet.addRow({});
        const infoRow = worksheet.addRow({});
        infoRow.getCell('name').value = 'Сформировано:';
        infoRow.getCell('registration_date').value = new Date().toLocaleString('ru-RU');
        
        if (this.reportConfig.dateStart && this.reportConfig.dateEnd) {
            worksheet.addRow({});
            const periodRow = worksheet.addRow({});
            periodRow.getCell('name').value = 'Период регистрации:';
            periodRow.getCell('registration_date').value = 
                `${this.reportConfig.dateStart} — ${this.reportConfig.dateEnd}`;
        }
        
        if (this.reportConfig.tariffFilter && this.reportConfig.tariffFilter !== 'all') {
            worksheet.addRow({});
            const filterRow = worksheet.addRow({});
            filterRow.getCell('name').value = 'Фильтр по тарифу:';
            filterRow.getCell('registration_date').value = 
                this.reportConfig.tariffFilter === 'with_tariff' ? 'С тарифом' : 'Без тарифа';
        }
        
        worksheet.addRow({});
        const statsTitleRow = worksheet.addRow({});
        statsTitleRow.getCell('name').value = 'ДЕТАЛЬНАЯ СТАТИСТИКА:';
        statsTitleRow.getCell('name').font = { bold: true, size: 12 };
        
        worksheet.addRow({});
        const totalUsersRow = worksheet.addRow({});
        totalUsersRow.getCell('name').value = 'Всего пользователей:';
        totalUsersRow.getCell('balance').value = totalUsers;
        totalUsersRow.getCell('balance').font = { bold: true };
        
        const totalBalanceRow = worksheet.addRow({});
        totalBalanceRow.getCell('name').value = 'Общий баланс:';
        totalBalanceRow.getCell('balance').value = totalBalance;
        totalBalanceRow.getCell('balance').numFmt = '#,##0.00 ₽';
        totalBalanceRow.getCell('balance').font = { bold: true };
        
        const avgBalanceRow = worksheet.addRow({});
        avgBalanceRow.getCell('name').value = 'Средний баланс:';
        avgBalanceRow.getCell('balance').value = totalUsers > 0 ? (totalBalance / totalUsers).toFixed(2) : 0;
        avgBalanceRow.getCell('balance').numFmt = '#,##0.00 ₽';
        avgBalanceRow.getCell('balance').font = { bold: true };
        
        await this.saveWorkbook(workbook, 'users', chunkNumber);
    }

    async createCombinedExcelFile(paymentsData, usersData, config) {
        const workbook = new ExcelJS.Workbook();
        
        if (config.includePayments && paymentsData.length > 0) {
            const paymentsSheet = workbook.addWorksheet('Платежи');
            paymentsSheet.columns = [
                { header: 'ID платежа', key: 'id', width: 15 },
                { header: 'Дата', key: 'payment_date', width: 20 },
                { header: 'Пользователь', key: 'user_name', width: 25 },
                { header: 'Сумма (₽)', key: 'amount', width: 15 },
                { header: 'Статус', key: 'status', width: 15 }
            ];
            
            const paymentsHeader = paymentsSheet.getRow(1);
            paymentsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            paymentsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4CAF50' } };
            paymentsHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            
            paymentsData.forEach(item => {
                paymentsSheet.addRow({
                    id: item.id,
                    payment_date: item.payment_date,
                    user_name: item.user_name,
                    amount: item.amount,
                    status: item.status
                });
            });
            
            paymentsSheet.getColumn('amount').numFmt = '#,##0.00 ₽';
            
            if (paymentsData.length > 0) {
                const totalAmount = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
                paymentsSheet.addRow({});
                const totalRow = paymentsSheet.addRow({});
                totalRow.getCell('user_name').value = 'ИТОГО:';
                totalRow.getCell('user_name').font = { bold: true };
                totalRow.getCell('amount').value = totalAmount;
                totalRow.getCell('amount').numFmt = '#,##0.00 ₽';
                totalRow.getCell('amount').font = { bold: true };
            }
        }
        
        if (config.includeUsers && usersData.length > 0) {
            const usersSheet = workbook.addWorksheet('Пользователи');
            usersSheet.columns = [
                { header: 'ID', key: 'id', width: 10 },
                { header: 'Имя', key: 'name', width: 25 },
                { header: 'Email', key: 'email', width: 30 },
                { header: 'Телефон', key: 'phone', width: 20 },
                { header: 'Баланс (₽)', key: 'balance', width: 15 },
                { header: 'Тариф', key: 'tariff', width: 20 },
                { header: 'Статус', key: 'tariff_status', width: 15 }
            ];
            
            const usersHeader = usersSheet.getRow(1);
            usersHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            usersHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2196F3' } };
            usersHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            
            usersData.forEach(user => {
                usersSheet.addRow({
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    phone: user.phone,
                    balance: user.balance,
                    tariff: user.tariff,
                    tariff_status: user.tariff_status
                });
            });
            
            usersSheet.getColumn('balance').numFmt = '#,##0.00 ₽';
        }
        
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `combined_report_${dateStr}.xlsx`;
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    async saveWorkbook(workbook, type, chunkNumber) {
        const dateStr = new Date().toISOString().split('T')[0];
        const chunkSuffix = this.totalChunks > 1 ? `_часть${chunkNumber}` : '';
        const filename = `${type}_report_${dateStr}${chunkSuffix}.xlsx`;
        
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    }

    // Этот метод тоже должен быть внутри класса
    getStatusText(status) {
        const statusMap = {
            'completed': 'Успешно',
            'pending': 'В обработке',
            'failed': 'Ошибка',
            'cancelled': 'Отменен'
        };
        return statusMap[status] || status || 'Неизвестно';
    }

    showProgress(message, percent) {
        const progressModal = document.getElementById('reportProgressModal');
        const progressMessage = document.getElementById('progressMessage');
        const progressFill = document.getElementById('progressFill');
        const progressDetails = document.getElementById('progressDetails');
        
        if (progressModal) {
            progressModal.style.display = 'flex';
            
            if (progressMessage) {
                progressMessage.textContent = message;
            }
            
            if (progressFill) {
                progressFill.style.width = `${percent}%`;
                progressFill.textContent = `${percent}%`;
            }
            
            if (progressDetails) {
                progressDetails.textContent = `Часть ${this.currentChunk} из ${this.totalChunks}`;
            }
        }
    }

    hideProgress() {
        const progressModal = document.getElementById('reportProgressModal');
        if (progressModal) {
            progressModal.style.display = 'none';
        }
    }
}

// Глобальные функции для работы с отчетами (вне класса)
window.reportGenerator = new ReportGenerator();

function showReportModal(type = 'payments') {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('reportType').value = type;
    document.getElementById('reportChunkSize').value = 'all';
    
    if (type === 'payments') {
        document.getElementById('reportDateStart').value = startDate.toISOString().split('T')[0];
        document.getElementById('reportDateEnd').value = endDate.toISOString().split('T')[0];
        document.getElementById('reportStatus').value = 'all';
    } else if (type === 'users') {
        document.getElementById('userDateStart').value = startDate.toISOString().split('T')[0];
        document.getElementById('userDateEnd').value = endDate.toISOString().split('T')[0];
        document.getElementById('userTariffFilter').value = 'all';
    } else if (type === 'combined') {
        document.getElementById('combinedDateStart').value = startDate.toISOString().split('T')[0];
        document.getElementById('combinedDateEnd').value = endDate.toISOString().split('T')[0];
        document.getElementById('includePayments').checked = true;
        document.getElementById('includeUsers').checked = true;
        document.getElementById('includeStats').checked = true;
    }
    
    onReportTypeChange();
    modal.style.display = 'flex';
}

function showQuickReport(type) {
    showReportModal(type);
}

function closeReportModal() {
    const modal = document.getElementById('reportModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function onReportTypeChange() {
    const type = document.getElementById('reportType').value;
    
    document.getElementById('paymentsOptions').style.display = 
        type === 'payments' ? 'block' : 'none';
    document.getElementById('usersOptions').style.display = 
        type === 'users' ? 'block' : 'none';
    document.getElementById('combinedOptions').style.display = 
        type === 'combined' ? 'block' : 'none';
}

function cancelReport() {
    const progressModal = document.getElementById('reportProgressModal');
    if (progressModal) {
        progressModal.style.display = 'none';
        reportGenerator.isGenerating = false;
    }
}

async function generateReport() {
    const type = document.getElementById('reportType').value;
    
    let config = {
        type: type,
        chunkSize: document.getElementById('reportChunkSize').value
    };
    
    switch(type) {
        case 'payments':
            const dateStart = document.getElementById('reportDateStart').value;
            const dateEnd = document.getElementById('reportDateEnd').value;
            
            if (!dateStart || !dateEnd) {
                alert('Пожалуйста, выберите период отчета');
                return;
            }
            
            if (new Date(dateStart) > new Date(dateEnd)) {
                alert('Дата начала не может быть позже даты окончания');
                return;
            }
            
            config.dateStart = dateStart;
            config.dateEnd = dateEnd;
            config.status = document.getElementById('reportStatus').value;
            break;
            
        case 'users':
            const userDateStart = document.getElementById('userDateStart').value;
            const userDateEnd = document.getElementById('userDateEnd').value;
            
            if (userDateStart && userDateEnd && new Date(userDateStart) > new Date(userDateEnd)) {
                alert('Дата начала не может быть позже даты окончания');
                return;
            }
            
            if (userDateStart) config.dateStart = userDateStart;
            if (userDateEnd) config.dateEnd = userDateEnd;
            config.tariffFilter = document.getElementById('userTariffFilter').value;
            break;
            
        case 'combined':
            const combinedDateStart = document.getElementById('combinedDateStart').value;
            const combinedDateEnd = document.getElementById('combinedDateEnd').value;
            
            if (!combinedDateStart || !combinedDateEnd) {
                alert('Пожалуйста, выберите период отчета');
                return;
            }
            
            if (new Date(combinedDateStart) > new Date(combinedDateEnd)) {
                alert('Дата начала не может быть позже даты окончания');
                return;
            }
            
            config.dateStart = combinedDateStart;
            config.dateEnd = combinedDateEnd;
            config.includePayments = document.getElementById('includePayments').checked;
            config.includeUsers = document.getElementById('includeUsers').checked;
            config.includeStats = document.getElementById('includeStats').checked;
            break;
    }
    
    closeReportModal();
    
    if (!window.ExcelJS) {
        alert('Библиотека ExcelJS не загружена. Пожалуйста, проверьте подключение к интернету.');
        return;
    }
    
    await reportGenerator.generateExcelReport(config);
}

window.addEventListener('click', function(event) {
    const reportModal = document.getElementById('reportModal');
    const progressModal = document.getElementById('reportProgressModal');
    
    if (reportModal && event.target === reportModal) {
        closeReportModal();
    }
    
    if (progressModal && event.target === progressModal) {
        // Не закрываем окно прогресса по клику вне его
    }
});

// Тестовая функция для проверки тарифов
window.testTariffCheck = async function(userId) {
    const token = window.authService.token;
    const response = await fetch(`http://localhost:8080/api/v1/auth/${userId}`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });
    
    if (response.ok) {
        const user = await response.json();
        console.log('Данные пользователя:', user);
        console.log('Есть ли тариф?', window.reportGenerator.getUserTariffInfo(user));
    }
};