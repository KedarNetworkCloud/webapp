#!/bin/bash
sudo mkdir -p /opt/myapp
sudo chown -R csye6225:csye6225 /opt/myapp  # Change ownership of the directory
sudo mv /tmp/webApp.zip /opt/myapp/
sudo apt-get install -y unzip
sudo unzip /opt/myapp/webApp.zip -d /opt/myapp
sudo chown -R csye6225:csye6225 /opt/myapp/webapp-fork