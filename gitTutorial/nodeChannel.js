const { Gateway, Wallets } = require('fabric-network');
const fs = require('fs');
const path = require('path');

async function main() {
    // Load the connection profile and wallet
    const ccpPath = path.resolve(__dirname, '..', 'connection.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));
    const walletPath = path.join(process.cwd(), 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check if the specified user is in the wallet
    const orgAdmin = 'admin';
    const identity = await wallet.get(orgAdmin);
    if (!identity) {
        console.log(`Error: ${orgAdmin} not found in wallet`);
        return;
    }

    // Connect to the gateway using the connection profile and wallet
    const gateway = new Gateway();
    await gateway.connect(ccp, {
        wallet,
        identity: orgAdmin,
        discovery: { enabled: true, asLocalhost: true }
    });

    // Create a new channel client
    const channelName = 'mychannel';
    const network = await gateway.getNetwork(channelName);
    const client = network.getChannel().getClient();

    // Create the channel request
    const channelTxPath = path.resolve(__dirname, '..', 'channel.tx');
    const ordererName = 'orderer.example.com';
    const config = {
        name: channelName,
        orderers: [ordererName],
        consortiums: {
            'SampleConsortium': {
                organizations: [{
                    name: 'org1',
                    id: 'Org1MSP',
                    mspid: 'Org1MSP',
                    anchorPeers: [{
                        host: 'peer0.org1.example.com',
                        port: 7051
                    }]
                }]
            }
        },
        capabilities: {
            'V2_0': true
        }
    };
    const envelopeBytes = fs.readFileSync(channelTxPath);
    const configUpdate = client.extractChannelConfig(envelopeBytes);
    const signatures = client.signChannelConfig(configUpdate);
    const request = {
        config: configUpdate,
        signatures: signatures,
        name: channelName,
        orderer: ordererName,
        txId: client.newTransactionID()
    };

    // Create the channel on the network
    const response = await client.createChannel(request);
    console.log(`Channel "${channelName}" created with response:`, response);

    // Disconnect from the gateway
    gateway.disconnect();
}

main().then(() => {
    console.log('Channel creation completed successfully');
}).catch((err) => {
    console.error(`Error creating channel: ${err}`);
    process.exit(1);
});