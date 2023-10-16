First login to the server using credentials
and install the prerequisites given below to setup,run network on machine  


## Check for updates
`sudo apt-get update`
*** This is use to keep all of packages up to date in Debian or a Debian-based Linux distribution.


## Install docker engine
`sudo apt install docker.io`
Use to install docker engine on system to manages all the containers.


## Install docker-compose service
`sudo apt install docker-compose`
Use this to install docker-compose tool (helps running docker ca,network files for organizations).


## Install nodejs
`sudo apt install nodejs`
It will install nodejs on machine.


## Install npm 
`sudo apt install npm`
It will install npm(node packkage manager) in machine to downloads node packages and their dependencies.


## Install json query langauge tool 
`sudo apt install jq`
this will install jq tool in machine, used to transform JSON data into a more readable format and print it to the standard output on Linux. 


## Enable docker service
`sudo systemctl enable docker`
This command is used to enable docker service on machine 



## Make user run docker commands without sudo 
`sudo usermod -a -G docker ubuntu`
This is used to add user to docker group and granting permissions to run docker commands as normal user without using sudo. 
After this ,just exit and re login to machine to take this into effect. 



## Move to home directory  
When logged into the machine again just type the following command to move into user home directory
`cd /home/ubuntu`


## Download fabric binaries
*** After moving to /home/ubuntu directory , 
download fabric binaries in home directory /var/home/ubuntu
using this command :-
`curl -sSL https://bit.ly/2ysbOFE | bash -s`


## Set fabric binaries path
Afetr downloading the fabric-binaries , add fabric-samples binaries folder path to /.profile file using command:-

sudo /bin/sh -c 'echo "
PATH="/home/ubuntu/fabric-samples/bin:$PATH"
" >> ~/.profile'

Next, refresh your profile by running the following command:

`source ~/.profile`
