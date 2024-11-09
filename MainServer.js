const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const express = require('express')
const { Pool } = require('pg');
const axios = require('axios');

const PORT = 3000;
const app = express();
app.use(express.static('public'));
app.use(express.json());

const pool = new Pool({
    user: 'postgres',      // Ваше ім'я користувача
    host: 'localhost',           // Хост (зазвичай 'localhost')
    database: 'WebProject',   // Назва бази даних
    password: 'mi20051409',    // Ваш пароль
    port: 5432,                  // Порт (зазвичай 5432)
});

const sslOptions = {
    key: fs.readFileSync('C:/Users/user/WP_sert/private.key'),   // Ваш приватний ключ
    cert: fs.readFileSync('C:/Users/user/WP_sert/certificate.pem'),  // Ваш сертифікат
};

const httpsAgent = new https.Agent({  
    ca: fs.readFileSync('C:/Users/user/WP_sert/certificate.pem'),
    rejectUnauthorized: false
});

// Експортуємо пул з'єднань
module.exports = pool;
//зв'язки
const server = https.createServer(sslOptions, app);
const wss = new WebSocket.Server({ server , agent: httpsAgent});

app.get('/',(req,res) =>{
    res.sendFile('index.html');
});

app.post('/login-message', async (req, res) => {
    const { loginName, loginPassword } = req.body; // Отримуємо дані з запиту
    console.log("Отримане ім'я:", loginName, "Пароль:", loginPassword); // Виводимо в консоль

    try {
        // Вибірка даних користувача з бази даних, включаючи id та пароль
        const result = await pool.query(
            'SELECT id, password FROM Users WHERE username = $1',
            [loginName]
        );

        if (result.rows.length > 0) 
            {
            const user = result.rows[0]; // Отримуємо дані користувача
            if (loginPassword === user.password) 
            {
                res.status(201).json({ message: 'Login successful', userId: user.id });
            } 
            else 
            {
                res.status(401).send('Incorrect password');
            }
        } 
        else 
        {
            res.status(404).send('User not found');
        }
    } 
    catch (err) 
    {
        console.error('Error during login:', err);
        res.status(500).send('Server error');
    }
});

app.post('/register-message',async (req,res)=>{
    const { registerName, registerPassword } = req.body; // Отримуємо дані з запиту
    console.log("Отримане ім'я:", registerName, "Пароль:", registerPassword); // Виводимо в консоль

    try {
        // Вставка даних у базу даних
        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING *',
            [registerName, registerPassword]
        );

        const newUser = result.rows[0]; // Отримуємо вставленого користувача
        res.status(201).json(newUser);   // Відправляємо відповідь клієнту
    } 
    catch (err) 
    {
        console.error('Error inserting user:', err);
        res.status(500).send('Server error');
    }
});

const ServerArr = ['wss://localhost:3001','wss://localhost:3002'];
const IsWorking = [false,false];
const TaskQueue = [];
const MAX_QUEUE = 5;

let clients = [];

wss.on('connection', (ws) => {
    console.log('Client connected');
    clients.push(ws);

    ws.on('message', async (message) => {
        const data = JSON.parse(message);
        console.log(data);

        const availableIndex = IsWorking.findIndex(status => !status);

        if (data.type === 'taskRequest') {
            const { userId, functionInput, startInput, endInput, step } = data.taskData;

            if (availableIndex !== -1) {
                IsWorking[availableIndex] = true;
                const serverUrl = ServerArr[availableIndex];

                const workerWs = new WebSocket(serverUrl, { agent: httpsAgent });

                workerWs.on('open', () => {
                    workerWs.send(JSON.stringify({
                        type: 'taskRequest',
                        taskData: { userId, functionInput, startInput, endInput, step }
                    }));
                });

                workerWs.on('message',async (response) => {
                    const workerData = JSON.parse(response);
                    console.log(workerData);
                    if (workerData.type === 'progress') {
                        ws.send(JSON.stringify({
                            type: workerData.type,
                            progress: workerData.progress
                        }));
                    } else {
                        IsWorking[availableIndex] = false;
                        ws.send(JSON.stringify({
                            type: 'taskComplete',
                            result: workerData.result,
                            progress: 100
                        }));

                        try{
                            const taskJson = JSON.stringify({functionData: workerData.funcRes,start: workerData.startRes, end: workerData.endRes, step: workerData.stepRes, result: workerData.result});
                            const result = await pool.query(
                            'INSERT INTO tasks (user_id, task_data) VALUES ($1, $2)',
                            [userId,taskJson]
                            );
                        }
                        catch(error){
                            console.error('Error inserting task:', error);
                            res.status(500).send('Server error');
                        }
                    }
                });

                workerWs.on('close', () => {
                    console.log('Worker server connection closed');
                });

                ws.taskWorker = workerWs; // Зберігаємо WebSocket робочого сервера
            } else {
                if (TaskQueue.length < MAX_QUEUE) {
                    TaskQueue.push({ ws, taskData: { userId, functionInput, startInput, endInput, step } });
                    console.log('Task added to queue');
                } else {
                    ws.send(JSON.stringify({ type: 'queueFull', message: 'Task queue is full' }));
                }
            }
        } else if (data.type === 'taskControl') {
            const { userId, action } = data;

            if (ws.taskWorker && ws.taskWorker.readyState === WebSocket.OPEN) {
                ws.taskWorker.send(JSON.stringify({
                    type: 'taskControl',
                    action,
                    userId
                }));
            } else {
                ws.send(JSON.stringify({ type: 'error', message: 'No active task to control' }));
            }
        }
    });

    ws.on('close', () => {
        clients = clients.filter(client => client !== ws);
        if (ws.taskWorker) {
            ws.taskWorker.close();
        }
    });
});


app.post('/update-task-list', async(req,res)=>{
    const userId = req.body.userId;
    try{
        const result = await pool.query(
            'SELECT user_id,task_data FROM tasks WHERE user_id = $1',
            [userId]
        );
        
        res.json(result.rows);
    }
    catch(error){
        console.error('Error fetching tasks:', error);
        res.status(500).send("помилка сервера")
    }
});



server.listen(PORT, () => {
    console.log(`Сервер запущено на https://localhost:${PORT}`);
});
