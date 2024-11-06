const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();
app.use(express.json()); // Дозволяємо парсинг JSON

// Завантажуємо ключ і сертифікат
const options = {
    key: fs.readFileSync('C:/Users/user/WP_sert/private.key'),
    cert: fs.readFileSync('C:/Users/user/WP_sert/certificate.pem')
};

// Функція для обчислення площі криволінійної трапеції методом прямокутників
function calculateArea(func, start, end, step) {
    let area = 0;
    for (let x = start; x < end; x += step) {
        // Обчислюємо значення функції у точці x
        const y = eval(func.replace(/x/g, x)); // Замінюємо 'x' у функції на значення
        area += y * step;
    }
    return area;
}

// Маршрут для отримання завдання на обчислення
app.post('/calculate-area', (req, res) => {
    const { func, start, end, step } = req.body;

    if (!func || start == null || end == null || step == null) {
        return res.status(400).json({ error: "Відсутні необхідні параметри" });
    }

    try {
        const area = calculateArea(func, start, end, step);
        res.json({ area });
    } catch (error) {
        res.status(500).json({ error: "Помилка обчислення: перевірте правильність функції" });
    }
});

// Запускаємо HTTPS-сервер
https.createServer(options, app).listen(3002, () => {
    console.log('Сервер запущено на https://localhost:3002');
});
