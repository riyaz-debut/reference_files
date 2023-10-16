#!/bin/bash
#
# commands to generate crypto material
# Then, we’ll invoke the configtxgen tool to create the orderer genesis block
# Next, we need to create the channel transaction artifact
# Next, we will define the anchor peer for Org1 on the channel that we are constructing.
# Now, we will define the anchor peer for Org2 on the same channel
# 
#

echo "Start generating crypto material"
../bin/cryptogen generate --config=./crypto-config.yaml

export FABRIC_CFG_PATH=$PWD
echo "Successfully set the path for genesis block"

../bin/configtxgen -profile TwoOrgsOrdererGenesis -channelID byfn-sys-channel -outputBlock ./channel-artifacts/genesis.block
echo "Successfully invoke the configtxgen tool to create the orderer genesis block"

export CHANNEL_NAME=mychannel  && ../bin/configtxgen -profile TwoOrgsChannel -outputCreateChannelTx ./channel-artifacts/channel.tx -channelID $CHANNEL_NAME
echo "Successfully create the channel transaction artifact"

../bin/configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/TcsMSPanchors.tx -channelID $CHANNEL_NAME -asOrg TcsMSP
echo "Successfully define the anchor peer for Org1 on the channel that we are constructing"

../bin/configtxgen -profile TwoOrgsChannel -outputAnchorPeersUpdate ./channel-artifacts/WiproMSPanchors.tx -channelID $CHANNEL_NAME -asOrg WiproMSP
echo "Successfully define the anchor peer for Org2 on the same channel"

docker-compose -f docker-compose-cli.yaml up -d 
echo "Successfully up the network network for cli command"

docker exec -it cli bash
echo "Successfully enter into cli container"

