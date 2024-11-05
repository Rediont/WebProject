const http = require('http');
const fs = require('fs');
const mysql = require('mysql2');

// Визначаємо порт, на якому сервер буде працювати
const PORT = 3000;

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'yourpassword',
  database: 'mydatabase'
});

connection.connect((err) => {
  if (err) {
    console.error('Помилка підключення до MySQL:', err);
    return;
  }
  console.log('Підключено до MySQL');
});

// Створюємо сервер
const server = http.createServer((req, res) => {
    // Визначаємо, що робити залежно від URL
    if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Вітаємо на головній сторінці!');
    } else if (req.url === '/register') {
        // Читаємо HTML-файл для сторінки реєстрації
        fs.readFile('index.html', (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Помилка сервера');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Сторінку не знайдено.');
    }
});

// Запускаємо сервер
server.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});
