/boot/firmware/config.txt
disable_overscan=1
hdmi_enable_4kp60=1
hdmi_group=1
hdmi_mode=97
hdmi_drive=2
config_hdmi_boost=7

tty off

sudo systemctl stop getty@tty1.service
sudo systemctl disable getty@tty1.service

update
sudo apt update && sudo apt install -y mpv jq curl

sudo usermod -aG video,render,input,tty pi

sudo mkdir -p /opt/signage/video
sudo chown -R pi:pi /opt/signage

sudo nano /etc/systemd/system/signage-player.service



sudo systemctl daemon-reload
sudo systemctl restart signage-player.service


/opt/signage/sync.sh
