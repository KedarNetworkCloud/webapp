#!/bin/bash

# Install curl if it's not already installed
if ! command -v curl &> /dev/null; then
    sudo apt-get update && sudo apt-get install -y curl
fi

# Set up NodeSource repository for Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -

# Install Node.js
sudo apt-get install -y nodejs=18.17.1-1nodesource1

# Install npm globally
sudo npm install -g npm@9.6.7

# Print versions to verify installation
node -v
npm -v