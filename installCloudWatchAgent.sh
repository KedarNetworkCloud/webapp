"sudo yum update -y",
"sudo yum install -y amazon-cloudwatch-agent",
"sudo cp /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json /etc/amazon-cloudwatch-agent.json",
"sudo amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -c file:/etc/amazon-cloudwatch-agent.json -s",
"sudo systemctl enable amazon-cloudwatch-agent"