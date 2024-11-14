#!/bin/bash

# Update package list
sudo apt-get update -y

# Download the latest CloudWatch agent .deb package for Ubuntu
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb -O amazon-cloudwatch-agent.deb
if [ $? -ne 0 ]; then
  echo "Failed to download CloudWatch Agent. Exiting."
  exit 1
fi

# Install the downloaded package and handle errors
sudo dpkg -i amazon-cloudwatch-agent.deb || { echo "dpkg failed"; exit 1; }
rm amazon-cloudwatch-agent.deb

# Check if the config file exists
if [ ! -f /opt/myapp/config/cloudwatch-config.json ]; then
  echo "Configuration file not found. Exiting."
  exit 1
fi

# Copy the configuration file to the appropriate location
sudo cp /opt/myapp/config/cloudwatch-config.json /etc/amazon-cloudwatch-agent.json

# Start the CloudWatch Agent using the provided configuration
sudo amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/etc/amazon-cloudwatch-agent.json -s

# Enable the CloudWatch Agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent

# Start the CloudWatch Agent service
sudo systemctl start amazon-cloudwatch-agent

# Check the status of the CloudWatch Agent
sudo systemctl status amazon-cloudwatch-agent
