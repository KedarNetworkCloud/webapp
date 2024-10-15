#!/bin/bash
export DEBIAN_FRONTEND=noninteractive
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib
echo 'postgres:kedarapte2004' | sudo chpasswd
sudo -u postgres psql -c "ALTER USER postgres PASSWORD 'kedarapte2004';"
sudo service postgresql start
sudo -u postgres createdb kedardemo
sudo systemctl restart postgresql
