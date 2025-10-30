// balance.js - Функционал пополнения баланса

document.addEventListener('DOMContentLoaded', function() {
    initBalanceFunctionality();
});

function initBalanceFunctionality() {
    console.log('Инициализация функционала пополнения баланса');
    
    // Проверяем авторизацию
    const userData = localStorage.getItem('netlinkUser');
    if (!userData) {
        console.warn('Пользователь не авторизован');
        return;
    }
    
    // Кнопка пополнения баланса
    const topUpBtn = document.querySelector('.btn--white');
    if (topUpBtn) {
        topUpBtn.addEventListener('click', showBalanceModal);
    }

    // Кнопка закрытия модального окна баланса
    const closeBalanceModalBtn = document.getElementById('closeBalanceModalBtn');
    if (closeBalanceModalBtn) {
        closeBalanceModalBtn.addEventListener('click', closeBalanceModal);
    }

    // Кнопка подтверждения оплаты
    const confirmPaymentBtn = document.getElementById('confirmPaymentBtn');
    if (confirmPaymentBtn) {
        confirmPaymentBtn.addEventListener('click', processPayment);
    }

    // Быстрые суммы пополнения
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('preset-amount')) {
            const amount = e.target.getAttribute('data-amount');
            document.getElementById('amount').value = amount;
        }
    });

    // Закрытие модального окна баланса по клику вне его
    window.addEventListener('click', function(e) {
        const balanceModal = document.getElementById('balanceModal');
        if (balanceModal && e.target === balanceModal) {
            closeBalanceModal();
        }
    });
}

// Функции для пополнения баланса
function showBalanceModal() {
    console.log('Открытие модального окна пополнения баланса');
    const modal = document.getElementById('balanceModal');
    if (modal) {
        modal.style.display = 'block';
        // Сбрасываем форму при открытии
        resetBalanceForm();
    }
}

function closeBalanceModal() {
    console.log('Закрытие модального окна пополнения баланса');
    const modal = document.getElementById('balanceModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

function resetBalanceForm() {
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.value = '500';
    }
    
    // Устанавливаем оплату картой по умолчанию
    const cardRadio = document.getElementById('card');
    if (cardRadio) {
        cardRadio.checked = true;
    }
}

function processPayment() {
    const amountInput = document.getElementById('amount');
    const amount = parseInt(amountInput.value);
    
    if (!amount || amount < 1) {
        alert('Введите корректную сумму для пополнения!');
        return;
    }
    
    if (amount < 10) {
        alert('Минимальная сумма пополнения - 10 рублей!');
        return;
    }
    
    if (amount > 50000) {
        alert('Максимальная сумма пополнения - 50,000 рублей!');
        return;
    }
    
    const paymentMethod = document.querySelector('input[name="payment"]:checked');
    if (!paymentMethod) {
        alert('Выберите способ оплаты!');
        return;
    }
    
    const paymentMethods = {
        'card': 'Банковская карта',
        'qiwi': 'QIWI Кошелек', 
        'yoomoney': 'ЮMoney'
    };
    
    const confirmMessage = `Подтвердите пополнение баланса на ${amount} руб.\nСпособ оплаты: ${paymentMethods[paymentMethod.value]}`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    // Имитация процесса оплаты
    simulatePayment(amount, paymentMethod.value);
}

async function simulatePayment(amount, paymentMethod) {
    console.log('Начало процесса оплаты:', { amount, paymentMethod });
    
    // Показываем индикатор загрузки
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
    confirmBtn.disabled = true;
    
    try {
        // Получаем данные пользователя
        const userData = localStorage.getItem('netlinkUser');
        if (!userData) throw new Error('Пользователь не найден');

        const user = JSON.parse(userData);
        const userId = user.id;
        
        console.log('Данные для запроса:', {
            userId,
            amount,
            paymentMethod
        });

        // Отправляем запрос на бекенд
        const response = await fetch(`http://localhost:8080/api/v1/pay/${userId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                amount: amount,
                payment_method: paymentMethod
            })
        });

        console.log('Статус ответа:', response.status);
        console.log('Ответ OK:', response.ok);

        if (!response.ok) {
            let errorMessage = 'Ошибка сервера';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorMessage;
            } catch (e) {
                errorMessage = `HTTP error! status: ${response.status}`;
            }
            throw new Error(errorMessage);
        }

        // Парсим успешный ответ
        const result = await response.json();
        console.log('Успешный ответ от сервера:', result);
        
        // Обновляем баланс на фронтенде
        const newBalance = (user.balance || 0) + amount;
        updateUserBalanceFromServer(newBalance);
        
        // Восстанавливаем кнопку
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        
        // Закрываем модальное окно
        closeBalanceModal();
        
        // Показываем уведомление об успехе
        showPaymentSuccess(amount, paymentMethod);
        
    } catch (error) {
        console.error('Полная ошибка оплаты:', error);
        alert('Ошибка при обработке платежа: ' + error.message);
        
        // Восстанавливаем кнопку при ошибке
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function updateUserBalanceFromServer(newBalance) {
    const balanceElement = document.getElementById('userBalance');
    if (!balanceElement) return;
    
    // Обновляем отображение баланса
    balanceElement.textContent = newBalance.toFixed(2);
    
    // Обновляем данные пользователя в localStorage
    const userData = localStorage.getItem('netlinkUser');
    if (userData) {
        const user = JSON.parse(userData);
        user.balance = newBalance;
        localStorage.setItem('netlinkUser', JSON.stringify(user));
    }
    
    // Обновляем статус баланса
    updateBalanceStatus(newBalance);
}

function updateBalanceStatus(balance) {
    const balanceStatus = document.querySelector('.balance-status');
    if (!balanceStatus) return;
    
    // Обновляем текст в зависимости от баланса
    if (balance >= 0) {
        balanceStatus.innerHTML = `
            <i class="fas fa-check-circle status-positive"></i>
            <span>Баланс положительный</span>
            <small>Услуги доступны</small>
        `;
    } else {
        balanceStatus.innerHTML = `
            <i class="fas fa-exclamation-triangle status-warning"></i>
            <span>Баланс отрицательный</span>
            <small>Требуется пополнение</small>
        `;
    }
}

function showPaymentSuccess(amount, paymentMethod) {
    // Создаем уведомление об успехе
    const successNotification = document.createElement('div');
    successNotification.className = 'payment-success card card--gradient';
    successNotification.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        z-index: 10001;
        min-width: 300px;
        animation: slideInRight 0.5s ease-out;
    `;
    
    const paymentMethodsText = {
        'card': 'Банковской картой',
        'qiwi': 'QIWI Кошельком',
        'yoomoney': 'ЮMoney'
    };
    
    successNotification.innerHTML = `
        <div class="success-content">
            <i class="fas fa-check-circle"></i>
            <div class="success-text">
                <h4>Оплата прошла успешно! ✅</h4>
                <p>Сумма: <strong>${amount} руб.</strong></p>
                <p>Способ: ${paymentMethodsText[paymentMethod]}</p>
                <small>Баланс обновлен</small>
            </div>
        </div>
    `;
    
    document.body.appendChild(successNotification);
    
    // Автоматически скрываем через 5 секунд
    setTimeout(() => {
        successNotification.style.animation = 'slideOutRight 0.5s ease-in';
        setTimeout(() => {
            if (successNotification.parentNode) {
                successNotification.parentNode.removeChild(successNotification);
            }
        }, 500);
    }, 5000);
}

// Добавляем CSS стили для функционала баланса
const balanceStyles = document.createElement('style');
balanceStyles.textContent = `
    .balance-form .form-group {
        margin-bottom: 1.5rem;
    }
    
    .balance-form label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 500;
        color: #2c3e50;
    }
    
    .form-input {
        width: 100%;
        padding: 0.75rem;
        border: 2px solid #ecf0f1;
        border-radius: 8px;
        font-size: 1rem;
        margin-bottom: 1rem;
    }
    
    .form-input:focus {
        border-color: #3498db;
        outline: none;
    }
    
    .amount-presets {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 0.5rem;
        margin-top: 1rem;
    }
    
    .preset-amount {
        padding: 0.5rem;
        font-size: 0.9rem;
    }
    
    .payment-methods {
        margin-top: 1.5rem;
    }
    
    .payment-methods h4 {
        margin-bottom: 1rem;
        color: #2c3e50;
    }
    
    .payment-option {
        display: flex;
        align-items: center;
        margin-bottom: 0.75rem;
        padding: 0.75rem;
        border: 2px solid #ecf0f1;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
    }
    
    .payment-option:hover {
        border-color: #3498db;
        background: #f8f9fa;
    }
    
    .payment-option input[type="radio"] {
        margin-right: 0.75rem;
    }
    
    .payment-option label {
        display: flex;
        align-items: center;
        margin: 0;
        cursor: pointer;
        flex: 1;
    }
    
    .payment-option i {
        margin-right: 0.5rem;
        width: 20px;
        color: #3498db;
    }
    
    .payment-success .success-content {
        display: flex;
        align-items: center;
        gap: 1rem;
    }
    
    .payment-success i {
        font-size: 2rem;
        color: white;
    }
    
    .success-text h4 {
        margin: 0 0 0.5rem 0;
        color: white;
    }
    
    .success-text p {
        margin: 0 0 0.25rem 0;
        color: white;
    }
    
    .success-text small {
        color: rgba(255,255,255,0.8);
    }
    
    @keyframes slideInRight {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOutRight {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(balanceStyles);