# FACEIT Nightbot

Команда Nightbot, которая выводит ссылку на активную комнату FACEIT игрока.

## Локальный запуск

Требуется Node.js 18 или новее.

```powershell
npm install
$env:FACEIT_API_KEY="ваш_ключ_FACEIT"
$env:FACEIT_NICKNAME="lyalek" # необязательно
npm start
```

Проверка: откройте `http://localhost:3000/room`.

## Nightbot

После публикации сервиса на HTTPS-домене создайте команду с сообщением:

```
$(urlfetch https://ваш-домен/room)
```

Не добавляйте `FACEIT_API_KEY` в исходный код, `.env` или Git-репозиторий.
