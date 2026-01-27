// reports.js - Формирование отчетов в Excel (исправленная версия)
class ReportGenerator {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/v1/admin';
        this.isGenerating = false;
        this.currentChunk = 1;
        this.totalChunks = 1;
        this.reportData = [];
        this.reportConfig = {};
    }

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
        // Загружаем данные с фильтрацией по дате
        await this.loadPaymentsData(config);
        
        if (this.reportData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета за выбранный период');
            return;
        }
        
        // Разбиваем на части
        const chunkSize = config.chunkSize === 'all' ? this.reportData.length : parseInt(config.chunkSize);
        this.totalChunks = Math.ceil(this.reportData.length / chunkSize);
        
        // Генерируем файлы
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
        // Загружаем данные пользователей
        await this.loadUsersData(config);
        
        if (this.reportData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета по пользователям');
            return;
        }
        
        // Разбиваем на части
        const chunkSize = config.chunkSize === 'all' ? this.reportData.length : parseInt(config.chunkSize);
        this.totalChunks = Math.ceil(this.reportData.length / chunkSize);
        
        // Генерируем файлы
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
            
            // Загружаем все платежи без фильтрации на сервере
            while (hasMore) {
                const params = new URLSearchParams({
                    page: page,
                    limit: limit
                });
                
                // НЕ добавляем фильтры даты на сервер - будем фильтровать локально
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
                    
                    // Обновляем прогресс
                    const progress = Math.min(50, Math.round((page * 100) / 50));
                    this.showProgress(`Загрузка всех платежей... (${allRawPayments.length})`, progress);
                    
                    page++;
                }
            }
            
            console.log(`📊 Всего загружено платежей: ${allRawPayments.length}`);
            
            // Теперь фильтруем платежи по дате локально
            let filteredPayments = allRawPayments;
            
            // Фильтрация по дате
            if (config.dateStart && config.dateEnd) {
                const startDate = new Date(config.dateStart);
                const endDate = new Date(config.dateEnd);
                endDate.setHours(23, 59, 59, 999); // Конец дня
                
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
            
            // Фильтрация по статусу
            if (config.status && config.status !== 'all') {
                filteredPayments = filteredPayments.filter(payment => 
                    payment.status === config.status
                );
                
                console.log(`✅ После фильтра по статусу ${config.status}: ${filteredPayments.length} платежей`);
            }
            
            // Применяем ограничение по количеству записей
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
        
        // Загружаем пользователей для получения имен
        console.log('👥 Загрузка данных пользователей...');
        try {
            const usersResponse = await fetch(`${this.baseUrl}/users?limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!usersResponse.ok) {
                throw new Error(`Ошибка загрузки пользователей: ${usersResponse.status}`);
            }
            
            const usersData = await usersResponse.json();
            const allUsers = usersData.user || usersData.users || [];
            
            const usersMap = {};
            allUsers.forEach(user => {
                usersMap[user.id] = {
                    name: user.name || user.username || `Пользователь #${user.id}`,
                    email: user.email || '',
                    phone: user.phone || user.phone_number || '',
                    tariff: user.tariff_name || user.tariff || 'Без тарифа'
                };
            });
            
            // Формируем финальные данные
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
            
            // Загружаем всех пользователей
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
                    
                    // Обновляем прогресс
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
            
            // Фильтрация по тарифу
            if (config.tariffFilter && config.tariffFilter !== 'all') {
                if (config.tariffFilter === 'with_tariff') {
                    filteredUsers = filteredUsers.filter(user => 
                        user.tariff_id || user.tariff_name || user.tariff_active || user.active_tariff
                    );
                    console.log(`✅ Пользователей с тарифом: ${filteredUsers.length}`);
                } else if (config.tariffFilter === 'without_tariff') {
                    filteredUsers = filteredUsers.filter(user => 
                        !user.tariff_id && !user.tariff_name && !user.tariff_active && !user.active_tariff
                    );
                    console.log(`✅ Пользователей без тарифа: ${filteredUsers.length}`);
                }
            }
            
            // Ограничение по количеству
            if (config.chunkSize !== 'all') {
                const limit = parseInt(config.chunkSize);
                if (filteredUsers.length > limit) {
                    filteredUsers = filteredUsers.slice(0, limit);
                    console.log(`✂️ Ограничение до ${limit} записей: ${filteredUsers.length}`);
                }
            }
            
            allUsers.push(...filteredUsers);
            
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            throw error;
        }
        
        // Формируем финальные данные
        this.reportData = allUsers.map(user => {
            // Определяем статус тарифа - более точная логика
            let tariffStatus = 'Неактивен';
            let hasTariff = false;
            
            // Проверяем все возможные поля, указывающие на наличие тарифа
            if (user.tariff_id || user.tariff_name || user.tariff || 
                user.tariff_active === true || user.active_tariff === true ||
                (user.tariff && user.tariff !== 'Без тарифа')) {
                hasTariff = true;
            }
            
            // Проверяем статус активности тарифа
            if (hasTariff) {
                if (user.tariff_active === true || user.active_tariff === true) {
                    tariffStatus = 'Активен';
                } else if (user.tariff_active === false || user.active_tariff === false) {
                    tariffStatus = 'Неактивен';
                } else {
                    // Если явного статуса нет, но есть тариф - считаем активным
                    tariffStatus = 'Активен';
                }
            }
            
            return {
                id: user.id || '-',
                name: user.name || user.username || `Пользователь #${user.id}`,
                email: user.email || '',
                phone: user.phone || user.phone_number || '',
                balance: parseFloat(user.balance) || 0,
                tariff: user.tariff_name || user.tariff || 'Без тарифа',
                tariff_status: tariffStatus,
                registration_date: user.created_at ? 
                    new Date(user.created_at).toLocaleDateString('ru-RU') : ''
            };
        });
        
        console.log(`👥 Сформировано записей пользователей для отчета: ${this.reportData.length}`);
        
        return this.reportData;
    }

    async createPaymentsExcelFile(data, chunkNumber) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Платежи');
        
        // Настройка колонок
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
        
        // Заголовок
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF4F81BD' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Данные
        data.forEach(item => {
            worksheet.addRow(item);
        });
        
        // Форматирование колонки с суммами
        worksheet.getColumn('amount').numFmt = '#,##0.00 ₽';
        worksheet.getColumn('amount').alignment = { horizontal: 'right' };
        
        // Итоговая строка
        if (data.length > 0) {
            const totalRow = worksheet.addRow({});
            totalRow.getCell('user_name').value = 'ИТОГО:';
            totalRow.getCell('user_name').font = { bold: true };
            
            const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            totalRow.getCell('amount').value = totalAmount;
            totalRow.getCell('amount').numFmt = '#,##0.00 ₽';
            totalRow.getCell('amount').font = { bold: true };
        }
        
        // Информация об отчете
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
            
            // Добавляем информацию о количестве дней в периоде
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
        
        // Статистика
        worksheet.addRow({});
        const statsTitleRow = worksheet.addRow({});
        statsTitleRow.getCell('user_name').value = 'СТАТИСТИКА:';
        statsTitleRow.getCell('user_name').font = { bold: true, size: 12 };
        
        worksheet.addRow({});
        const countRow = worksheet.addRow({});
        countRow.getCell('user_name').value = 'Всего записей в отчете:';
        countRow.getCell('status').value = data.length;
        countRow.getCell('status').font = { bold: true };
        
        if (data.length > 0) {
            // Средний платеж
            const totalAmount = data.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0);
            const avgPayment = totalAmount / data.length;
            
            worksheet.addRow({});
            const avgRow = worksheet.addRow({});
            avgRow.getCell('user_name').value = 'Средний платеж:';
            avgRow.getCell('status').value = avgPayment.toFixed(2) + ' ₽';
            avgRow.getCell('status').font = { bold: true };
            
            // Статистика по статусам
            const statusCounts = {};
            data.forEach(item => {
                const status = item.status || 'Неизвестно';
                statusCounts[status] = (statusCounts[status] || 0) + 1;
            });
            
            worksheet.addRow({});
            const statusTitleRow = worksheet.addRow({});
            statusTitleRow.getCell('user_name').value = 'Распределение по статусам:';
            statusTitleRow.getCell('user_name').font = { italic: true };
            
            Object.entries(statusCounts).forEach(([status, count]) => {
                const percent = ((count / data.length) * 100).toFixed(1);
                const statusRow = worksheet.addRow({});
                statusRow.getCell('user_name').value = `- ${status}:`;
                statusRow.getCell('status').value = `${count} (${percent}%)`;
            });
        }
        
        // Сохраняем файл
        await this.saveWorkbook(workbook, 'payments', chunkNumber);
    }

    async createUsersExcelFile(data, chunkNumber) {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Пользователи');
        
        // Настройка колонок (убран last_login)
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
        
        // Заголовок
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF2196F3' }
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
        
        // Данные
        data.forEach(user => {
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
        
        // Форматирование
        worksheet.getColumn('balance').numFmt = '#,##0.00 ₽';
        worksheet.getColumn('balance').alignment = { horizontal: 'right' };
        
        // Статистика
        const totalUsers = data.length;
        const totalBalance = data.reduce((sum, user) => sum + (parseFloat(user.balance) || 0), 0);
        const activeTariffs = data.filter(user => user.tariff_status === 'Активен').length;
        const inactiveTariffs = data.filter(user => user.tariff_status === 'Неактивен').length;
        
        worksheet.addRow({});
        const statsRow = worksheet.addRow({});
        statsRow.getCell('name').value = 'СТАТИСТИКА:';
        statsRow.getCell('name').font = { bold: true, size: 12 };
        
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
        
        const activeTariffsRow = worksheet.addRow({});
        activeTariffsRow.getCell('name').value = 'Активных тарифов:';
        activeTariffsRow.getCell('balance').value = activeTariffs;
        activeTariffsRow.getCell('balance').font = { bold: true };
        
        const inactiveTariffsRow = worksheet.addRow({});
        inactiveTariffsRow.getCell('name').value = 'Неактивных тарифов:';
        inactiveTariffsRow.getCell('balance').value = inactiveTariffs;
        inactiveTariffsRow.getCell('balance').font = { bold: true };
        
        if (activeTariffs > 0) {
            const percentActive = Math.round((activeTariffs / totalUsers) * 100);
            const percentRow = worksheet.addRow({});
            percentRow.getCell('name').value = 'Процент активных:';
            percentRow.getCell('balance').value = `${percentActive}%`;
            percentRow.getCell('balance').font = { bold: true };
        }
        
        // Информация об отчете
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
        
        // Сохраняем файл
        await this.saveWorkbook(workbook, 'users', chunkNumber);
    }

    async createCombinedExcelFile(paymentsData, usersData, config) {
        const workbook = new ExcelJS.Workbook();
        
        // Лист с платежами
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
            
            // Итоги по платежам
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
        
        // Лист с пользователями
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
        
        // Лист со статистикой
        if (config.includeStats) {
            const statsSheet = workbook.addWorksheet('Статистика');
            statsSheet.columns = [
                { header: 'Показатель', key: 'indicator', width: 30 },
                { header: 'Значение', key: 'value', width: 20 }
            ];
            
            const statsHeader = statsSheet.getRow(1);
            statsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
            statsHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF9C27B0' } };
            statsHeader.alignment = { vertical: 'middle', horizontal: 'center' };
            
            const totalPayments = paymentsData.length;
            const totalRevenue = paymentsData.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
            const totalUsers = usersData.length;
            const totalBalance = usersData.reduce((sum, u) => sum + (parseFloat(u.balance) || 0), 0);
            const activeUsers = usersData.filter(u => u.tariff_status === 'Активен').length;
            
            const stats = [
                { indicator: 'Общая статистика за период', value: '' },
                { indicator: 'Период отчета', value: `${config.dateStart} — ${config.dateEnd}` },
                { indicator: '', value: '' },
                { indicator: 'Пользователи:', value: '' },
                { indicator: 'Всего пользователей', value: totalUsers },
                { indicator: 'Активных пользователей', value: activeUsers },
                { indicator: 'Процент активности', value: totalUsers > 0 ? `${Math.round((activeUsers / totalUsers) * 100)}%` : '0%' },
                { indicator: 'Общий баланс', value: totalBalance },
                { indicator: 'Средний баланс', value: totalUsers > 0 ? (totalBalance / totalUsers).toFixed(2) : '0.00' },
                { indicator: '', value: '' },
                { indicator: 'Платежи:', value: '' },
                { indicator: 'Всего платежей', value: totalPayments },
                { indicator: 'Общая выручка', value: totalRevenue },
                { indicator: 'Средний платеж', value: totalPayments > 0 ? (totalRevenue / totalPayments).toFixed(2) : '0.00' },
                { indicator: '', value: '' },
                { indicator: 'Дата формирования', value: new Date().toLocaleString('ru-RU') }
            ];
            
            stats.forEach(stat => {
                statsSheet.addRow(stat);
            });
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

// Глобальные функции для работы с отчетами
window.reportGenerator = new ReportGenerator();

function showReportModal(type = 'payments') {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    
    // Устанавливаем даты по умолчанию (последние 30 дней)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    // Общие поля
    document.getElementById('reportType').value = type;
    document.getElementById('reportChunkSize').value = 'all';
    
    // Устанавливаем даты в зависимости от типа
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
            
            // Даты для пользователей - необязательные
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

// Закрытие модальных окон по клику вне их
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