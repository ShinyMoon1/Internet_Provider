// balance.js - Функционал пополнения баланса

document.addEventListener('DOMContentLoaded', function() {
    initBalanceFunctionality();
});

function initBalanceFunctionality() {
    console.log('Инициализация функционала пополнения баланса');
    
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
    // Показываем индикатор загрузки
    const confirmBtn = document.getElementById('confirmPaymentBtn');
    const originalText = confirmBtn.innerHTML;
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обработка...';
    confirmBtn.disabled = true;
    
    try {
        // Отправляем запрос на сервер для пополнения баланса
        const userData = localStorage.getItem('netlinkUser');
        if (!userData) throw new Error('Пользователь не найден');

        const user = JSON.parse(userData);
        
        const response = await fetch('/api/v1/applications/topup-balance', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: user.id,
                amount: amount,
                payment_method: paymentMethod
            })
        });

        if (!response.ok) {
            throw new Error('Ошибка сервера');
        }

        const result = await response.json();
        
        // Обновляем баланс на основе ответа сервера
        updateUserBalanceFromServer(result.new_balance);
        
        // Восстанавливаем кнопку
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
        
        // Закрываем модальное окно
        closeBalanceModal();
        
        // Показываем уведомление об успехе
        showPaymentSuccess(amount, paymentMethod);
        
    } catch (error) {
        console.error('Ошибка оплаты:', error);
        alert('Ошибка при обработке платежа. Попробуйте позже.');
        
        // Восстанавливаем кнопку при ошибке
        confirmBtn.innerHTML = originalText;
        confirmBtn.disabled = false;
    }
}

function updateUserBalanceFromServer(newBalance) {
    const balanceElement = document.getElementById('userBalance');
    if (!balanceElement) return;
    
    balanceElement.textContent = newBalance;
    
    // Обновляем данные пользователя
    const userData = localStorage.getItem('netlinkUser');
    if (userData) {
        const user = JSON.parse(userData);
        user.balance = newBalance;
        localStorage.setItem('netlinkUser', JSON.stringify(user));
    }
    
    // Обновляем статус баланса (если функция существует)
    if (typeof updateBalanceStatus === 'function') {
        updateBalanceStatus(newBalance);
    }
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