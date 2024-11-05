const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express')

const PORT = 3000;
const app = express();
app.use(express.static('public'));

app.get('/',(req,res) =>{
    res.sendFile('index.html');
});

// Запускаємо сервер
app.listen(PORT, () => {
    console.log(`Сервер запущено на http://localhost:${PORT}`);
});
