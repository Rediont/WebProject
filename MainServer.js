const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express')
const { Pool } = require('pg');

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

// Експортуємо пул з'єднань
module.exports = pool;

const server = https.createServer(sslOptions, app);

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

app.post('/task-panel',async (req,res)=>{
    const { userName } = req.body; // Отримуємо дані з запиту
    console.log("Отримане ім'я:", registerName, "Пароль:", registerPassword); // Виводимо в консоль

    try {
        // Вставка даних у базу даних
        const result = await pool.query(
            'SELECT * FROm users WHERE username = $1',
            [userName]
        );



        res.status(201).json(newUser);   // Відправляємо відповідь клієнту
    } 
    catch (err) 
    {
        console.error('Error inserting user:', err);
        res.status(500).send('Server error');
    }
});

// Запускаємо сервер
server.listen(PORT, () => {
    console.log(`Сервер запущено на https://localhost:${PORT}`);
});
