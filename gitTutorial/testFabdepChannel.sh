export PATH=${HOME}/fabric-samples/bin:$PATH
export FABRIC_CFG_PATH=$PWD/../config/


# export FABRIC_CFG_PATH=/home/riyaz/Documents/network1/orderer12org-root-ca/channel-artifacts/
export CORE_PEER_TLS_ENABLED=true
export CORE_PEER_LOCALMSPID=org6msp
export CORE_PEER_TLS_ROOTCERT_FILE=${HOME}/Documents/network1/org6-root-ca/peer0-org6/tls/ca.crt
export CORE_PEER_MSPCONFIGPATH=${HOME}/Documents/network1/org6-root-ca/admin/msp
export CORE_PEER_ADDRESS=peer0-org6:31033


peer channel create -o localhost:32031  --ordererTLSHostnameOverride orderer0-orderer8org -c testchannel -f ${HOME}/Documents/channel/testchannel/channel.tx --outputBlock ${HOME}/Documents/channel/testchannel/channel.block --tls --cafile "${HOME}/Documents/network1/orderer8org-root-ca/orderer0-orderer8org/crypto/msp/tlscacerts/tlsca.pem"

peer channel join -b ${HOME}/Documents/channel/testchannel/channel.block

peer channel getinfo -c testchannel

peer channel fetch config ${HOME}/Documents/network1/orderer8org-root-ca/channel-artifacts/config_block.pb -o localhost:32031  --ordererTLSHostnameOverride orderer0-orderer8org -c testchannel --tls --cafile "${HOME}/Documents/network1/orderer8org-root-ca/orderer0-orderer8org/crypto/msp/tlscacerts/tlsca.pem"


# FROM channel-artifacts directory run the following commands

configtxlator proto_decode --input config_block.pb --type common.Block --output config_block.json

jq '.data.data[0].payload.data.config' config_block.json > config.json

cp config.json config_copy.json

jq '.channel_group.groups.Application.groups.org3msp.values += {"AnchorPeers":{"mod_policy": "Admins","value":{"anchor_peers": [{"host": "peer0-org3","port": 31024}]},"version": "0"}}' config_copy.json > modified_config.json

configtxlator proto_encode --input config.json --type common.Config --output config.pb

configtxlator proto_encode --input modified_config.json --type common.Config --output modified_config.pb

configtxlator compute_update --channel_id testchannel --original config.pb --updated modified_config.pb --output config_update.pb

configtxlator proto_decode --input config_update.pb --type common.ConfigUpdate --output config_update.json

echo '{"payload":{"header":{"channel_header":{"channel_id":"testchannel", "type":2}},"data":{"config_update":'$(cat config_update.json)'}}}' | jq . > config_update_in_envelope.json

configtxlator proto_encode --input config_update_in_envelope.json --type common.Envelope --output config_update_in_envelope.pb

# Now go back to test-network directory
peer channel update -f ${HOME}/Documents/network1/orderer8org-root-ca/channel-artifacts/config_update_in_envelope.pb -c testchannel -o localhost:32031  --ordererTLSHostnameOverride orderer0-orderer8org --tls --cafile "${HOME}/Documents/network1/orderer8org-root-ca/orderer0-orderer8org/crypto/msp/tlscacerts/tlsca.pem"



