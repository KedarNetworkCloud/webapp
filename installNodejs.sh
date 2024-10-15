#!/bin/bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs=18.17.1-1nodesource1
sudo npm install -g npm@9.6.7
node -v
npm -v
