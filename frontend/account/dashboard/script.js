document.addEventListener('DOMContentLoaded', () => {
    const userData = localStorage.getItem('netlinkUser');
    
    if (!userData) {
        window.location.href = '/account';
        return;
    }

    const user = JSON.parse(userData);
    
    
    document.getElementById('userName').textContent = user.name;
    document.getElementById('userAccount').textContent = user.account_number;
    
    document.getElementById('userBalance').textContent = `1000`;

    const tariffData = getTariffData(user.tariff_id);
    
    updateTariffDisplay(tariffData);
    
    
    updateTariffFeatures(tariffData);

    
    updateBalanceStatus(user.balance);

    
    setupEventListeners();
});


function getTariffData(tariffId) {
    const tariffs = {
        1: {
            id: 1,
            name: "Базовый 50 Мбит/с",
            price: 300,
            speed: "50 Мбит/с",
            traffic: "Безлимитный",
            devices: "до 3 устройств",
            features: ["Безлимитный интернет", "Техподдержка 24/7", "Базовая защита"]
        },
        2: {
            id: 2,
            name: "Оптимальный 100 Мбит/с",
            price: 500,
            speed: "100 Мбит/с",
            traffic: "Безлимитный",
            devices: "до 5 устройств",
            features: ["Безлимитный интернет", "Приоритетная поддержка", "Расширенная защита", "Статический IP"]
        },
        3: {
            id: 3,
            name: "Премиум 200 Мбит/с",
            price: 800,
            speed: "200 Мбит/с",
            traffic: "Безлимитный",
            devices: "до 10 устройств",
            features: ["Безлимитный интернет", "Персональный менеджер", "Максимальная защита", "Статический IP", "Резервный канал"]
        }
    };
    
    
    if (!tariffId) {
        return {
            id: null,
            name: "Тариф не активирован",
            price: 0,
            speed: "0 Мбит/с",
            traffic: "Нет доступа",
            devices: "нет устройств",
            features: ["Интернет недоступен", "Подключите тариф для начала использования"],
            isActive: false
        };
    }
    
    const tariff = tariffs[tariffId];
    tariff.isActive = true;
    return tariff;
}


function updateTariffFeatures(tariffData) {
    const featuresContainer = document.getElementById('tariffFeatures');
    const badgeElement = document.getElementById('tariffBadge');
    
    if (!tariffData.isActive) {
        
        badgeElement.textContent = "НЕ АКТИВЕН";
        badgeElement.style.background = '#95a5a6';
        
        featuresContainer.innerHTML = `
            <div class="feature">
                <i class="fas fa-times-circle"></i>
                <span>Скорость: ${tariffData.speed}</span>
            </div>
            <div class="feature">
                <i class="fas fa-ban"></i>
                <span>Трафик: ${tariffData.traffic}</span>
            </div>
            <div class="feature">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Статус: Требуется активация</span>
            </div>
        `;
        
        
        tariffData.features.forEach(feature => {
            featuresContainer.innerHTML += `
                <div class="feature">
                    <i class="fas fa-info-circle"></i>
                    <span>${feature}</span>
                </div>
            `;
        });
    } else {
        
        featuresContainer.innerHTML = `
            <div class="feature">
                <i class="fas fa-bolt"></i>
                <span>Скорость: ${tariffData.speed}</span>
            </div>
            <div class="feature">
                <i class="fas fa-wifi"></i>
                <span>Трафик: ${tariffData.traffic}</span>
            </div>
            <div class="feature">
                <i class="fas fa-desktop"></i>
                <span>Устройства: ${tariffData.devices}</span>
            </div>
            <div class="feature">
                <i class="fas fa-shield-alt"></i>
                <span>Защита: Активна</span>
            </div>
        `;
        
        
        tariffData.features.forEach(feature => {
            featuresContainer.innerHTML += `
                <div class="feature">
                    <i class="fas fa-check"></i>
                    <span>${feature}</span>
                </div>
            `;
        });
    }
}


function updateTariffDisplay(tariffData) {
    const nameElement = document.getElementById('userTariff');
    const priceElement = document.getElementById('tariffPrice');
    const widgetElement = document.querySelector('.dashboard__widget.card');
    
    if (!tariffData.isActive) {
        nameElement.textContent = tariffData.name;
        nameElement.style.color = '#95a5a6';
        priceElement.textContent = "0 руб./мес.";
        priceElement.style.color = '#95a5a6';
        widgetElement.classList.add('tariff-inactive');
    } else {
        nameElement.textContent = tariffData.name;
        nameElement.style.color = '#2c3e50';
        priceElement.textContent = `${tariffData.price} руб./мес.`;
        priceElement.style.color = '#e74c3c';
        widgetElement.classList.remove('tariff-inactive');
    }
}


function updateBalanceStatus(balance) {
    const balanceElement = document.getElementById('userBalance');
    const statusElement = document.querySelector('.balance-status');
    
    if (balance < 0) {
        balanceElement.classList.add('balance-negative');
        statusElement.innerHTML = `
            <i class="fas fa-exclamation-triangle status-negative"></i>
            <span>Отрицательный баланс</span>
            <small>Пополните счет для продолжения услуг</small>
        `;
        statusElement.style.background = '#fee';
    } else if (balance < 100) {
        balanceElement.classList.add('balance-warning');
        statusElement.innerHTML = `
            <i class="fas fa-info-circle status-warning"></i>
            <span>Баланс на исходе</span>
            <small>Рекомендуем пополнить счет</small>
        `;
        statusElement.style.background = '#fff3cd';
    } else {
        balanceElement.classList.add('balance-positive');
        statusElement.innerHTML = `
            <i class="fas fa-check-circle status-positive"></i>
            <span>Баланс положительный</span>
            <small>Услуги активны</small>
        `;
        statusElement.style.background = '#f8f9fa';
    }
}


function setupEventListeners() {
    
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        if (confirm('Вы уверены, что хотите выйти?')) {
            localStorage.removeItem('netlinkUser');
            localStorage.removeItem('netlinkLoggedIn');
            window.location.href = '/account';
        }
    });

    
    document.getElementById('chooseTariffBtn').addEventListener('click', showTariffModal);

    
    document.getElementById('closeModalBtn').addEventListener('click', closeTariffModal);
    document.querySelector('.close').addEventListener('click', closeTariffModal);

    
    document.querySelectorAll('.select-tariff').forEach(button => {
        button.addEventListener('click', function() {
            const tariffOption = this.closest('.tariff-option');
            const tariffId = tariffOption.getAttribute('data-tariff-id');
            activateTariff(tariffId);
        });
    });

    
    document.querySelectorAll('.quick-action').forEach(button => {
        button.addEventListener('click', function() {
            const actionText = this.querySelector('span').textContent;
            if (actionText === 'Подключить тариф') {
                showTariffModal();
            } else {
                alert(`Функция "${actionText}" в разработке`);
            }
        });
    });

    
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('tariffModal');
        if (e.target === modal) {
            closeTariffModal();
        }
    });
}


function activateTariff(tariffId) {
    const userData = localStorage.getItem('netlinkUser');
    if (!userData) return;

    const user = JSON.parse(userData);
    
    
    const tariffData = getTariffData(parseInt(tariffId));
    const confirmMessage = `Вы уверены, что хотите активировать тариф "${tariffData.name}" за ${tariffData.price} руб./мес.?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    balance = document.getElementById('userBalance');
    document.getElementById('userBalance').textContent = balance - tariffData.price;
}


function showTariffModal() {
    document.getElementById('tariffModal').style.display = 'block';
}

function closeTariffModal() {
    document.getElementById('tariffModal').style.display = 'none';
}