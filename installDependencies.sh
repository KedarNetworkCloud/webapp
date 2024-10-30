#!/bin/bash
cd /opt/myapp/ || exit 1

# Remove node_modules with root privileges
sudo rm -rf node_modules

# Install dependencies with root privileges
sudo npm install
sudo npm install bcrypt@5.1.1
sudo npm install dotenv
sudo npm install multer
sudo npm install multer-s3
sudo npm install aws-sdk
sudo npm install node-statsd
sudo npm install winston
sudo npm install logger

