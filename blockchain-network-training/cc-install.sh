#!/bin/bash
#
# First, install the sample Go, Node.js or Java chaincode onto the peer0 node in Org1
# Modify the following four environment variables to issue the install command against peer0 in Org2:
# Now install the sample Go, Node.js or Java chaincode onto a peer0 in Org2. 
# Next, instantiate the chaincode on the channel
#
# Let’s query for the value of a to make sure the chaincode was properly instantiated and the state DB 
# was populated. The syntax for query is as follows:
#
# Now let’s move 10 from a to b. This transaction will cut a new block and update the state DB. The 
# syntax for invoke is as follows
#
# Let’s confirm that our previous invocation executed properly. We initialized the key a with a value 
# of 100 and just removed 10 with our previous invocation. Therefore, a query against a should return 90. 
# The syntax for query is as follows 
# 

echo "Start installation instantiate chaincode commands"

peer chaincode install -n mycc -v 1.0 -p github.com/chaincode/chaincode_example02/go/
echo "Successfully install the sample Go chaincode onto the peer0 node in Org1"

CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/users/Admin@wipro.example.com/msp
CORE_PEER_ADDRESS=peer0.wipro.example.com:9051
CORE_PEER_LOCALMSPID="WiproMSP"
CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/peers/peer0.wipro.example.com/tls/ca.crt
echo "Successfully modify the following four environment variables to issue the install command against peer0 in Org2"

peer chaincode install -n mycc -v 1.0 -p github.com/chaincode/chaincode_example02/go/
echo "Successfully install the sample Go chaincode onto a peer0 in Org2"

echo "Start instantiate the chaincode on the channel"
peer chaincode instantiate -o orderer.example.com:7050 --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n mycc -v 1.0 -c '{"Args":["init","a", "100", "b","200"]}' -P "AND ('TcsMSP.peer','WiproMSP.peer')"
echo "Successfully instantiate the chaincode on the channel"

peer chaincode query -C $CHANNEL_NAME -n mycc -c '{"Args":["query","a"]}'
echo "Successfully query for the value of a"

peer chaincode invoke -o orderer.example.com:7050 --tls true --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem -C $CHANNEL_NAME -n mycc --peerAddresses peer0.tcs.example.com:7051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/tcs.example.com/peers/peer0.tcs.example.com/tls/ca.crt --peerAddresses peer0.wipro.example.com:9051 --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/wipro.example.com/peers/peer0.wipro.example.com/tls/ca.crt -c '{"Args":["invoke","a","b","10"]}'
echo "Successfully invoke the query for the change of values"

peer chaincode query -C $CHANNEL_NAME -n mycc -c '{"Args":["query","a"]}'
echo "Successfully query for the value of a again"