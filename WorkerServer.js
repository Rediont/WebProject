const https = require('https');
const fs = require('fs');
const express = require('express');

const app = express();
app.use(express.json());

const pool = new Pool({
    user: 'postgres',      // Ваше ім'я користувача
    host: 'localhost',           // Хост (зазвичай 'localhost')
    database: 'WebProject',   // Назва бази даних
    password: 'mi20051409',    // Ваш пароль
    port: 5432,                  // Порт (зазвичай 5432)
});

module.exports = pool;

const options = {
    key: fs.readFileSync('C:/Users/user/WP_sert/private.key'),
    cert: fs.readFileSync('C:/Users/user/WP_sert/certificate.pem')
};

const httpsAgent = new https.Agent({  
    ca: fs.readFileSync('C:/Users/user/WP_sert/certificate.pem')
});

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
    let { functionInput, startInput, endInput, step } = req.body;

    startInput = parseFloat(startInput);
    endInput = parseFloat(endInput);
    step = parseFloat(step);

    if (!functionInput || isNaN(startInput) || isNaN(endInput) || isNaN(step)) {
        return res.status(400).json({ error: "Відсутні необхідні параметри або невірний формат" });
    }

    try {
        const area = calculateArea(functionInput, startInput, endInput, step);
        console.log(area);
        res.status(201).json({ message: 'success', result: area });
    } catch (error) {
        console.log(error)
        res.status(500).json({ error: "Помилка обчислення: перевірте правильність функції" });
    }
});


// Запускаємо HTTPS-сервер
https.createServer(options, app).listen(3001, () => {
    console.log('Сервер запущено на https://localhost:3001');
});
