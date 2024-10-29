#!/bin/bash

# Define the region and architecture
REGION="us-east-1"
ARCH="amd64" 

# Update package list
sudo apt-get update -y

# Download the latest CloudWatch agent .deb package for Ubuntu
wget https://amazoncloudwatch-agent.${REGION}.s3.${REGION}.amazonaws.com/ubuntu/${ARCH}/latest/amazon-cloudwatch-agent.deb

# Install the downloaded package
sudo dpkg -i amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Enable the CloudWatch Agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent