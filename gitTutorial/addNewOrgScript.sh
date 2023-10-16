cd addOrg3

docker-compose -f ./docker/docker-compose-ca-org3.yaml up -d

./fabric-ca/registerEnroll.sh

./ccp-generate.sh

export FABRIC_CFG_PATH=$PWD

configtxgen -printOrg Org3MSP > ../organizations/peerOrganizations/org3.example.com/org3.json

docker-compose -f docker/docker-compose-org3.yaml up -d

# from test-network directory
cd ..

export PATH=${PWD}/../bin:$PATH
export FABRIC_CFG_PATH=${PWD}/../config/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org1MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org1.example.com/users/Admin@org1.example.com/msp
export CORE_PEER_ADDRESS=localhost:7051

# fetch the most recent config block for the channel – mychannel
peer channel fetch config channel-artifacts/config_block.pb -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c mychannel --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" 

#use of the configtxlator tool to decode this channel configuration block into JSON format
# From channel-artifacts directory 
# it gives us  config.json – which will serve as the baseline for our config update.
configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json
jq .data.data[0].payload.data.config config_block.json > config.json


# append the Org3 configuration definition – org3.json – to the channel’s application groups field, and name the output – modified_config.json
jq -s '.[0] * {"channel_group":{"groups":{"Application":{"groups": {"Org3MSP":.[1]}}}}}' config.json ../organizations/peerOrganizations/org3.example.com/org3.json > modified_config.json

# now translate config.json back into a protobuf called config.pb
configtxlator proto_encode --input config.json --type common.Config --output config.pb

# encode modified_config.json to modified_config.pb
configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb

# Now calculate the delta between these two config protobufs. This command will output a new protobuf binary named org3_update.pb
configtxlator compute_update --channel_id mychannel --original config.pb --updated modified_config.pb --output org3_update.pb

# decode this object into editable JSON format and call it org3_update.json
configtxlator proto_decode --input org3_update.pb --type common.ConfigUpdate --output org3_update.json

# This step will give us back the header field that we stripped away earlier. We’ll name this file org3_update_in_envelope.json
echo '{"payload":{"header":{"channel_header":{"channel_id":"'mychannel'", "type":2}},"data":{"config_update":'$(cat org3_update.json)'}}}' | jq . > org3_update_in_envelope.json

# convert it into the fully fledged protobuf format that Fabric requires. We’ll name our final update object org3_update_in_envelope.pb
configtxlator proto_encode --input org3_update_in_envelope.json --type common.Envelope --output org3_update_in_envelope.pb

# From test-network directory
# command will sign the update as Org1.
peer channel signconfigtx -f channel-artifacts/org3_update_in_envelope.pb

# Export the Org2 environment variables:
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org2MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org2.example.com/users/Admin@org2.example.com/msp
export CORE_PEER_ADDRESS=localhost:9051

# The Org2 Admin signature will be attached to this call so there is no need to manually sign the protobuf a second time
peer channel update -f channel-artifacts/org3_update_in_envelope.pb -c mychannel -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# Export the following environment variables to operate as the Org3 Admin
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID="Org3MSP"
export CORE_PEER_TLS_ROOTCERT_FILE=${PWD}/organizations/peerOrganizations/org3.example.com/peers/peer0.org3.example.com/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${PWD}/organizations/peerOrganizations/org3.example.com/users/Admin@org3.example.com/msp
export CORE_PEER_ADDRESS=localhost:11051

# Use the peer channel fetch command to retrieve this block
peer channel fetch 0 channel-artifacts/mychannel.block -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com -c mychannel --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

# join the Org3 peer to the channel using mychanel.block
peer channel join -b channel-artifacts/mychannel.block


///////////org3_update_in_envelope.pb
configtxlator proto_decode --input org3_update_in_envelope.pb --type common.ConfigUpdate --output org3_update_in_envelope.json

configtxlator proto_decode --input org3_update_in_envelope.pb --type common.Block

//////////////////////
configtxlator proto_encode --input envelopConfig.json --type common.Envelope --output envelopConfig.pb