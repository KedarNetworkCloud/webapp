#!/bin/bash
sudo mv /opt/myapp/kedarwebapp.service /etc/systemd/system/kedarwebapp.service
sudo chown root:root /etc/systemd/system/kedarwebapp.service
#sudo systemctl daemon-reload
#sudo systemctl enable kedarwebapp.service
#sudo systemctl start kedarwebapp.service
