FROM node:16.16.0

RUN mkdir -p /hyperledger-sdk

WORKDIR /hyperldger-sdk

COPY package*.json ./

RUN npm install

COPY . .

# EXPOSE 3000

# CMD [ "npm", "start" ]

