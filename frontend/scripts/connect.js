const URL_API = "http://localhost:8080/api/v1"

function showNotification(message, type = 'info') {
    const icon = type === 'success' ? '✅' : '❌';
    alert(`${icon} ${message}`);
}

document.addEventListener('DOMContentLoaded', function() {
    const form = document.querySelector("#applicationForm");
    
    if (!form) {
        console.error('Форма не найдена!');
        return;
    }

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const submitBtn = form.querySelector('button[type="submit"]');
        const originText = submitBtn.textContent;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Отправка...';

        const formData = {
            customer_name: document.getElementById('customer_name').value,
            address: document.getElementById('address').value,
            phone: document.getElementById('phone').value,
            plan: document.getElementById('plan').value
        };

        try {
            const response = await fetch(`${URL_API}/applications`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error(`Ошибка сервера: ${response.status}`);
            }

            const data = await response.json();
            showNotification('Заявка успешно отправлена! Номер: ' + data.id, 'success');
            form.reset();
            const appId = data.id;

            // 3. Скачиваем PDF
            const pdfRes = await fetch(`http://localhost:8080/api/v1/applications/${appId}/pdf`);
            const blob = await pdfRes.blob();
            const url = window.URL.createObjectURL(blob);

            const a = document.createElement("a");
            a.href = url;
            a.download = "Заявка.pdf";
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch(error) {
            console.error('Ошибка:', error);
            showNotification('Ошибка отправки: ' + error.message, 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = originText;
        }
    });
});