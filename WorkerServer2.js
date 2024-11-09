const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const express = require('express');
const { Pool } = require('pg');

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

const server = https.createServer(options, app);
const wss = new WebSocket.Server({ server , agent: httpsAgent});


// Маршрут для отримання завдання на обчислення

function calculateArea(func, start, end, step, ws) {
    let area = 0;
    let progress = 0;

    // Обчислення значення на кожному кроці
    for (let x = start; x < end; x += step) {
        const y = eval(func.replace(/x/g, x)); // Виконання функції
        area += y * step;

        // Оновлення прогресу
        progress = ((x - start) / (end - start)) * 100;
        ws.send(JSON.stringify({ type: 'progress', progress: Math.round(progress) }));
    }
    ws.send(JSON.stringify({ type: 'taskComplete', result: area }));
    return area;
}

wss.on('connection', (ws) => {
    console.log('Worker server connected');

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        console.log(data);
        if (data.type === 'taskRequest') {
            let { userId, functionInput, startInput, endInput, step } = data.taskData;

            startInput = parseFloat(startInput);
            endInput = parseFloat(endInput);
            step = parseFloat(step);

            if (!functionInput || isNaN(startInput) || isNaN(endInput) || isNaN(step)) {
                return ws.send(JSON.stringify({ error: "Invalid input parameters" }));
            }

            try {
                const area = calculateArea(functionInput, startInput, endInput, step, ws);

                try {
                    // Вставка даних у базу даних
                    const taskJson = JSON.stringify({functionData: functionInput,start: startInput, end: endInput, step: step, result: area});
                    const result = await pool.query(
                    'INSERT INTO tasks (user_id, task_data) VALUES ($1, $2)',
                    [userId,taskJson]
                    );
                } 
                catch (err) 
                {
                    console.error('Error inserting task:', err);
                    res.status(500).send('Server error');
                }

            } catch (error) {
                console.error('Calculation error:', error);
                ws.send(JSON.stringify({ error: 'Error in calculation' }));
            }
        }
    });
});

server.listen(3002, () => {
    console.log(`Сервер запущено на https://localhost:3002`);
});
