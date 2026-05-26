# R-pi TV

Raspberry Pi 4 + Docker Compose

## как работает
* **Backend:** Nginx + File Browser (веб-интерфейс)
* **Client:** cron-скрипт каждые 2 минуты проверяет SHA-256 файлов на сервере и синхронизирует кэш. Плеер `cvlc` крутит плейлист по кругу, воспроизведение локальное, отвал сервера телек не гасит. 

---

## 1. Настройка сервера

### Что надо
* Установленный Docker Compose (Linux)

### Пошаговый запуск
1. Git clone репо
2. Дать скрипту права на запуск
   ```bash
   chmod +x generate_manifest.sh
   ```
3. Очистить ./data/media
4. ```bash
    docker compose up -d --build
    ```
5. Интерфейс загрузки файлов тут http://<ip.addr.srv>:8002/admin
6. Закинь тестовый mp4 и подожди минуту
7. ```bash 
    curl -i -u "pi_client:121506e33ef593ac9cd" http://ip.addr.srv/media/manifest.json
    ```
должна отдать список файлов с хэшами

### 2. Настройка малины
1. Скачать архив с прошивкой https://drive.google.com/file/d/1f_P0lJFfm84YWR3wLBmTV2k3PRGuLNjO/view?usp=sharing
2. Записать на карту памяти с помощью dd или Raspberry Pi Imager. 
    ```bash
    gunzip -c rpi4-tv-v1.img.gz | sudo dd of=/dev/diskX bs=4m
    ```
3. Всё включить. SSH username `pi`

####
Внутри установлен Zabbix Agent

![grafana](https://github.com/makssly/rpitv2rc/blob/main/grafana.jpg?raw=true)

### TODO
- [x] (пока) не воспроизводит 4К видео

UPD. И не будет. 4К ведет себя крайне нестабильно и тормозит. Захардкодил принудительный даунскейл в 1080.
- [ ] Нормальная админка
- [ ] Телеметрия с девайса в админку

