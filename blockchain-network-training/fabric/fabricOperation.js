'use strict';
// var Client = require('fabric-client')

const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');
const ccpPath = path.resolve(__dirname, '.', '../../', 'connection-org1.json');
let ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

class FabricOperation {


    async query(user, channel_name, chaincode_name, function_name, data = null) {
        try {
            // Create a new file system based wallet for managing identities.
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);            

            // Check to see if we've already enrolled the user.
            const identity = await wallet.get(user);
            if (!identity) {
                throw new Error(`Please enroll: ${user}`);
            }

            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: true, asLocalhost: true } });
            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork(channel_name);

            // Get the contract from the network.
            const contract = network.getContract(chaincode_name);

            let result;
            // Submit the specified transaction.
            if (data) {
                result = await contract.evaluateTransaction(function_name, data);
            }
            else {
                result = await contract.evaluateTransaction(function_name);
                return
            }

            // Disconnect from the gateway.
            await gateway.disconnect();
            return {
                status: 200,
                data: {
                    data: result.toString() ? JSON.parse(result.toString()) : []
                }
            };
        } catch (error) {
            return {
                status: 404,
                data: null
            }
            //return this.handleError(error);
        }
    }

    async invoke(user, channel_name, chaincode_name, function_name, data) {
        try {
            // Create a new file system based wallet for managing identities.
            const walletPath = path.join(process.cwd(), 'wallet');
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            console.log(`Wallet path: ${walletPath}`);

            // Check to see if we've already enrolled the user.
            const identity = await wallet.get(user);
            if (!identity) {
                throw new Error(`Please enroll: ${user}`);
            }

            // Create a new gateway for connecting to our peer node.
            const gateway = new Gateway();

            await gateway.connect(ccp, { wallet, identity: user, discovery: { enabled: true, asLocalhost: true } });

            // Get the network (channel) our contract is deployed to.
            const network = await gateway.getNetwork(channel_name);
            // Get the contract from the network.
            const contract = network.getContract(chaincode_name);

            
            //Generate txn id and use as key
            // if (function_name == "CreateXFarmRecord"){
            //     let txn =   contract.createTransaction(function_name)
            //     let txt_id = txn.getTransactionId()                
            //     data.xfarm_id=txt_id;               
            // }
            

            // Submit the specified transaction.
            let result;
            result = await contract.submitTransaction(function_name, JSON.stringify(data));

            // Disconnect from the gateway.
            await gateway.disconnect();

            return {
                status: 200,
                data: {
                    data: result.toJSON()
                }
            };
        } catch (error) {
            console.log(error);
            return this.handleError(error);
        }
    }

    /**
     * Checks whether a string is JSON or not
     * @param {*} item
     */
    isJson(item) {
        item = typeof item !== 'string'
            ? JSON.stringify(item)
            : item;
        try {
            item = JSON.parse(item);
        } catch (e) {
            return false;
        }
        if (typeof item === 'object' && item !== null) {
            return item;
        }
        return false;
    }


    handleError(error) {
        let response = {
            status: 500,
            data: {
                message: error.message ? error.message : "Something went wrong!"
            }
        };

        // check for the chaincode response
        if (error.hasOwnProperty('responses') && error.responses.length) {
            // chaincode is executed and has thrown some error
            let peerResponse = error.responses[0].response;
            console.log(peerResponse);
            let errors = this.isJson(peerResponse.message);
            if (errors) {
                // make the response
                response.data.message = errors.msg;
                response.status = errors.code;

                // check if the error has extra data
                if (errors.hasOwnProperty('details')) {
                    response.data.errors = errors.details;
                }
            }
            else {
                response.data.message = peerResponse.message;
                response.satus = peerResponse.status;
            }
        } else {
            let errors = this.isJson(error.message);
            if (errors) {
                // make the response
                response.data.message = errors.msg;
                response.status = errors.code;

                // check if the error has extra data
                if (errors.hasOwnProperty('details')) {
                    response.data.errors = errors.details;
                }
            }
        }
        return response;
    }
}

module.exports = FabricOperation;
