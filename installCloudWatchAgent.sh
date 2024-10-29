#!/bin/bash

# Update package list
sudo apt-get update -y

# Download the latest CloudWatch agent .deb package for Ubuntu
wget https://amazoncloudwatch-agent.s3.amazonaws.com/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install the downloaded package
sudo dpkg -i amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Copy the configuration file to the appropriate location
sudo cp /opt/myapp/config/cloudwatch-config.json /etc/amazon-cloudwatch-agent.json

# Start the CloudWatch Agent using the provided configuration
sudo amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/etc/amazon-cloudwatch-agent.json -s

# Enable the CloudWatch Agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent

