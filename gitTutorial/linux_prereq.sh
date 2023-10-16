#!/bin/bash

# update the packages

sudo yum update

# install docker 

sudo yum install docker

sleep 1

# Add group membership for the default ec2-user so you can run all docker commands without using the sudo command:

sudo usermod -a -G docker ec2-user

id ec2-user

newgrp docker

# Install docker-compose 

# Get pip3 
sudo yum install python3-pip
 
# Then run any one of the following

sudo pip3 install docker-compose 

# Enable docker service at AMI boot time:

sudo systemctl enable docker.service

# Start the docker service

sudo systemctl start docker.service

# Install curl 

sudo yum install php-curl

# Install Zip

sudo yum install zip

# Install node version manager (nvm) by typing the following at the command line.

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash

# Download node js 16 version

curl -sL https://rpm.nodesource.com/setup_16.x | sudo bash -

# Install nodejs 

sudo yum install -y nodejs

# install latest npm 

sudo npm install npm@latest -g

# install jq tool

sudo yum install jq

# install pm2 module 

sudo npm install pm2 -g

# install git 

sudo yum install git -y








