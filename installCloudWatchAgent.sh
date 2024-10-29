#!/bin/bash
# Update package list and install required software
sudo apt-get update -y

# Install necessary tools for downloading and installing the CloudWatch Agent
sudo apt-get install -y curl

# Download the Amazon CloudWatch Agent package
curl -O https://s3.us-west-2.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb

# Install the downloaded package
sudo dpkg -i amazon-cloudwatch-agent.deb

# Clean up the downloaded package
rm amazon-cloudwatch-agent.deb

# Copy the default CloudWatch Agent configuration file to the appropriate location
# Note: Ensure this configuration file exists or create it as needed.
sudo cp /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json /etc/amazon-cloudwatch-agent.json

# Start the CloudWatch Agent using the provided configuration
sudo amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/etc/amazon-cloudwatch-agent.json -s

# Enable the CloudWatch Agent to start on boot
sudo systemctl enable amazon-cloudwatch-agent
