# R-pi TV

Raspberry Pi 4 + Docker Compose

## как работает
* **Backend:** Nginx + File Browser (веб-интерфейс)
* **Client (Pi):** cron-скрипт каждые 2 минуты проверяет SHA-256 файлов и синхронизирует кэш. Плеер `cvlc` крутит плейлист по кругу

---

## 1. Настройка сервера

### Что надо
* Установленный Docker Compose (Linux)

### Пошаговый запуск
1. Git clone репо
2. Дать скрипту права на запуск
   ```bash
   chmod +x generate_manifest.sh
3. Очистить ./data/media
4. ```bash
    docker compose up -d --build
5. Интерфейс загрузки файлов тут http://<ip.addr.srv>:8002/admin
6. Закинь тестовый mp4 и подожди минуту
7. ```bash
curl -i -u "pi_client:121506e33ef593ac9cd" http://ip.addr.srv/media/manifest.json
    должна отдать список файлов с хэшами

### Настройка малины
1. Скачать архив с прошивкой
2. Записать на карту памяти с помощью dd или Raspberry Pi Imager. 
3. Всё включить