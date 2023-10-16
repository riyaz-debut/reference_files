'use strict';
const config = require('../../config');
let shell = require('shelljs');
const { exec } = require('child_process');
const os = require('os');
const fs = require('fs-extra');
const { channel } = require('./channelModel'); // require model users
const ordererModel = require('../orderingService/ordererModel');
// const { FileSystemWallet, Gateway } = require('fabric-network');
const { Wallets, FileSystemWallet, Gateway } = require('fabric-network');
const FabricCAServices = require("fabric-ca-client");
const mongoose = require('mongoose'); //orm for database

const utils = require('../../utils/utils.js');
const exceptions = require('../errors/errors');

// Generates the channelTx for the Channel
// using the shell and the configtxgen binary

// =============== fabric 2.x xhanges =======================================
// create channel 
function createChannelData(channelBasePath, organisation, orderernode, channelName) {
    console.log("i am in createChannelData")
    console.log(channelBasePath);
    const orgPath = utils.getBasePath(organisation.network.namespace, organisation.name, organisation.ca.name);
    const peerOrgPath = `${orgPath}/${organisation.peer.peer_enroll_id}`;
    const ordererOrgPath = utils.getBasePath(organisation.network.namespace, orderernode.orgId.name, orderernode.caId.name);
    const ordererNodePath = `${ordererOrgPath}/${orderernode.name}`;
    const orgMsp = organisation.mspId
    const peerPort = `${organisation.peer.peer_enroll_id}:${organisation.peer.peerport}`
    const ordererPort = `${orderernode.name}:${orderernode.port}`
    const path = `${os.homedir}/fabric-samples/bin:$PATH`
    const fabric_cfg_path = `${ordererOrgPath}/channel-artifacts/`
    
    const core_peer_tls_enabled = "true"
    const core_peer_localmspid = `${orgMsp}`
    const core_peer_tls_rootcert_file=`${peerOrgPath}/tls/ca.crt`
    const core_peer_mspconfigpath = `${orgPath}/admin/msp`
    const core_peer_address=`${peerPort}`
    const ordererAddress = `${ordererPort}`
    const channelConfigPath = `${channelBasePath}/channel.tx`
    const channelBlockPath = `${channelBasePath}/channel.block` 
    const ordererCA = `${ordererNodePath}/crypto/msp/tlscacerts/tlsca.pem`
    let status = 'initial'; 
    if (channelName) {
        console.log("in if condition")
      
        if (shell.exec(`export PATH=${path} && export FABRIC_CFG_PATH=${fabric_cfg_path} && export CORE_PEER_TLS_ENABLED=${core_peer_tls_enabled} && export CORE_PEER_LOCALMSPID=${core_peer_localmspid} && export CORE_PEER_TLS_ROOTCERT_FILE=${core_peer_tls_rootcert_file} && export CORE_PEER_MSPCONFIGPATH=${core_peer_mspconfigpath} && export CORE_PEER_ADDRESS=${core_peer_address} && peer channel create -o ${ordererAddress} -c ${channelName} -f ${channelConfigPath} --outputBlock ${channelBlockPath} --tls --cafile ${ordererCA}`).code !== 0) {
            shell.echo('Error: while creating channel block');
            console.log("in err cond")
            throw new exceptions.ChannelException('Error: while creating channel block');
        }
        status = 'SUCCESS'
    } 
    console.log('generated');
    return ({status : status})
}

// join channel function 
function joinChannelData(channelBasePath, peerDetails, orderernode, channelName) {
    console.log("i am in joinChannelData")
    console.log(channelBasePath);
    const orgPath = utils.getBasePath(peerDetails.networkId.namespace, peerDetails.orgId.name, peerDetails.caId.name);
    const peerOrgPath = `${orgPath}/${peerDetails.peer_enroll_id}`;
    const ordererOrgPath = utils.getBasePath(peerDetails.networkId.namespace, orderernode.orgId.name, orderernode.caId.name);
    // const ordererNodePath = `${ordererOrgPath}/${orderernode.name}`;
    const orgMsp = peerDetails.orgId.mspId
    const peerPort = `${peerDetails.peer_enroll_id}:${peerDetails.peerport}`
    // const ordererPort = `${orderernode.name}:${orderernode.port}`
    const path = `${os.homedir}/fabric-samples/bin:$PATH`
    const fabric_cfg_path = `${ordererOrgPath}/channel-artifacts/`
    
    const core_peer_tls_enabled = "true"
    const core_peer_localmspid = `${orgMsp}`
    const core_peer_tls_rootcert_file=`${peerOrgPath}/tls/ca.crt`
    const core_peer_mspconfigpath = `${orgPath}/admin/msp`
    const core_peer_address=`${peerPort}`
    // const ordererAddress = `${ordererPort}`
    // const channelConfigPath = `${channelBasePath}/channel.tx`
    const channelBlockPath = `${channelBasePath}/channel.block` 
    // const ordererCA = `${ordererNodePath}/crypto/msp/tlscacerts/tlsca.pem`
    let status = 'initial'; 
    if (channelName) {
        console.log("in if condition")
      
        if (shell.exec(`export PATH=${path} && export FABRIC_CFG_PATH=${fabric_cfg_path} && export CORE_PEER_TLS_ENABLED=${core_peer_tls_enabled} && export CORE_PEER_LOCALMSPID=${core_peer_localmspid} && export CORE_PEER_TLS_ROOTCERT_FILE=${core_peer_tls_rootcert_file} && export CORE_PEER_MSPCONFIGPATH=${core_peer_mspconfigpath} && export CORE_PEER_ADDRESS=${core_peer_address} && peer channel join -b ${channelBlockPath}`).code !== 0) {
            shell.echo('Error: while joining channel');
            console.log("in err cond")
            throw new exceptions.ChannelException('Error: while joining channel');
        }
        status = 'SUCCESS'
    } 
    console.log('joined');
    return ({status : status})
}

// set anchor peer
function setAnchorPeer(channelBasePath, peerDetails, orderernode, channelName) {
    console.log("i am in setAnchorPeer")
    console.log(channelBasePath);
    const orgPath = utils.getBasePath(peerDetails.networkId.namespace, peerDetails.orgId.name, peerDetails.caId.name);
    const peerOrgPath = `${orgPath}/${peerDetails.peer_enroll_id}`;
    const ordererOrgPath = utils.getBasePath(peerDetails.networkId.namespace, orderernode.orgId.name, orderernode.caId.name);
    // const ordererNodePath = `${ordererOrgPath}/${orderernode.name}`;
    const orgMsp = peerDetails.orgId.mspId
    const peerPort = `${peerDetails.peer_enroll_id}:${peerDetails.peerport}`
    // const ordererPort = `${orderernode.name}:${orderernode.port}`
    const path = `${os.homedir}/fabric-samples/bin:$PATH`
    const fabric_cfg_path = `${ordererOrgPath}/wallet/`
    
    const core_peer_tls_enabled = "true"
    const core_peer_localmspid = `${orgMsp}`
    const core_peer_tls_rootcert_file=`${peerOrgPath}/tls/ca.crt`
    const core_peer_mspconfigpath = `${orgPath}/admin/msp`
    const core_peer_address=`${peerPort}`
    // const ordererAddress = `${ordererPort}`
    // const channelConfigPath = `${channelBasePath}/channel.tx`
    const channelAnchorTxPath = `${channelBasePath}/anchors.tx` 
    // const ordererCA = `${ordererNodePath}/crypto/msp/tlscacerts/tlsca.pem`
    let status = 'initial'; 
    if (channelName) {
        console.log("in if condition")
        // configtxgen -profile OrgsChannel -outputAnchorPeersUpdate ${channelAnchorTxPath} -channelID ${channelName} -asOrg ${orgMsp}
        if (shell.exec(`export PATH=${path} && export FABRIC_CFG_PATH=${fabric_cfg_path} && export CORE_PEER_TLS_ENABLED=${core_peer_tls_enabled} && export CORE_PEER_LOCALMSPID=${core_peer_localmspid} && export CORE_PEER_TLS_ROOTCERT_FILE=${core_peer_tls_rootcert_file} && export CORE_PEER_MSPCONFIGPATH=${core_peer_mspconfigpath} && export CORE_PEER_ADDRESS=${core_peer_address} && configtxgen -profile OrgsChannel -outputAnchorPeersUpdate ${channelAnchorTxPath} -channelID ${channelName} -asOrg ${orgMsp}`).code !== 0) {
            shell.echo('Error: while set anchor peer');
            console.log("in err cond")
            throw new exceptions.ChannelException('Error: while set anchor peer');
        }
        status = 'SUCCESS'
    }console.log('anchor peer generated');
    return ({status : status})
}

// update anchor peer

function updateAnchorPeers(channelBasePath, peerDetails, orderernode, channelName) {
    console.log("i am in updateAnchorPeers")
    console.log(channelBasePath);
    const orgPath = utils.getBasePath(peerDetails.networkId.namespace, peerDetails.orgId.name, peerDetails.caId.name);
    const peerOrgPath = `${orgPath}/${peerDetails.peer_enroll_id}`;
    const ordererOrgPath = utils.getBasePath(peerDetails.networkId.namespace, orderernode.orgId.name, orderernode.caId.name);
    const ordererNodePath = `${ordererOrgPath}/${orderernode.name}`;
    const orgMsp = peerDetails.orgId.mspId
    const peerPort = `${peerDetails.peer_enroll_id}:${peerDetails.peerport}`
    const ordererPort = `${orderernode.name}:${orderernode.port}`
    const path = `${os.homedir}/fabric-samples/bin:$PATH`
    const fabric_cfg_path = `${ordererOrgPath}/channel-artifacts/`
    
    const core_peer_tls_enabled = "true"
    const core_peer_localmspid = `${orgMsp}`
    const core_peer_tls_rootcert_file=`${peerOrgPath}/tls/ca.crt`
    const core_peer_mspconfigpath = `${orgPath}/admin/msp`
    const core_peer_address=`${peerPort}`
    const ordererAddress = `${ordererPort}`
    // const channelConfigPath = `${channelBasePath}/channel.tx`
    const channelAnchorTxPath = `${channelBasePath}/anchors.tx` 
    const ordererCA = `${ordererNodePath}/crypto/msp/tlscacerts/tlsca.pem`
    let status = 'initial'; 
    if (channelName) {
        console.log("in if condition")
        // peer channel update -o  ${ordererAddress} -c ${channelName} -f ${channelAnchorTxPath} --tls --cafile ${ordererCA}
        if (shell.exec(`export PATH=${path} && export FABRIC_CFG_PATH=${fabric_cfg_path} && export CORE_PEER_TLS_ENABLED=${core_peer_tls_enabled} && export CORE_PEER_LOCALMSPID=${core_peer_localmspid} && export CORE_PEER_TLS_ROOTCERT_FILE=${core_peer_tls_rootcert_file} && export CORE_PEER_MSPCONFIGPATH=${core_peer_mspconfigpath} && export CORE_PEER_ADDRESS=${core_peer_address} && peer channel update -o  ${ordererAddress} -c ${channelName} -f ${channelAnchorTxPath} --tls --cafile ${ordererCA}`).code !== 0) {
            shell.echo('Error: while update anchor peer');
            console.log("in err cond")
            throw new exceptions.ChannelException('Error: while update anchor peer');
        }
        status = 'SUCCESS'
    } 
    console.log('anchor peer updated successfully');
    return ({status : status})
}



// async createRecord(req) {
//     try {

//         let data = {
//             docType: req.docType, 
//             idName : req.idName,
//             [req.idName]: req.body[req.idName]
//         }

//         //check exists            
//         let existingRecord = await this.isRecordExists(data, data[req.idName]);
//         console.log(" existingRecord ",existingRecord)
//         if(existingRecord) {
//             return Promise.reject({status:409, message: 'Record already exists'});
//         }
//         return FabricController.invoke(
//             payload

//         );

//     } catch (error) {
//         return Promise.reject(error);
//     }
// }

function generateChannelTx(genesisFilePath, ConfigtxPath, ChannelDetail) {
    if (!shell.which('configtxgen')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');
    }
    // configtxgen -profile OrgsChannel -outputCreateChannelTx ${PWD}/../channel-artifacts/${CHANNEL_NAME}.tx -channelID $CHANNEL_NAME
    console.log("fabric_cfg_path :", genesisFilePath)
    if (
        shell.exec(
            `export FABRIC_CFG_PATH=${genesisFilePath} && export CHANNEL_NAME=${ChannelDetail.name}  &&  configtxgen -profile OrgsChannel -outputCreateChannelTx ${ConfigtxPath}/channel.tx -channelID ${ChannelDetail.name}`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException('Error: while creating Channel Tx');
    }
    console.log('generated');
}


function writeChannelConnectionJsonOrgWise(channel, orderernode) {
    console.log("ordererNode name in write connection json :", orderernode.name)
    try {
        for (let i = 0; i < channel.organisations.length; i++) {
            let orgData = channel.organisations[i];
            console.log(orgData);
            console.log("orgData.ca.name :", orgData.ca.name)
            console.log("channel.name :", channel.name)
            console.log("network namespace", orgData.network.namespace);
            let channelObj = {
                name: orgData.name,
                version: '1.0.0',
                client: {
                    organization: orgData.name,
                    connection: {
                        timeout: {
                            peer: {
                                endorser: '3000',
                            },
                            orderer: '3000',
                        },
                    },
                },
                organizations: {
                    [orgData.name]: {
                        mspid: orgData.mspId,
                        peers: [],
                        certificateAuthorities: [orgData.ca.name]
                    },
                },
                orderers: {
                    [orderernode.name]: {
                        url: `grpcs://localhost:${orderernode.port}`,
                        grpcOptions: {
                            'ssl-target-name-override': orderernode.name,
                            'grpc.keepalive_timeout_ms': 3000,
                        },
                        tlsCACerts: {
                            path: `${os.homedir}/Documents/${orderernode.network.namespace}/${orderernode.organisation.name}-${orderernode.basicca.name}/${orderernode.name}/crypto/msp/tlscacerts/tlsca.pem`,
                        },
                    },
                },
                channels: {
                    [channel.name]: {
                        orderers: [orderernode.name],
                        peers: {},
                    }
                },
                certificateAuthorities: {
                    [orgData.ca.name]: {
                        url: `https://localhost:${orgData.ca.port}`,
                        caName: `${orgData.ca.name}`,
                        tlsCACerts: {
                            path: `${os.homedir}/Documents/${orderernode.network.namespace}/${orgData.ca.name}/tls-cert.pem`,
                        },
                        httpOptions: {
                            verify: false,
                        },
                    },
                },
            };
            let stringObj = JSON.stringify(channelObj);
            console.log("stringObj :", stringObj)
            fs.outputFileSync(`${os.homedir}/Documents/channel/${channel.name}/${orgData.name}/config.json`, stringObj);
            console.log('File written');
        }
        //console.log(channelObj);


    } catch (error) {
        return Promise.reject(error);
    }
}

function writeExportedChannelConnectionJson(channel, existingOrg) {
    try {
        let ordererName = `orderer0-${channel.extras.ordererOrg}`
        let ordererPort = channel.extras.ordererPort
        let ordererUrl = channel.extras.ordererUrl
        let tlsCacerts = channel.extras.tlsCacerts
        let channelConfigObj = {
            name: existingOrg.name,
            version: '1.0.0',
            client: {
                organization: existingOrg.name,
                connection: {
                    timeout: {
                        peer: {
                            endorser: '3000',
                        },
                        orderer: '3000',
                    },
                },
            },
            organizations: {
                [existingOrg.name]: {
                    mspid: existingOrg.mspId,
                    peers: [],
                    certificateAuthorities: [existingOrg.caId.name]
                },
            },
            orderers: {
                [ordererName]: {
                    url: `grpcs://${ordererUrl}:${ordererPort}`,
                    grpcOptions: {
                        'ssl-target-name-override': ordererName,
                        'grpc.keepalive_timeout_ms': 3000,
                    },
                    tlsCACerts: {
                        "pem": `${tlsCacerts}`,
                    },
                },
            },
            channels: {
                [channel.name]: {
                    orderers: [ordererName],
                    peers: {},
                }
            },

        };

        let stringObj = JSON.stringify(channelConfigObj);
        console.log(stringObj);
        fs.outputFileSync(`${os.homedir}/${config.home}/channel/${channel.name}/${existingOrg.name}/config.json`, stringObj)
    } catch (error) {
        return Promise.reject(error);
    }
}

function getMspConfigtx(peerDetails, orgMspPath) {

    return {
        Organizations: [
            {
                Name: peerDetails.orgId.name,
                ID: peerDetails.orgId.mspId,
                MSPDir: orgMspPath,
                Policies: {
                    Readers: {
                        Type: 'Signature',
                        Rule: `OR("${peerDetails.orgId.mspId}.admin", "${peerDetails.orgId.mspId}.peer", "${peerDetails.orgId.mspId}.client")`,
                    },
                    Writers: {
                        Type: 'Signature',
                        Rule: `OR("${peerDetails.orgId.mspId}.admin", "${peerDetails.orgId.mspId}.client")`,
                    },
                    Admins: {
                        Type: 'Signature',
                        Rule: `OR("${peerDetails.orgId.mspId}.admin")`,
                    },
                },
                AnchorPeers: [
                    {
                        Host: peerDetails.peer_enroll_id,
                        Port: peerDetails.peerport,
                    },
                ],
            },
        ],
    };
}



function addChannelInfoToconfig(channel, orderernode) {

    for (let i = 0; i < channel.organisations.length; i++) {
        let orgData = channel.organisations[i];
        let ccpPath = `${os.homedir}/Documents/channel/${channel.name}/${orgData.name}/config.json`;
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const ChannelObject = {
            orderers: [orderernode.name],
            peers: {},
        };
        if (!ccp.channels) {
            ccp.channels = {};
        }
        ccp.channels[channel.name] = ChannelObject;
        let CcpUpdateJson = JSON.stringify(ccp);
        fs.writeFileSync(ccpPath, CcpUpdateJson);
    }
}

function addPeerinCcp(ccpPath, peerDetails, channelName) {

    const basePath = `${os.homedir}/${config.home}/${peerDetails.networkId.namespace}/${peerDetails.orgId.name}-${peerDetails.caId.name}`;
    const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    const ccp = JSON.parse(ccpJSON);

    ccp.organizations[peerDetails.orgId.name].peers.push(peerDetails.peer_enroll_id);

    if (!ccp.channels) {
        ccp.channels = {};
    }


    ccp.channels[channelName].peers[peerDetails.peer_enroll_id] = {
        endorsingPeer: true,
        chaincodeQuery: true,
        ledgerQuery: true,
        eventSource: true,
    };


    if (!ccp.peers) {
        ccp.peers = {};
    }

    // ccp.peers[peerDetails.peer_enroll_id] = {
    //     url: `grpcs://${clusterData.master_node.ip}:${peerDetails.peerport}`,
    //     tlsCACerts: {
    //         path: `${basePath}/msp/tlscacerts/tlsca.pem`,
    //     },
    //     grpcOptions: {
    //         'ssl-target-name-override': peerDetails.peer_enroll_id,
    //         'grpc.keepalive_timeout_ms': 20000,
    //     },
    // };

    let CcpUpdateJson = JSON.stringify(ccp);
    fs.writeFileSync(ccpPath, CcpUpdateJson);
}
// Generates the channelTx for the Channel
// using the shell and the configtxgen binary

function generateOrgConfig(peerDetails, ConfigtxPath) {
    if (!shell.which('configtxgen')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');
    }
    console.log(ConfigtxPath);
    console.log(peerDetails);
    if (
        shell.exec(
            `export FABRIC_CFG_PATH=${ConfigtxPath}/   && configtxgen -printOrg ${peerDetails.orgId.name} > ${ConfigtxPath}/${peerDetails.orgId.name}.json`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException('Error: while creating Channel Tx');
    }
    console.log('generated');
}



function generateExternalOrgConfig(orgDetails, ConfigtxPath) {
    if (!shell.which('configtxgen')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');
    }
    console.log(ConfigtxPath);
    if (
        shell.exec(
            `export FABRIC_CFG_PATH=${ConfigtxPath}/   && configtxgen -printOrg ${orgDetails.mspId} > ${ConfigtxPath}/${orgDetails.name}.json`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException('Error: while creating Channel Tx');
    }
    console.log('generated');
}
// Function to convert Channel configration to Json

function convertConfigToJson(ChannelConfigPath, ChannelConfigJsonPath) {
    if (!shell.which('configtxlator')) {
        shell.echo('Sorry, this script requires configtxlator');
        throw new exceptions.GenesisException('Missing configtxlator binary');
    }
    if (
        shell.exec(
            `configtxlator proto_decode --input ${ChannelConfigPath} --type common.ConfigEnvelope | jq .config  > ${ChannelConfigJsonPath}`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException(
            'Error: while converting file Channel Tx'
        );
    }
    console.log('generated');
}

// Convert channel update json to pb format

function convertConfigJsonToPb(ChannelConfigJsonPath, ChannelConfigPbPath) {
    if (!shell.which('configtxlator')) {
        shell.echo('Sorry, this script requires configtxlator');
        throw new exceptions.GenesisException('Missing configtxlator binary');
    }
    if (
        shell.exec(
            `configtxlator proto_encode --input ${ChannelConfigJsonPath} --type common.Config --output ${ChannelConfigPbPath}`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException(
            'Error: while converting file Channel Tx'
        );
    }
    console.log('generated');
}

// Common update both modified and intial pb to final pb

function generateFinalChannelPb(
    intialConfigPath,
    updatePbPath,
    FinalConfigPbPath,
    CHANNEL_NAME
) {
    if (!shell.which('configtxlator')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');
    }
    if (
        shell.exec(
            `configtxlator compute_update --channel_id ${CHANNEL_NAME} --original ${intialConfigPath} --updated ${updatePbPath} --output ${FinalConfigPbPath}`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException(
            'Error: while converting file Channel Tx'
        );
    }
    console.log('generated');
}

//convert Final pb to json for adding envelope

function convertFinalConfigToJson(FinalConfigPbPath, FinalConfigjsPath) {
    if (!shell.which('configtxgen')) {
        shell.echo('Sorry, this script requires configtxgen');
        throw new exceptions.GenesisException('Missing configtxgen binary');
    }
    if (
        shell.exec(
            `configtxlator proto_decode --input ${FinalConfigPbPath} --type common.ConfigUpdate | jq . > ${FinalConfigjsPath}`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException(
            'Error: while converting file Channel Tx'
        );
    }
    console.log('generated');
}

//convert Envelope to final json

function addEnvelopeToConfig(
    FinalConfigjsPath,
    FinalConfigEnvelopePath,
    CHANNEL_NAME
) {
    let Configrawdata = fs.readFileSync(FinalConfigjsPath);
    let ConfigUpdatedata = JSON.parse(Configrawdata);

    let envelopeString = {
        payload: {
            header: { channel_header: { channel_id: CHANNEL_NAME, type: 2 } },
            data: { config_update: ConfigUpdatedata },
        },
    };

    let finalData = JSON.stringify(envelopeString);
    fs.writeFileSync(FinalConfigEnvelopePath, finalData);
}

//convert final json with Envelope file to pb format

function EnvelopeConfigToPb(ConfigEnvelopeJsonPath, ConfigEnvelopePbPath) {
    if (!shell.which('configtxlator')) {
        shell.echo('Sorry, this script requires configtxlator');
        throw new exceptions.GenesisException('Missing configtxlator binary');
    }
    if (
        shell.exec(
            `configtxlator proto_encode --input ${ConfigEnvelopeJsonPath} --type common.Envelope --output ${ConfigEnvelopePbPath}`
        ).code !== 0
    ) {
        shell.echo('Error: while creating channel Tx');
        throw new exceptions.GenesisException(
            'Error: while converting file Channel Tx'
        );
    }
    console.log('generated');
}


async function fetchChannelPrereqsiteData(data) {
    let channelDetailArray = await channel.aggregate([
        {
            $match: { _id: mongoose.Types.ObjectId(data.channelId) },
        },
        {
            $lookup: {
                from: 'ordererservices',
                as: 'ordererservice',
                let: { ordererserviceId: '$ordererserviceId' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$ordererserviceId'] } } },
                    {
                        $lookup: {
                            from: 'networks',
                            as: 'network',
                            let: { networkId: '$networkId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$networkId'] } } }
                            ]
                        },
                    },
                    { $unwind: '$network' },
                ],
            },

        },
        {
            $lookup: {
                from: 'organisations',
                as: 'organisations',
                let: { operators: '$operators' },
                pipeline: [
                    { $match: { $expr: { $in: ['$_id', '$$operators'] } } },
                    {
                        $lookup: {
                            from: 'networks',
                            as: 'network',
                            let: { networkId: '$networkId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$networkId'] } } }
                            ]
                        },
                    },
                    {
                        $lookup: {
                            from: 'cas',
                            as: 'ca',
                            let: { caId: '$caId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$caId'] } } },
                                {
                                    $lookup: {
                                        from: 'clusters',
                                        as: 'cluster',
                                        let: { clusterId: '$clusterId' },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                                            {
                                                $lookup: {
                                                    from: 'vms',
                                                    as: 'masternode',
                                                    let: { master_node: '$master_node' },
                                                    pipeline: [
                                                        {
                                                            $match: { $expr: { $eq: ['$_id', '$$master_node'] } },

                                                        },
                                                        {
                                                            $project: { ip: 1, password: 1 }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                $project: { name: 1, masternode: 1 }
                                            },
                                            { $unwind: '$masternode' },


                                        ]
                                    }
                                },
                                { $unwind: '$cluster' },

                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'cas',
                            as: 'tlsca',
                            let: { tlsCaId: '$tlsCaId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$tlsCaId'] } } },
                                {
                                    $lookup: {
                                        from: 'clusters',
                                        as: 'cluster',
                                        let: { clusterId: '$clusterId' },
                                        pipeline: [
                                            { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                                            {
                                                $lookup: {
                                                    from: 'vms',
                                                    as: 'masternode',
                                                    let: { master_node: '$master_node' },
                                                    pipeline: [
                                                        {
                                                            $match: { $expr: { $eq: ['$_id', '$$master_node'] } },

                                                        },
                                                        {
                                                            $project: { ip: 1, password: 1 }
                                                        }
                                                    ]
                                                }
                                            },
                                            {
                                                $project: { name: 1, masternode: 1 }
                                            },
                                            { $unwind: '$masternode' },


                                        ]
                                    }
                                },
                                { $unwind: '$cluster' }

                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'orgadmins',
                            as: 'admin',
                            let: { admnId: '$adminId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$admnId'] } } },

                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'peers',
                            as: 'peer',
                            let: { orgId: '$_id' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$orgId', '$$orgId'] } } },
                                { $sort: { created_at: 1 } },
                                { $limit: 1 }
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'networks',
                            as: 'network',
                            let: { networkId: '$networkId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$networkId'] } } }
                            ]
                        }
                    },
                    { $unwind: '$network' },
                    { $unwind: '$peer' },
                    { $unwind: '$ca' },
                    { $unwind: '$admin' },
                ]

            },
        },
        { $unwind: '$ordererservice' },
    ]);
    return channelDetailArray;
}



// function to get ordernode details
async function fetchordernodeDetail(orderserviceId) {

    //  let orderserviceId = String(id);
    let channelDetailArray = await ordererModel.ordererNode.aggregate([
        {
            $match: { orderingServiceId: orderserviceId },
        },
        {
            $lookup: {
                from: 'organisations',
                as: 'organisation',
                let: { orgId: '$orgId' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$orgId'] } } },
                    {
                        $lookup: {
                            from: 'clusters',
                            as: 'cluster',
                            let: { clusterId: '$clusterId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                                {
                                    $lookup: {
                                        from: 'vms',
                                        as: 'masternode',
                                        let: { master_node: '$master_node' },
                                        pipeline: [
                                            {
                                                $match: { $expr: { $eq: ['$_id', '$$master_node'] } },

                                            },
                                            {
                                                $project: { ip: 1, password: 1 }
                                            }
                                        ]
                                    }
                                },
                                {
                                    $project: { name: 1, masternode: 1 }
                                },
                                { $unwind: '$masternode' },


                            ]
                        }
                    },
                    { $unwind: '$cluster' },

                ]
            }
        },
        {
            $lookup: {
                from: 'cas',
                as: 'tlsca',
                let: { tlsCaId: '$tlsCaId' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$tlsCaId'] } } },
                    {
                        $lookup: {
                            from: 'clusters',
                            as: 'cluster',
                            let: { clusterId: '$clusterId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                                {
                                    $lookup: {
                                        from: 'vms',
                                        as: 'masternode',
                                        let: { master_node: '$master_node' },
                                        pipeline: [
                                            {
                                                $match: { $expr: { $eq: ['$_id', '$$master_node'] } },

                                            },
                                            {
                                                $project: { ip: 1, password: 1 }
                                            }
                                        ]
                                    }
                                },
                                {
                                    $project: { name: 1, masternode: 1 }
                                },
                                { $unwind: '$masternode' },


                            ]
                        }
                    },
                    { $unwind: '$cluster' }

                ]
            }
        },
        {
            $lookup: {
                from: 'cas',
                as: 'basicca',
                let: { basiccaId: '$caId' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$basiccaId'] } } },
                    {
                        $lookup: {
                            from: 'clusters',
                            as: 'cluster',
                            let: { clusterId: '$clusterId' },
                            pipeline: [
                                { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                                {
                                    $lookup: {
                                        from: 'vms',
                                        as: 'masternode',
                                        let: { master_node: '$master_node' },
                                        pipeline: [
                                            {
                                                $match: { $expr: { $eq: ['$_id', '$$master_node'] } },

                                            },
                                            {
                                                $project: { ip: 1, password: 1 }
                                            }
                                        ]
                                    }
                                },
                                {
                                    $project: { name: 1, masternode: 1 }
                                },
                                { $unwind: '$masternode' },


                            ]
                        }
                    },
                    { $unwind: '$cluster' }

                ]
            }
        },
        {
            $lookup: {
                from: 'networks',
                as: 'network',
                let: { networkId: '$networkId' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$_id', '$$networkId'] } } }
                ]
            }
        },
        { $unwind: '$network' },
        { $unwind: '$organisation' },
        { $unwind: '$basicca' },
        { $unwind: '$tlsca' }
    ]);
    return channelDetailArray;
}


async function signChannelTransaction(data, channelName) {
    try {
        const walletPath = `${os.homedir}/${config.home}/${data.network.namespace}/${data.name}-${data.ca.name}/wallet`;
        const basePath = `${os.homedir}/${config.home}/channel/${channelName}`;
        const ccpPath = `${basePath}/${data.name}/config.json`;
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        const FinalConfigEnvelopePbPath = `${basePath}/${channelName}_envelopefinalconfig.pb`;
        const envelope = fs.readFileSync(FinalConfigEnvelopePbPath);

        // const wallet = new FileSystemWallet(walletPath);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: data.admin.admnId,
            discovery: { enabled: true, asLocalhost: false },
        });
        // const client = gateway.getClient();
        /**
             * changes accroding to the fabric 2.x
             */
        const testbasePath = `${utils.getCaBasePath(
            data.network.namespace,
            data.ca.name
        )}`;
        const tlsPath = `${testbasePath}/tls-cert.pem`;

        const caInfo = ccp.certificateAuthorities[data.ca.name];
        const caTLSCACerts = fs.readFileSync(tlsPath);

        const caService = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );
        let channelConfig = caService.extractChannelConfig(envelope);
        let signature = caService.signChannelConfig(channelConfig);
        gateway.disconnect();
        return signature;
    } catch (error) {
        // eslint-disable-next-line no-throw-literal
        throw 'Unable to retrive signature';
    }

}





module.exports = {
    createChannelData,
    joinChannelData,
    setAnchorPeer,
    updateAnchorPeers,
    generateChannelTx,
    writeChannelConnectionJsonOrgWise,
    writeExportedChannelConnectionJson,
    getMspConfigtx,
    generateOrgConfig,
    generateExternalOrgConfig,
    convertConfigToJson,
    convertConfigJsonToPb,
    generateFinalChannelPb,
    convertFinalConfigToJson,
    addEnvelopeToConfig,
    EnvelopeConfigToPb,
    addChannelInfoToconfig,
    addPeerinCcp,
    fetchChannelPrereqsiteData,
    fetchordernodeDetail,
    signChannelTransaction
};
