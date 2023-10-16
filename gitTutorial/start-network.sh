./scratch/generate-msp.sh re-generate

./scratch/genesis.sh


echo "================================= UP PEERS FILE =================================="

./start-org.sh orderer

./start-org.sh osqo

./start-org.sh bcp

./start-org.sh broker

./start-org.sh esp



echo "================================= CREATE CHANNEL =================================="

./scratch/create-channel.sh


echo "================================= JOIN PEERS TO CHANNEL =================================="


./scratch/join-channel-org.sh osqo

./scratch/join-channel-org.sh bcp

./scratch/join-channel-org.sh broker

./scratch/join-channel-org.sh esp



# echo "================================= INSTALL CHAINCODE =================================="


# ./chaincode/install-chaincode.sh osqo osqo-chaincode ../chaincode-typescript 1.0 1

# ./chaincode/install-chaincode.sh bcp osqo-chaincode ../chaincode-typescript 1.0 1


# ./chaincode/install-chaincode.sh broker osqo-chaincode ../chaincode-typescript 1.0 1


# ./chaincode/install-chaincode.sh esp osqo-chaincode ../chaincode-typescript 1.0 1



# echo "================================= COMMIT CHAINCODE =================================="

# ./chaincode/commit-chaincode.sh osqo osqo-chaincode 1.0 1


# echo "================================= INVOKE QUERY CHAINCODE =================================="

# ./chaincode/invoke-query.sh osqo 
