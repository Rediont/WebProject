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

let isPaused = false;
let isCancelled = false;


function pause() {
    isPaused = true;
}

function resume() {
    isPaused = false;
}

function cancelTask() {
    isCancelled = true;
}
 
function calculateArea(func, start, end, step, ws) {
    let area = 0;
    let progress = 0;
    let currentX = start;

    // Функція для обчислення одного кроку
    function computeStep() {
        // Якщо завдання скасовано, припиняємо
        if (isCancelled) {
            console.log("Task cancelled");
            ws.send(JSON.stringify({ type: 'taskCancelled' }));
            return;
        }

        // Якщо завдання на паузі, ставимо таймер для повторної перевірки через 100 мс
        if (isPaused) {
            console.log('Task paused');
            setTimeout(computeStep, 100); // Перевірка кожні 100 мс
            return;
        }

        // Обчислюємо значення для поточного кроку
        const y = eval(func.replace(/x/g, currentX)); // Виконання функції
        area += y * step;

        // Оновлення прогресу
        progress = ((currentX - start) / (end - start)) * 100;
        ws.send(JSON.stringify({ type: 'progress', progress: Math.round(progress) }));

        // Оновлюємо значення для наступного кроку
        currentX += step;

        // Якщо досягли кінця, завершуємо
        if (currentX < end) {
            setTimeout(computeStep, 0);
        } else {
            // Коли обчислення завершено, відправляємо результат та прогрес
            ws.send(JSON.stringify({ type: 'taskComplete', funcRes: func, startRes:start, endRes: end, stepRes: step, result: area, progress: 100 }));

            // Повертаємо результат через проміс, щоб обробити його в основній функції
            return area;
        }
    }

    // Запуск обчислень
    return new Promise((resolve) => {
        resolve(computeStep());
    });
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
                const area = await calculateArea(functionInput, startInput, endInput, step, ws);
                if(isCancelled === true){
                    console.log('abort')
                    ws.send(JSON.stringify({ error: 'Abort' }));
                } 
            } catch (error) {
                console.error('Calculation error:', error);
                ws.send(JSON.stringify({ error: 'Error in calculation' }));
            }
        }
        else{
            if(data.action === 'stop'){
                pause();
            }
            if(data.action === 'resume'){
                resume();
            }
            if(data.action === 'abort'){
                cancelTask();
            }
        }
    });
});

server.listen(3002, () => {
    console.log(`Сервер запущено на https://localhost:3002`);
});
