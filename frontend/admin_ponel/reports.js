// reports.js - Упрощенный комбинированный отчет
class ReportGenerator {
    constructor() {
        this.baseUrl = 'http://localhost:8080/api/v1/admin';
        this.isGenerating = false;
    }

    async generateExcelReport(config) {
        try {
            if (this.isGenerating) {
                alert('Отчет уже формируется, пожалуйста подождите');
                return;
            }

            this.isGenerating = true;
            this.reportConfig = config;
            
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

    // НОВЫЙ МЕТОД: Отчет по платежам
    async generatePaymentsReport(config) {
        this.showProgress('Загрузка платежей...', 30);
        const paymentsData = await this.loadPaymentsData(config);
        
        if (paymentsData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета по платежам');
            return;
        }
        
        this.showProgress('Формирование отчета по платежам...', 70);
        await this.createSimplePaymentsExcel(paymentsData, config);
        
        this.hideProgress();
        alert('Отчет по платежам успешно сформирован!');
    }

    // НОВЫЙ МЕТОД: Отчет по пользователям
    async generateUsersReport(config) {
        this.showProgress('Загрузка пользователей...', 30);
        const usersData = await this.loadUsersData(config);
        
        if (usersData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета по пользователям');
            return;
        }
        
        this.showProgress('Формирование отчета по пользователям...', 70);
        await this.createSimpleUsersExcel(usersData, config);
        
        this.hideProgress();
        alert('Отчет по пользователям успешно сформирован!');
    }

    // НОВЫЙ МЕТОД: Создание Excel для платежей
    async createSimplePaymentsExcel(paymentsData, config) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Платежи');
        
        let row = 1;
        
        // ЗАГОЛОВОК
        sheet.mergeCells(`A${row}:F${row}`);
        const titleCell = sheet.getCell(`A${row}`);
        titleCell.value = '💳 ОТЧЕТ ПО ПЛАТЕЖАМ';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF9B59B6' } };
        titleCell.alignment = { horizontal: 'center' };
        row += 2;
        
        // ПЕРИОД
        sheet.getCell(`A${row}`).value = 'Период:';
        sheet.getCell(`A${row}`).font = { bold: true };
        sheet.getCell(`B${row}`).value = `${config.dateStart || 'Все время'} - ${config.dateEnd || 'Все время'}`;
        row++;
        
        sheet.getCell(`A${row}`).value = 'Дата формирования:';
        sheet.getCell(`B${row}`).value = new Date().toLocaleString('ru-RU');
        row += 2;
        
        // СТАТИСТИКА
        const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
        const completedCount = paymentsData.filter(p => p.status === 'Успешно').length;
        const pendingCount = paymentsData.filter(p => p.status === 'В обработке').length;
        const failedCount = paymentsData.filter(p => p.status === 'Ошибка' || p.status === 'Отменен').length;
        
        sheet.getCell(`A${row}`).value = 'Всего транзакций:';
        sheet.getCell(`B${row}`).value = paymentsData.length;
        sheet.getCell(`B${row}`).font = { bold: true };
        row++;
        
        sheet.getCell(`A${row}`).value = 'Общая сумма:';
        sheet.getCell(`B${row}`).value = totalAmount;
        sheet.getCell(`B${row}`).numFmt = '#,##0.00 ₽';
        sheet.getCell(`B${row}`).font = { bold: true };
        row++;
        
        sheet.getCell(`A${row}`).value = 'Успешных:';
        sheet.getCell(`B${row}`).value = completedCount;
        row++;
        
        sheet.getCell(`A${row}`).value = 'В обработке:';
        sheet.getCell(`B${row}`).value = pendingCount;
        row++;
        
        
        // ЗАГОЛОВКИ ТАБЛИЦЫ
        const headers = ['Дата', 'Время', 'Пользователь', 'ID пользователя', 'Сумма', 'Статус', 'Описание'];
        headers.forEach((header, idx) => {
            const col = String.fromCharCode(65 + idx);
            sheet.getCell(`${col}${row}`).value = header;
            sheet.getCell(`${col}${row}`).font = { bold: true };
            sheet.getCell(`${col}${row}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFE8DAEF' }
            };
        });
        row++;
        
        // ДАННЫЕ
        paymentsData
            .filter(p => p.amount > 0)
            .forEach(payment => {
                sheet.getCell(`A${row}`).value = payment.date;
                sheet.getCell(`B${row}`).value = payment.time;
                sheet.getCell(`C${row}`).value = payment.user_name || '';
                sheet.getCell(`D${row}`).value = payment.user_id;
                sheet.getCell(`E${row}`).value = payment.amount;
                sheet.getCell(`E${row}`).numFmt = '#,##0.00 ₽';
                sheet.getCell(`F${row}`).value = payment.status;
                sheet.getCell(`G${row}`).value = payment.description || '';
                
                // Цвет строки в зависимости от статуса
                if (payment.status === 'Успешно') {
                    sheet.getRow(row).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE8F5E8' }
                    };
                } else if (payment.status === 'Ошибка' || payment.status === 'Отменен') {
                    sheet.getRow(row).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFDE8E8' }
                    };
                } else if (payment.status === 'В обработке') {
                    sheet.getRow(row).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFFEF8E8' }
                    };
                }
                
                row++;
            });
        
        // ИТОГ
        sheet.getCell(`C${row}`).value = 'ИТОГО:';
        sheet.getCell(`C${row}`).font = { bold: true };
        sheet.getCell(`E${row}`).value = totalAmount;
        sheet.getCell(`E${row}`).numFmt = '#,##0.00 ₽';
        sheet.getCell(`E${row}`).font = { bold: true };
        
        // Настройка ширины колонок
        sheet.columns = [
            { width: 12 }, // A - Дата
            { width: 10 }, // B - Время
            { width: 25 }, // C - Пользователь
            { width: 15 }, // D - ID пользователя
            { width: 15 }, // E - Сумма
            { width: 15 }, // F - Статус
            { width: 30 }  // G - Описание
        ];
        
        // Сохранение файла
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `отчет_платежи_${dateStr}.xlsx`;
        
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

    // НОВЫЙ МЕТОД: Создание Excel для пользователей
    async createSimpleUsersExcel(usersData, config) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Пользователи');
        
        let row = 1;
        
        // ЗАГОЛОВОК
        sheet.mergeCells(`A${row}:F${row}`);
        const titleCell = sheet.getCell(`A${row}`);
        titleCell.value = '👥 ОТЧЕТ ПО ПОЛЬЗОВАТЕЛЯМ';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF3498DB' } };
        titleCell.alignment = { horizontal: 'center' };
        row += 2;
        
        // ПЕРИОД
        if (config.dateStart || config.dateEnd) {
            sheet.getCell(`A${row}`).value = 'Период регистрации:';
            sheet.getCell(`A${row}`).font = { bold: true };
            sheet.getCell(`B${row}`).value = `${config.dateStart || 'Все время'} - ${config.dateEnd || 'Все время'}`;
            row++;
        }
        
        sheet.getCell(`A${row}`).value = 'Дата формирования:';
        sheet.getCell(`B${row}`).value = new Date().toLocaleString('ru-RU');
        row += 2;
        
        // СТАТИСТИКА
        const activeUsers = usersData.filter(u => u.status === 'Активен').length;
        const totalBalance = usersData.reduce((sum, u) => sum + u.balance, 0);
        
        sheet.getCell(`A${row}`).value = 'Всего пользователей:';
        sheet.getCell(`B${row}`).value = usersData.length;
        sheet.getCell(`B${row}`).font = { bold: true };
        row++;
        
        sheet.getCell(`A${row}`).value = 'Активных:';
        sheet.getCell(`B${row}`).value = activeUsers;
        row++;
        
        sheet.getCell(`A${row}`).value = 'С балансом > 0:';
        sheet.getCell(`B${row}`).value = usersData.filter(u => u.balance > 0).length;
        row++;
        
        sheet.getCell(`A${row}`).value = 'Общий баланс:';
        sheet.getCell(`B${row}`).value = totalBalance;
        sheet.getCell(`B${row}`).numFmt = '#,##0.00 ₽';
        sheet.getCell(`B${row}`).font = { bold: true };
        row += 2;
        
        // ЗАГОЛОВКИ ТАБЛИЦЫ
        const headers = ['ID', 'Имя', 'Email', 'Телефон', 'Баланс', 'Тариф', 'Статус', 'Дата регистрации'];
        headers.forEach((header, idx) => {
            const col = String.fromCharCode(65 + idx);
            sheet.getCell(`${col}${row}`).value = header;
            sheet.getCell(`${col}${row}`).font = { bold: true };
            sheet.getCell(`${col}${row}`).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFD6EAF8' }
            };
        });
        row++;
        
        // ДАННЫЕ
        usersData.forEach(user => {
            sheet.getCell(`A${row}`).value = user.id;
            sheet.getCell(`B${row}`).value = user.name;
            sheet.getCell(`C${row}`).value = user.email || '';
            sheet.getCell(`D${row}`).value = user.phone || '';
            sheet.getCell(`E${row}`).value = user.balance;
            sheet.getCell(`E${row}`).numFmt = '#,##0.00 ₽';
            sheet.getCell(`F${row}`).value = user.tariff;
            sheet.getCell(`G${row}`).value = user.status;
            sheet.getCell(`H${row}`).value = user.reg_date || '';
            
            // Цвет строки в зависимости от статуса
            if (user.status === 'Активен') {
                sheet.getRow(row).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE8F5E8' }
                };
            } else {
                sheet.getRow(row).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF0F0F0' }
                };
            }
            
            row++;
        });
        
        // ИТОГ
        sheet.getCell(`D${row}`).value = 'ИТОГО БАЛАНС:';
        sheet.getCell(`D${row}`).font = { bold: true };
        sheet.getCell(`E${row}`).value = totalBalance;
        sheet.getCell(`E${row}`).numFmt = '#,##0.00 ₽';
        sheet.getCell(`E${row}`).font = { bold: true };
        
        // Настройка ширины колонок
        sheet.columns = [
            { width: 10 }, // A - ID
            { width: 25 }, // B - Имя
            { width: 25 }, // C - Email
            { width: 15 }, // D - Телефон
            { width: 15 }, // E - Баланс
            { width: 15 }, // F - Тариф
            { width: 12 }, // G - Статус
            { width: 12 }  // H - Дата регистрации
        ];
        
        // Сохранение файла
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `отчет_пользователи_${dateStr}.xlsx`;
        
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

    async generateCombinedReport(config) {
        this.showProgress('Загрузка платежей...', 20);
        const paymentsData = await this.loadPaymentsData(config);
        
        this.showProgress('Загрузка пользователей...', 60);
        const usersData = await this.loadUsersData(config);
        
        this.showProgress('Формирование отчета...', 80);
        
        if (paymentsData.length === 0 && usersData.length === 0) {
            this.hideProgress();
            alert('Нет данных для формирования отчета');
            return;
        }
        
        await this.createSimpleCombinedExcel(paymentsData, usersData, config);
        
        this.hideProgress();
        alert('Комбинированный отчет успешно сформирован!');
    }

    async loadPaymentsData(config) {
        if (!window.authService || !window.authService.token) {
            throw new Error('Не авторизован');
        }
        
        const token = window.authService.token;
        const allPayments = [];
        
        try {
            let page = 1;
            const limit = 100;
            let hasMore = true;
            
            while (hasMore) {
                const params = new URLSearchParams({
                    page: page,
                    limit: limit
                });
                
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
                    allPayments.push(...payments);
                    page++;
                }
            }
            
            // Фильтрация по дате
            let filteredPayments = allPayments;
            if (config.dateStart && config.dateEnd) {
                const startDate = new Date(config.dateStart);
                const endDate = new Date(config.dateEnd);
                endDate.setHours(23, 59, 59, 999);
                
                filteredPayments = allPayments.filter(payment => {
                    if (!payment.created_at) return false;
                    try {
                        const paymentDate = new Date(payment.created_at);
                        return paymentDate >= startDate && paymentDate <= endDate;
                    } catch (error) {
                        return false;
                    }
                });
            }
            
            // Фильтрация по статусу (для отчетов по платежам)
            if (config.status && config.status !== 'all') {
                filteredPayments = filteredPayments.filter(p => p.status === config.status);
            }
            
            // Загружаем данные пользователей для платежей
            const usersMap = await this.loadUsersForPayments(token, filteredPayments);
            
            return filteredPayments.map(payment => {
                const user = usersMap[payment.user_id];
                
                return {
                    id: payment.id || '-',
                    date: payment.created_at ? 
                        new Date(payment.created_at).toLocaleDateString('ru-RU') : '',
                    time: payment.created_at ? 
                        new Date(payment.created_at).toLocaleTimeString('ru-RU') : '',
                    user_id: payment.user_id || '-',
                    user_name: user ? user.name : '',
                    amount: parseFloat(payment.amount) || 0,
                    status: this.getSimpleStatus(payment.status),
                    description: payment.description || '',
                    user_tariff: user ? user.tariff : ''
                };
            });
            
        } catch (error) {
            console.error('Ошибка загрузки платежей:', error);
            throw error;
        }
    }

    async loadUsersForPayments(token, payments) {
        const userIds = [...new Set(payments.map(p => p.user_id).filter(id => id))];
        const usersMap = {};
        
        for (const userId of userIds) {
            try {
                const userDetails = await this.getUserDetails(userId, token);
                if (userDetails) {
                    usersMap[userId] = {
                        name: userDetails.name || userDetails.username || '',
                        tariff: this.getCleanTariffName(userDetails)
                    };
                }
            } catch (error) {
                // Игнорируем ошибки
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
        
        try {
            let page = 1;
            const limit = 100;
            let hasMore = true;
            
            while (hasMore) {
                const params = new URLSearchParams({
                    page: page,
                    limit: limit
                });
                
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
                    allUsers.push(...users);
                    page++;
                }
            }
            
            // Фильтрация по дате
            let filteredUsers = allUsers;
            if (config.dateStart && config.dateEnd) {
                const startDate = new Date(config.dateStart);
                const endDate = new Date(config.dateEnd);
                endDate.setHours(23, 59, 59, 999);
                
                filteredUsers = allUsers.filter(user => {
                    if (!user.created_at) return false;
                    try {
                        const regDate = new Date(user.created_at);
                        return regDate >= startDate && regDate <= endDate;
                    } catch (error) {
                        return false;
                    }
                });
            }
            
            // Фильтрация по тарифу (для отчетов по пользователям)
            if (config.tariffFilter && config.tariffFilter !== 'all') {
                filteredUsers = filteredUsers.filter(user => {
                    const tariffName = this.getCleanTariffName(user);
                    return tariffName === config.tariffFilter;
                });
            }
            
            // Загружаем детальные данные
            const usersWithDetails = [];
            for (const user of filteredUsers) {
                try {
                    const userDetails = await this.getUserDetails(user.id, token);
                    if (userDetails) {
                        usersWithDetails.push({
                            id: user.id,
                            name: userDetails.name || userDetails.username || user.name || user.username || '',
                            email: userDetails.email || user.email || '',
                            phone: userDetails.phone || user.phone || user.phone_number || '',
                            balance: parseFloat(userDetails.balance || user.balance || 0),
                            tariff: this.getCleanTariffName(userDetails),
                            status: userDetails.is_active === false ? 'Неактивен' : 'Активен',
                            reg_date: user.created_at ? 
                                new Date(user.created_at).toLocaleDateString('ru-RU') : ''
                        });
                    }
                } catch (error) {
                    // Используем базовые данные если не удалось загрузить детальные
                    usersWithDetails.push({
                        id: user.id,
                        name: user.name || user.username || '',
                        email: user.email || '',
                        phone: user.phone || user.phone_number || '',
                        balance: parseFloat(user.balance || 0),
                        tariff: this.getCleanTariffName(user),
                        status: user.is_active === false ? 'Неактивен' : 'Активен',
                        reg_date: user.created_at ? 
                            new Date(user.created_at).toLocaleDateString('ru-RU') : ''
                    });
                }
            }
            
            return usersWithDetails;
            
        } catch (error) {
            console.error('Ошибка загрузки пользователей:', error);
            throw error;
        }
    }

    async getUserDetails(userId, token) {
        try {
            const response = await fetch(`http://localhost:8080/api/v1/auth/${userId}`, {
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
        } catch (error) {
            // Игнорируем ошибки
        }
        return null;
    }

    getCleanTariffName(user) {
        if (!user) return 'Без тарифа';
        
        // Если есть название тарифа
        if (user.tariff_name && user.tariff_name.trim()) {
            return user.tariff_name;
        }
        
        // Если есть ID тарифа, но нет названия
        if (user.tariff_id) {
            const tariffNames = {
                1: 'Базовый',
                2: 'Стандартный', 
                3: 'Премиум',
                4: 'Бизнес',
                5: 'Безлимитный'
            };
            return tariffNames[user.tariff_id] || 'Без тарифа';
        }
        
        // Если баланс высокий, считаем что есть тариф
        if (user.balance && parseFloat(user.balance) > 100) {
            return 'Премиум (по балансу)';
        }
        
        return 'Без тарифа';
    }

    getSimpleStatus(status) {
        const statusMap = {
            'completed': 'Успешно',
            'pending': 'В обработке',
            'failed': 'Ошибка',
            'cancelled': 'Отменен',
            'refunded': 'Возврат',
            'created': 'Создан'
        };
        return statusMap[status] || status || 'Неизвестно';
    }

    async createSimpleCombinedExcel(paymentsData, usersData, config) {
        const workbook = new ExcelJS.Workbook();
        const sheet = workbook.addWorksheet('Сводный отчет');
        
        let row = 1;
        
        // 1. ЗАГОЛОВОК
        sheet.mergeCells(`A${row}:F${row}`);
        const titleCell = sheet.getCell(`A${row}`);
        titleCell.value = '📊 СВОДНЫЙ ОТЧЕТ';
        titleCell.font = { bold: true, size: 16, color: { argb: 'FF2E5AA7' } };
        titleCell.alignment = { horizontal: 'center' };
        row += 2;
        
        // 2. ПЕРИОД
        sheet.getCell(`A${row}`).value = 'Период:';
        sheet.getCell(`A${row}`).font = { bold: true };
        sheet.getCell(`B${row}`).value = `${config.dateStart || 'Все время'} - ${config.dateEnd || 'Все время'}`;
        row++;
        
        sheet.getCell(`A${row}`).value = 'Дата формирования:';
        sheet.getCell(`B${row}`).value = new Date().toLocaleString('ru-RU');
        row += 2;
        
        // 3. ОСНОВНЫЕ ПОКАЗАТЕЛИ (упрощенные)
        if (paymentsData.length > 0 || usersData.length > 0) {
            sheet.mergeCells(`A${row}:F${row}`);
            sheet.getCell(`A${row}`).value = '📈 ОСНОВНЫЕ ПОКАЗАТЕЛИ';
            sheet.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: 'FF27AE60' } };
            row++;
            
            const totalUsers = usersData.length;
            const totalBalance = usersData.reduce((sum, u) => sum + u.balance, 0);
            const totalPayments = paymentsData.length;
            const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
            
            // ТОЛЬКО 4 основных показателя в 2 колонки
            const stats = [
                ['Всего пользователей:', totalUsers],
                ['Общий баланс:', totalBalance],
                ['Всего транзакций:', totalPayments],
                ['Общая сумма:', totalAmount]
            ];
            
            for (let i = 0; i < stats.length; i += 2) {
                const stat1 = stats[i];
                const stat2 = stats[i + 1];
                
                sheet.getCell(`A${row}`).value = stat1[0];
                sheet.getCell(`B${row}`).value = stat1[1];
                sheet.getCell(`B${row}`).font = { bold: true };
                
                if (stat2) {
                    sheet.getCell(`D${row}`).value = stat2[0];
                    sheet.getCell(`E${row}`).value = stat2[1];
                    sheet.getCell(`E${row}`).font = { bold: true };
                }
                
                // Форматируем денежные значения
                if (stat1[0].includes('баланс') || stat1[0].includes('сумм')) {
                    sheet.getCell(`B${row}`).numFmt = '#,##0.00 ₽';
                }
                if (stat2 && (stat2[0].includes('баланс') || stat2[0].includes('сумм'))) {
                    sheet.getCell(`E${row}`).numFmt = '#,##0.00 ₽';
                }
                
                row++;
            }
            row += 2;
        }
        
        // 4. ПЛАТЕЖИ (если есть)
        if (paymentsData.length > 0) {
            sheet.mergeCells(`A${row}:F${row}`);
            sheet.getCell(`A${row}`).value = '💳 ПЛАТЕЖИ';
            sheet.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: 'FF9B59B6' } };
            row++;
            
            // Заголовки
            const paymentHeaders = ['Дата', 'Время', 'Пользователь', 'Сумма', 'Статус'];
            paymentHeaders.forEach((header, idx) => {
                sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`).value = header;
                sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`).font = { bold: true };
                sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFE8DAEF' }
                };
            });
            row++;
            
            // Данные
            paymentsData
                .filter(p => p.amount > 0) // фильтруем нулевые суммы
                .forEach(payment => {
                    sheet.getCell(`A${row}`).value = payment.date;
                    sheet.getCell(`B${row}`).value = payment.time;
                    sheet.getCell(`C${row}`).value = payment.user_name || `ID: ${payment.user_id}`;
                    sheet.getCell(`D${row}`).value = payment.amount;
                    sheet.getCell(`D${row}`).numFmt = '#,##0.00 ₽';
                    sheet.getCell(`E${row}`).value = payment.status;
                    sheet.getCell(`F${row}`).value = payment.description || '';
                    
                    // Цвет строки в зависимости от статуса
                    if (payment.status === 'Успешно') {
                        sheet.getRow(row).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFE8F5E8' }
                        };
                    } else if (payment.status === 'Ошибка' || payment.status === 'Отменен') {
                        sheet.getRow(row).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFDE8E8' }
                        };
                    } else if (payment.status === 'В обработке') {
                        sheet.getRow(row).fill = {
                            type: 'pattern',
                            pattern: 'solid',
                            fgColor: { argb: 'FFFEF8E8' }
                        };
                    }
                    
                    row++;
                });
                
            // Итоговая сумма
            const totalAmount = paymentsData.reduce((sum, p) => sum + p.amount, 0);
            sheet.getCell(`C${row}`).value = 'ИТОГО:';
            sheet.getCell(`C${row}`).font = { bold: true };
            sheet.getCell(`D${row}`).value = totalAmount;
            sheet.getCell(`D${row}`).numFmt = '#,##0.00 ₽';
            sheet.getCell(`D${row}`).font = { bold: true };
            row += 2;
        }
        
        // 5. ПОЛЬЗОВАТЕЛИ (если есть)
        if (usersData.length > 0) {
            sheet.mergeCells(`A${row}:F${row}`);
            sheet.getCell(`A${row}`).value = '👥 ПОЛЬЗОВАТЕЛИ';
            sheet.getCell(`A${row}`).font = { bold: true, size: 12, color: { argb: 'FF3498DB' } };
            row++;
            
            // Заголовки (только имя, телефон и баланс)
            const userHeaders = ['Имя', 'Телефон', 'Баланс', 'Тариф', 'Статус'];
            userHeaders.forEach((header, idx) => {
                sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`).value = header;
                sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`).font = { bold: true };
                sheet.getCell(`${String.fromCharCode(65 + idx)}${row}`).fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFD6EAF8' }
                };
            });
            row++;
            
            // Данные
            usersData.forEach(user => {
                sheet.getCell(`A${row}`).value = user.name;
                sheet.getCell(`B${row}`).value = user.phone || '';
                sheet.getCell(`C${row}`).value = user.balance;
                sheet.getCell(`C${row}`).numFmt = '#,##0.00 ₽';
                sheet.getCell(`D${row}`).value = user.tariff;
                sheet.getCell(`E${row}`).value = user.status;
                
                // Цвет строки в зависимости от статуса
                if (user.status === 'Активен') {
                    sheet.getRow(row).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFE8F5E8' }
                    };
                } else {
                    sheet.getRow(row).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'FFF0F0F0' }
                    };
                }
                
                row++;
            });
            
            // Итоговый баланс
            const totalBalance = usersData.reduce((sum, u) => sum + u.balance, 0);
            sheet.getCell(`B${row}`).value = 'ИТОГО:';
            sheet.getCell(`B${row}`).font = { bold: true };
            sheet.getCell(`C${row}`).value = totalBalance;
            sheet.getCell(`C${row}`).numFmt = '#,##0.00 ₽';
            sheet.getCell(`C${row}`).font = { bold: true };
        }
        
        // Настройка ширины колонок
        sheet.columns = [
            { width: 12 }, // A - Дата/Имя
            { width: 10 }, // B - Время/Телефон
            { width: 25 }, // C - Пользователь/Баланс
            { width: 15 }, // D - Сумма/Тариф
            { width: 15 }, // E - Статус/Статус
            { width: 30 }  // F - Описание
        ];
        
        // Автофильтр
        if (paymentsData.length > 0 || usersData.length > 0) {
            sheet.autoFilter = {
                from: { row: 1, column: 1 },
                to: { row: row, column: 6 }
            };
        }
        
        // Сохранение файла
        const dateStr = new Date().toISOString().split('T')[0];
        const filename = `сводный_отчет_${dateStr}.xlsx`;
        
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

    showProgress(message, percent) {
        const progressModal = document.getElementById('reportProgressModal');
        const progressMessage = document.getElementById('progressMessage');
        const progressFill = document.getElementById('progressFill');
        
        if (progressModal) {
            progressModal.style.display = 'flex';
            if (progressMessage) progressMessage.textContent = message;
            if (progressFill) {
                progressFill.style.width = `${percent}%`;
                progressFill.textContent = `${percent}%`;
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

// Глобальные функции
window.reportGenerator = new ReportGenerator();

function showReportModal(type = 'payments') {
    const modal = document.getElementById('reportModal');
    if (!modal) return;
    
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    document.getElementById('reportType').value = type;
    
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
    
    // Просто показываем/скрываем блоки
    const paymentsOptions = document.getElementById('paymentsOptions');
    const usersOptions = document.getElementById('usersOptions');
    const combinedOptions = document.getElementById('combinedOptions');
    
    if (paymentsOptions) paymentsOptions.style.display = type === 'payments' ? 'block' : 'none';
    if (usersOptions) usersOptions.style.display = type === 'users' ? 'block' : 'none';
    if (combinedOptions) combinedOptions.style.display = type === 'combined' ? 'block' : 'none';
}

async function generateReport() {
    const type = document.getElementById('reportType').value;
    
    let config = {
        type: type,
        chunkSize: 'all' // всегда все данные
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
    const modal = document.getElementById('reportModal');
    if (modal && event.target === modal) {
        closeReportModal();
    }
});