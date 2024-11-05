const http = require('http');
const fs = require('fs');
const path = require('path');


// Визначаємо порт, на якому сервер буде працювати
const PORT = 3000;


// Створюємо сервер
const server = http.createServer((req, res) => {
    // Налаштування на обслуговування статичних файлів з папки "public"
    if (req.url.startsWith('/public/')) {
        const filePath = path.join(__dirname, req.url);
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Файл не знайдено');
            } else {
                const ext = path.extname(filePath);
                let contentType = 'text/plain';

                // Встановлення правильного Content-Type для різних типів файлів
                if (ext === '.html') contentType = 'text/html';
                else if (ext === '.css') contentType = 'text/css';
                else if (ext === '.js') contentType = 'application/javascript';

                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            }
        });
    } else if (req.url === '/register') {
        const filePath = path.join(__dirname, 'public', 'index.html');
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Server Error');
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
