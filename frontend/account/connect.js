 
const API_BASE = 'http://localhost:8080/api/v1';

const tabs = document.querySelectorAll('.tab');
    const forms = document.querySelectorAll('.form');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        forms.forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
      });
    });

    
document.getElementById('registerForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation(); 

        const formData = {
            name: document.getElementById('reg_name').value,
            email: document.getElementById('reg_email').value,
            phone: document.getElementById('reg_phone').value,
            password: document.getElementById('reg_password').value
        };

        
        if (!formData.name || !formData.email || !formData.phone || !formData.password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Регистрация успешна! Теперь вы можете войти.');
                
                
                tabs.forEach(t => t.classList.remove('active'));
                forms.forEach(f => f.classList.remove('active'));
                document.querySelector('[data-tab="login"]').classList.add('active');
                document.getElementById('loginForm').classList.add('active');
                
                
                this.reset();
            } else {
                alert('Ошибка: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка соединения с сервером');
        }
    });

    
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        e.stopPropagation(); 

        const formData = {
            email: document.getElementById('login_email').value,
            password: document.getElementById('login_password').value
        };

        
        if (!formData.email || !formData.password) {
            alert('Пожалуйста, заполните все поля');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok) {
                localStorage.setItem('netlinkUser', JSON.stringify(result.user));
                localStorage.setItem('netlinkLoggedIn', 'true');
                
                alert('Вход выполнен успешно!');
                
                window.location.href = './dashboard/dashboard.html';
            } else {
                alert('Ошибка: ' + result.error);
            }
        } catch (error) {
            console.error('Ошибка:', error);
            alert('Ошибка соединения с сервером');
        }
    });

    
    
    
    
    
    