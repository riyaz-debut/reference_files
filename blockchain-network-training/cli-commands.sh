#!/bin/bash
#
# We are going to pass in the generated channel configuration transaction artifact that we created in the Create a 
# Channel Configuration Transaction section (we called it channel.tx) to the orderer as part of the create channel request.
# Now let’s join peer0.org1.example.com to the channel
# Rather than join every peer, we will simply join peer0.org2.example.com so that we can properly update the anchor peer 
# definitions in our channel.
# Update the channel definition to define the anchor peer for Org1 as peer0.org1.example.com
# Now update the channel definition to define the anchor peer for Org2 as peer0.org2.example.com
#
#

echo "Start cli container commands"

# export CHANNEL_NAME=mychannel

echo "Mid of cli container commands"
# the channel.tx file is mounted in the channel-artifacts directory within your CLI container
# as a result, we pass the full path for the file
# we also pass the path for the orderer ca-cert in order to verify the TLS handshake
# be sure to export or replace the $CHANNEL_NAME variable appropriately

peer channel create -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/channel.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
echo "generated channel configuration transaction artifact"

peer channel join -b mychannel.block
echo "Successfully join peer0.org1.example.com to the channel"

CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/users/Admin@wipro.example.com/msp CORE_PEER_ADDRESS=peer0.wipro.example.com:9051 CORE_PEER_LOCALMSPID="WiproMSP" CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/peers/peer0.wipro.example.com/tls/ca.crt peer channel join -b mychannel.block
echo "Successfully join peer0.org2.example.com"

peer channel update -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/TcsMSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
echo "Successfully update the channel definition to define the anchor peer for Org1 as peer0.org1.example.com"

CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/users/Admin@wipro.example.com/msp CORE_PEER_ADDRESS=peer0.wipro.example.com:9051 CORE_PEER_LOCALMSPID="WiproMSP" CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/peers/peer0.wipro.example.com/tls/ca.crt peer channel update -o orderer.example.com:7050 -c $CHANNEL_NAME -f ./channel-artifacts/WiproMSPanchors.tx --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem
echo "Successfully update the channel definition to define the anchor peer for Org2 as peer0.org2.example.com"
