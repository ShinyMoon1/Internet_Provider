document.addEventListener('DOMContentLoaded', async () => {
    const userData = localStorage.getItem('netlinkUser');
    if (!userData) {
        window.location.href = '/account';
        return;
    }

    try {
        const user = await loadUserData();
        
        document.getElementById('userName').textContent = user.name;
        document.getElementById('userAccount').textContent = user.accountn;
        document.getElementById('userBalance').textContent = user.balance;

        const tariffData = getTariffData(user.tariff_id);
        updateTariffDisplay(tariffData);
        updateTariffFeatures(tariffData);
        updateBalanceStatus(user.balance);
        setupEventListeners();
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        const user = JSON.parse(userData);
    }
});

async function loadUserData() {
    const userData = localStorage.getItem('netlinkUser');
    const user = JSON.parse(userData);
    
    console.log('Загружаем данные пользователя ID:', user.id);
    
    const response = await fetch(`http://localhost:8080/api/v1/auth/${user.id}`);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
        throw new Error(`Ошибка сервера: ${response.status}`);
    }
    
    const result = await response.json();
    console.log('Данные получены:', result);
    
    localStorage.setItem('netlinkUser', JSON.stringify(result.user));
    
    return result.user;
}

function getTariffData(tariffId) {
    const tariffs = {
        1: {
            id: 1,
            name: "Базовый 50 Мбит/с",
            price: 300,
            speed: "50 Мбит/с",
            traffic: "Безлимитный",
            devices: "до 3 устройств",
            features: ["Безлимитный интернет", "Техподдержка 24/7", "Базовая защита"],
            isActive: true
        },
        2: {
            id: 2,
            name: "Оптимальный 100 Мбит/с",
            price: 500,
            speed: "100 Мбит/с",
            traffic: "Безлимитный",
            devices: "до 5 устройств",
            features: ["Безлимитный интернет", "Приоритетная поддержка", "Расширенная защита", "Статический IP"],
            isActive: true
        },
        3: {
            id: 3,
            name: "Премиум 200 Мбит/с",
            price: 800,
            speed: "200 Мбит/с",
            traffic: "Безлимитный",
            devices: "до 10 устройств",
            features: ["Безлимитный интернет", "Персональный менеджер", "Максимальная защита", "Статический IP", "Резервный канал"],
            isActive: true
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
    
    return tariffs[tariffId];
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
        badgeElement.textContent = "АКТИВЕН";
        badgeElement.style.background = '#27ae60';
        
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
    
    const userData = localStorage.getItem('netlinkUser');
    const user = userData ? JSON.parse(userData) : { tariff_id: null };
    
    if (!user.tariff_id) {
        statusElement.innerHTML = `
            <i class="fas fa-exclamation-triangle status-warning"></i>
            <span>Тариф не активирован</span>
            <small>Услуги недоступны</small>
        `;
        statusElement.style.background = '#fff3cd';
        return;
    }
    
    if (balance < 300) {
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
            <span>Услуги активны</span>
            <small>Баланс положительный</small>
        `;
        statusElement.style.background = '#f8f9fa';
        balanceElement.classList.remove('balance-warning');
    }
}

function setupEventListeners() {
    console.log('Настройка обработчиков...');
    
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (confirm('Вы уверены, что хотите выйти?')) {
                localStorage.removeItem('netlinkUser');
                window.location.href = '../account.html';
            }
        });
    }

    const chooseTariffBtn = document.getElementById('chooseTariffBtn');
    if (chooseTariffBtn) {
        chooseTariffBtn.addEventListener('click', showTariffModal);
    }

    const closeModalBtn = document.getElementById('closeModalBtn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeTariffModal);
    }

    const activateModalBtn = document.getElementById('activateTariffModalBtn');
    if (activateModalBtn) {
        activateModalBtn.addEventListener('click', activateSelectedTariff);
    }

    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('select-tariff')) {
            console.log('Клик по выбору тарифа');
            const tariffOption = e.target.closest('.tariff-option');
            if (tariffOption) {
                const tariffId = tariffOption.getAttribute('data-tariff-id');
                selectTariff(tariffId);
            }
        }
    });

    window.addEventListener('click', function(e) {
        const modal = document.getElementById('tariffModal');
        if (modal && e.target === modal) {
            closeTariffModal();
        }
    });

    const activateBtn = document.getElementById('activateTariffBtn');
    if (activateBtn) {
        activateBtn.style.display = 'none';
    }
}

function selectTariff(tariffId) {
    console.log('Выбор тарифа:', tariffId);
    
    document.querySelectorAll('.tariff-option').forEach(option => {
        option.style.borderColor = '';
        option.style.background = '';
    });
    
    const selectedOption = document.querySelector(`[data-tariff-id="${tariffId}"]`);
    if (selectedOption) {
        selectedOption.style.borderColor = '#3498db';
        selectedOption.style.background = '#f0f8ff';
        
        localStorage.setItem('selectedTariff', tariffId);
        
        const activateModalBtn = document.getElementById('activateTariffModalBtn');
        if (activateModalBtn) {
            activateModalBtn.style.display = 'inline-block';
        }
    }
}

async function activateSelectedTariff() {
    console.log('Функция activateSelectedTariff вызвана');
    
    const selectedTariffId = localStorage.getItem('selectedTariff');
    console.log('selectedTariffId:', selectedTariffId);
    
    const userData = localStorage.getItem('netlinkUser');
    console.log('userData:', userData);
    
    if (!selectedTariffId) {
        alert('Сначала выберите тариф!');
        return;
    }

    if (!userData) return;

    const user = JSON.parse(userData);
    const tariffData = getTariffData(parseInt(selectedTariffId));
    
    const confirmMessage = `Вы уверены, что хотите активировать тариф "${tariffData.name}"?`;
    
    if (!confirm(confirmMessage)) {
        return;
    }

    try {
        const activateBtn = document.getElementById('activateTariffModalBtn');
        const originalText = activateBtn.innerHTML;
        activateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Активация...';
        activateBtn.disabled = true;

        const response = await fetch('http://localhost:8080/api/v1/auth/activate-tariff', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.id,
                tariff_id: parseInt(selectedTariffId)
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }

        const result = await response.json();
        
        user.tariff_id = parseInt(selectedTariffId);
        localStorage.setItem('netlinkUser', JSON.stringify(user));
        
        updateTariffDisplay(tariffData);
        updateTariffFeatures(tariffData);
        
        closeTariffModal();
        
        alert(`Тариф "${tariffData.name}" успешно активирован!`);
        
    } catch (error) {
        console.error('Ошибка активации тарифа:', error);
        alert('Ошибка при активации тарифа. Попробуйте позже.');
    } finally {
        const activateBtn = document.getElementById('activateTariffModalBtn');
        if (activateBtn) {
            activateBtn.innerHTML = '<i class="fas fa-plug"></i> Активировать тариф';
            activateBtn.disabled = false;
        }
    }
}

function showTariffModal() {
    console.log('Открытие модального окна');
    const modal = document.getElementById('tariffModal');
    if (modal) {
        modal.style.display = 'block';
        
        document.querySelectorAll('.tariff-option').forEach(option => {
            option.style.borderColor = '';
            option.style.background = '';
        });
        
        const activateModalBtn = document.getElementById('activateTariffModalBtn');
        if (activateModalBtn) {
            activateModalBtn.style.display = 'none';
        }
        
        localStorage.removeItem('selectedTariff');
    }
}

function closeTariffModal() {
    console.log('Закрытие модального окна');
    const modal = document.getElementById('tariffModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

const style = document.createElement('style');
style.textContent = `
    .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0,0,0,0.5);
    }
    
    .modal-content {
        background-color: white;
        margin: 5% auto;
        padding: 0;
        border-radius: 12px;
        width: 90%;
        max-width: 800px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    }
    
    .modal-header {
        padding: 1.5rem;
        border-bottom: 1px solid #ecf0f1;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
    }
    
    .modal-body {
        padding: 2rem;
    }
    
    .modal-footer {
        padding: 1.5rem;
        border-top: 1px solid #ecf0f1;
        background: #f8f9fa;
        border-radius: 0 0 12px 12px;
        text-align: right;
    }
    
    .tariff-options {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
    }
    
    .tariff-option {
        border: 2px solid #ecf0f1;
        border-radius: 12px;
        padding: 1.5rem;
        transition: all 0.3s ease;
    }
    
    .tariff-option:hover {
        border-color: #3498db;
    }
    
    #activateTariffModalBtn {
        background: #27ae60;
        border-color: #27ae60;
    }
    
    #activateTariffModalBtn:hover {
        background: #219a52;
        border-color: #219a52;
    }
`;
document.head.appendChild(style);