'use strict';
const mongoose = require('mongoose'); //orm for database
const {
    channel,
    channelPeer
} = require('./channelModel'); // require model users
const ordererModel = require('../orderingService/ordererModel');
const peerModel = require('../peerManager/peerModel');
const orgModel = require('../orgManager/orgModel');
const caModel = require('./../caManager/caModel');
const Cluster = require('../cluster/clusterModel');
const Network = require('../network/networkmodel');
const ChannelControllerHelper = require('./channelControllerhelper')
const utils = require('../../utils/utils.js');
// const {
//     FileSystemWallet,
//     Gateway
// } = require('fabric-network');
const { Wallets, Gateway } = require('fabric-network');
// const { Wallets, FileSystemWallet, Gateway } = require('fabric-network');
const FabricCAServices = require('fabric-ca-client');
const peerKubeRepos = require('../repositry/kubernetes/peerKubeRepos');
const KubernetesRepository = require('../repositry/kubernetes/ordererKubernetesRepo');
const logger = require('../repositry/utils').getLogger('ChaincodeController');
const fs = require('fs');
const os = require('os');
const config = require('../../config');
const ErrorHandler = require('../repositry/errorhandler');
const Exception = require("../errors/errors");

const configtx = require('./channelConfigtx');
const channelConfigtx = require('../orderingService/configtx');
const cluster = require('../cluster/clusterModel');
const NetworkController = require('../network/networkController');

class ChannelController {
    // List of channels from database
    static async listChannels() {
        try {
            let allChannels = await channel.aggregate([{
                $lookup: {
                    from: 'channelpeers',
                    localField: '_id',
                    foreignField: 'channelId',
                    as: 'channelorgs',
                },
            },
            {
                $lookup: {
                    from: 'organisations',
                    as: 'organisations',
                    let: {
                        orgid: '$operators'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $in: ['$_id', '$$orgid']
                            }
                        }
                    },]
                }
            },
            {
                $lookup: {
                    from: 'ordererservices',
                    as: 'ordererservices',
                    let: {
                        ordererserviceId: '$ordererserviceId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ['$_id', '$$ordererserviceId']
                            }
                        }
                    },]
                }
            },
            {
                $unwind: {
                    "path": "$ordererservices",
                    "preserveNullAndEmptyArrays": true
                }
            }
            ]);
            return allChannels;
        } catch (error) {
            return ErrorHandler.handleError(error);
        }
    }
    
    static async listChannelsByNetwork(data) {
        try {


            let ordererList = await ordererModel.ordererService.find({
                networkId: mongoose.Types.ObjectId(data.networkId)
            });
            if (!ordererList) {
                return Promise.reject({
                    message: 'Ordering Service  does not exists in the network',
                    httpStatus: 400,
                });
            }
            let ordererServicesId = []
            ordererList.forEach(orderer => {
                ordererServicesId.push(orderer._id)
            });

            let allChannels = await channel.aggregate([{

                $match: {
                    ordererserviceId: {
                        $in: ordererServicesId
                    }
                },
            },
            {
                $lookup: {
                    from: 'channelpeers',
                    localField: '_id',
                    foreignField: 'channelId',
                    as: 'channelorgs',
                },
            },
            {
                $lookup: {
                    from: 'organisations',
                    as: 'organisations',
                    let: {
                        orgid: '$operators'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $in: ['$_id', '$$orgid']
                            }
                        }
                    },]
                }
            },
            {
                $lookup: {
                    from: 'ordererservices',
                    as: 'ordererservices',
                    let: {
                        ordererserviceId: '$ordererserviceId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ['$_id', '$$ordererserviceId']
                            }
                        }
                    },]
                }
            },
            {
                $unwind: '$ordererservices'
            }
            ]);
            return allChannels;
        } catch (error) {
            return ErrorHandler.handleError(error);
        }
    }






    // List of orderers
    static async listOrderingServiceConsortium(data) {
        const method = 'listOrderingServiceConsortium';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let ordererDetail = await ordererModel.ordererService.aggregate([{
                $match: {
                    _id: mongoose.Types.ObjectId(data._id)
                },
            },
            {
                $lookup: {
                    from: 'organisations',
                    as: 'organisations',
                    let: {
                        consortium: '$consortium'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $in: ['$_id', '$$consortium']
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'cas',
                            as: 'ca',
                            let: {
                                caId: '$caId'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$caId']
                                    }
                                }
                            }]
                        }
                    },
                    {
                        $lookup: {
                            from: 'cas',
                            as: 'tlsCa',
                            let: {
                                tlsCaId: '$tlsCaId'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$tlsCaId']
                                    }
                                }
                            }]
                        }
                    },
                    {
                        $lookup: {
                            from: 'networks',
                            as: 'network',
                            let: {
                                networkId: '$networkId'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$networkId']
                                    }
                                }
                            }]
                        }
                    },
                    {
                        $lookup: {
                            from: 'clusters',
                            as: 'cluster',
                            let: {
                                clusterId: '$clusterId'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$clusterId']
                                    }
                                }
                            },
                            {
                                $project: {
                                    configuration: 0
                                }
                            }
                            ]
                        }
                    },

                    {
                        $lookup: {
                            from: 'orgadmins',
                            as: 'admin',
                            let: {
                                admnId: '$adminId'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$admnId']
                                    }
                                }
                            },
                            {
                                $project: {
                                    tlsCacerts: 0,
                                    tlsPrimaryKey: 0,
                                    tlsSignCert: 0,
                                    cacets: 0,
                                    primaryKey: 0,
                                    signCert: 0
                                }
                            },
                            ]
                        }
                    },
                    {
                        $lookup: {
                            from: 'peers',
                            as: 'peer',
                            let: {
                                orgId: '$_id'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$orgId', '$$orgId']
                                    }
                                }
                            },
                            {
                                $sort: {
                                    created_at: 1
                                }
                            },
                            {
                                $project: {
                                    tlsCacerts: 0,
                                    tlsPrimaryKey: 0,
                                    tlsSignCert: 0,
                                    cacets: 0,
                                    primaryKey: 0,
                                    signCert: 0
                                }
                            },
                                // { $limit: 1 }
                            ]
                        }
                    },
                    // { $unwind: '$peer' },
                    {
                        $unwind: '$ca'
                    },
                    {
                        $unwind: '$admin'
                    },
                    {
                        $unwind: '$tlsCa'
                    },
                    {
                        $unwind: '$cluster'
                    },
                    {
                        $unwind: '$network'
                    },
                    ]
                },
            },
            ]);
            logger.debug('%s - Channel information %j', method, ordererDetail);
            return Promise.resolve({
                message: 'Channel information saved ',
                data: ordererDetail,
                httpStatus: 200,
            });
        } catch (error) {
            logger.debug('%s - Channel information error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    // SAve information about the channel it will just save infomration in db
    static async saveChannelInfo(data) {
        const method = 'saveChannelInfo';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            // Prepare the data

            let organisationSet = new Set();
            console.log(organisationSet);
            let channelData = {
                name: data.name,
                ordererserviceId: data.ordererserviceId,
                status: 0,
                operators: data.operators
            };


            let peerList = await peerModel.find({
                orgId: {
                    $in: data.operators
                }
            });
            console.log(peerList);
            peerList.forEach(peer => {
                organisationSet.add(JSON.stringify(peer.orgId));
            });

            for (let i = 0; i < data.operators.length; i++) {
                let orgId = data.operators[i];
                //console.log(organisationSet.has(orgId));
                if (!organisationSet.has(JSON.stringify(orgId))) {
                    return Promise.reject({
                        message: `${orgId} must have atleast one peer`,
                        httpStatus: 400,
                    });
                }
            }

            //check if all the operators organisation are already memeber of the consortium
            //or not

            let ordererDetail = await ordererModel.ordererService.findOne({
                _id: data.ordererserviceId,
                consortium: {
                    $all: data.operators
                }
            });
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering Service  does not exists or operators are not consortium members',
                    httpStatus: 400,
                });
            }

            let savedChannel = await channel.findOne({
                name: channelData.name
            });
            if (savedChannel) {
                return Promise.reject({
                    message: 'Channel already exists with same name',
                    httpStatus: 400,
                });
            }
            let result = await channel.create(channelData);
            logger.debug('%s - Channel info saved %j', method, channelData);
            return Promise.resolve({
                message: 'Channel information saved ',
                data: result,
                httpStatus: 200,
            });
        } catch (error) {
            logger.debug('%s - Channel info save error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    //fetch the channel prerequisite data



    /**
     *  create channel tx to create channel
     */
    static async createChannelTx(data) {
        const method = 'createChannelTx';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            // Prepare the data

            let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
            if (!channelDetailArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let channelDetail = channelDetailArray[0];
            console.log("channelDetail :", channelDetail)
            let ordererDetail = await ordererModel.ordererService
                .findById(channelDetail.ordererserviceId)
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId')
                .populate('networkId');
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }

            // console.log(ordererDetail._id);
            let orderernodeArray = await configtx.fetchordernodeDetail(ordererDetail._id);


            if (!orderernodeArray.length) {
                return Promise.reject({
                    message: 'No Ordering node exists',
                    httpStatus: 400,
                });
            }
            let orderernode = orderernodeArray[0];

            const genesisFilePathbasePath = utils.getBasePath(ordererDetail.networkId.namespace, ordererDetail.orgId
                .name, ordererDetail.caId
                .name);
            const genesisFilePath = `${genesisFilePathbasePath}/wallet`;

            // let genesisFilePath = `${os.homedir}/${config.home}/${ordererDetail.orgId
            //     .name}-${ordererDetail.caId.name}/channel-artifacts`;


            const channelTxPath = `${os.homedir}/Documents/channel/${channelDetail.name}`;

            if (!fs.existsSync(`${os.homedir}/Documents/channel`)) {
                fs.mkdirSync(`${os.homedir}/Documents/channel`);
            }
            if (!fs.existsSync(channelTxPath)) {
                fs.mkdirSync(channelTxPath);
            }
            let channelProfile = channelConfigtx.getChannelTx(channelDetail);

            await utils.writeYaml2(`${genesisFilePath}/configtx.yaml`, channelProfile);
            let channelTxData = configtx.generateChannelTx(
                genesisFilePath,
                channelTxPath,
                channelDetail
            );
            
            console.log("======================channelTxData===================== :", channelTxData)
            logger.debug('%s - successfully generated  %j', method, orderernodeArray);
            await configtx.writeChannelConnectionJsonOrgWise(
                channelDetail,
                orderernode
            );

            return Promise.resolve({
                message: 'Success',
                data: orderernodeArray,
                httpStatus: 200
            });
        } catch (err) {
            logger.debug('%s - error  %j', method, err);
            return Promise.reject({
                message: err.message,
                httpStatus: 400
            });
        }
    }

    // /**
    //  *  create channel on the orderer without any organisation
    //  */
    // static async createChannel(data) {
    //     const method = 'createChannel';
    //     logger.debug('%s - start', method);
    //     logger.debug('%s - has received the parameters %j', method, data);
    //     try {
    //         let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
    //         if (!channelDetailArray.length) {
    //             return Promise.reject({
    //                 message: 'Channel does not exists',
    //                 httpStatus: 400,
    //             });
    //         }
    //         let channelDetail = channelDetailArray[0];
    //         if (!channelDetail) {
    //             return Promise.reject({
    //                 message: 'channel  does not exists',
    //                 httpStatus: 400,
    //             });
    //         }
    //         let organisations = channelDetailArray[0].organisations;
    //         if (!organisations.length) {
    //             return Promise.reject({
    //                 message: 'Add atleast one organisation in the channel',
    //                 httpStatus: 400,
    //             });
    //         }
    //         let organisation = organisations[0];

    //         if (channelDetail.status == 1) {
    //             return Promise.reject({
    //                 message: 'channel  already Created on network',
    //                 httpStatus: 400,
    //             });
    //         }

    //         let ordererDetail = await ordererModel.ordererService
    //             .findById({
    //                 _id: channelDetail.ordererserviceId
    //             })
    //             .populate({
    //                 path: 'orgId',
    //                 populate: {
    //                     path: 'adminId'
    //                 },
    //             })
    //             .populate('caId')
    //             .populate('tlsCaId');
    //         // console.log(ordererDetail)
    //         if (!ordererDetail) {
    //             return Promise.reject({
    //                 message: 'Ordering service does not exists',
    //                 httpStatus: 400,
    //             });
    //         }

    //         let orderernode = await ordererModel.ordererNode.findOne({
    //             orderingServiceId: ordererDetail._id,
    //         }).populate('orgId')
    //             .populate('caId')
    //             .populate('tlsCaId');

    //         if (!orderernode) {
    //             return Promise.reject({
    //                 message: 'No Ordering node exists',
    //                 httpStatus: 400,
    //             });
    //         }
    //         console.log("organization data in create channel :", organisation)
    //         const basePath = `${os.homedir}/Documents/channel/${channelDetail.name}`;
    //         const ccpPath = `${basePath}/${organisation.name}/config.json`;

    //         if (!fs.existsSync(ccpPath)) {
    //             return Promise.resolve({
    //                 message: 'create Channel transaction first',
    //                 httpStatus: 400,
    //             });
    //         }

    //         const channelTxFile = `${basePath}/channel.tx`;
    //         const envelope = fs.readFileSync(channelTxFile);
    //         const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    //         const ccp = JSON.parse(ccpJSON);
    //         console.log("ccp :", ccp)

            

    //         // const walletPath = `${os.homedir}/${config.home}/${organisation.
    //         //     name}-${organisation.ca.name}/wallet`;
    //         const walletbasePath = utils.getBasePath(organisation.network.namespace, organisation.name, organisation.ca.name);
    //         console.log("walletbasePath in createChannel :", walletbasePath)
    //         const walletPath = `${walletbasePath}/wallet`;

    //         // const wallet = new FileSystemWallet(walletPath);
    //         const wallet = await Wallets.newFileSystemWallet(walletPath);
    //         console.log("wallet in createChannel :", wallet)
    //         console.log("identity :", organisation.admin.admnId);
    //         var gatewayOptions = {
    //             identity: organisation.admin.admnId,
    //             wallet: wallet,
    //         };
    //         console.log("gatewayOptions :", gatewayOptions)
    //         const gateway = new Gateway();
    //         console.log("gateway :", gateway)
    //         console.log("identity :", organisation.admin.admnId)
	// 		await gateway.connect(ccp, {
    //             wallet,
    //             identity: organisation.admin.admnId,
    //             discovery: {
    //                 enabled: true,
    //                 asLocalhost: true
    //             }
    //         });
    //         console.log("justt check")
            
    //         // const client = gateway.getClient();
    //         // Create a new CA client for interacting with the CA.

    //         /**
    //          * changes accroding to the fabric 2.x
    //          */
    //         // const testbasePath = `${utils.getCaBasePath(
	// 		// 	organisation.network.namespace,
	// 		// 	organisation.ca.name
	// 		// )}`;
    //         // console.log("testbasePath :", testbasePath)
    //         // const tlsPath = `${testbasePath}/tls-cert.pem`;

	// 		// const caInfo = ccp.certificateAuthorities[organisation.ca.name];
    //         // console.log("caInfo" , caInfo)
	// 		// const caTLSCACerts = fs.readFileSync(tlsPath);

	// 		// const caService = new FabricCAServices(
	// 		// 	caInfo.url,
	// 		// 	{ trustedRoots: caTLSCACerts, verify: false },
	// 		// 	caInfo.caName
	// 		// );

    //         // Create a new channel client
    //         const channelName = 'testchannel';
    //         console.log("channelName :", channelName)
    //         const ordererName = orderernode.name
    //         console.log("testing ")
    //         console.log("ordererName :", ordererName)
    //         const network = await gateway.getNetwork(organisation.network.namespace);
    //         console.log("network :", JSON.stringify(network))
    //         const client = network.getChannel().getClient();
    //         console.log("client :", client)

    //         // const envelopeBytes = fs.readFileSync(envelope);
    //         const configUpdate = client.extractChannelConfig(envelope);
    //         console.log("configUpdate :", configUpdate)
    //         const signatures = client.signChannelConfig(configUpdate);
    //         console.log("signatures :", signatures)
    //         const request = {
    //             config: configUpdate,
    //             signatures: signatures,
    //             name: channelName,
    //             orderer: ordererName,
    //             txId: client.newTransactionID()
    //         };


    //         // console.log("caService in createChannel :", caService)
    //         // const ordererFetch = caService.getOrderer(orderernode.name);
    //         // console.log("ordererFetch in createChannel :", ordererFetch)
    //         // let channelConfig = caService.extractChannelConfig(envelope);
    //         // let signature = caService.signChannelConfig(channelConfig);
    //         // let request = {
    //         //     config: channelConfig,
    //         //     orderer: ordererFetch,
    //         //     signatures: [signature],
    //         //     name: channelDetail.name,
    //         //     txId: caService.newTransactionID(true),
    //         // };
    //         // create  Channel  request
    //         const result = await caService.createChannel(request);
    //         console.log("result in create channel :", result);
    //         console.log(result.status);
    //         if (result.status === 'SUCCESS') {
    //             logger.debug('%s - channel creation result %j', method, result);

    //             console.log('here');
    //             // Update connection profile after channel creation
    //             configtx.addChannelInfoToconfig(channelDetail, orderernode);
    //             // add all the organisations to the peer channnel so that later on we can
    //             //check which organisation config has been upadted

    //             let operatorOrgs = channelDetail.organisations;
    //             for (let i = 0; i < operatorOrgs.length; i++) {
    //                 let org = operatorOrgs[i];
    //                 let ChannelPeerData = {
    //                     channelId: data.channelId,
    //                     orgId: org._id,
    //                     anchorpeer: org.peer._id,
    //                     configupdate: 1
    //                 };
    //                 console.log(ChannelPeerData);
    //                 await channelPeer.create(ChannelPeerData);
    //                 logger.debug('%s - channel peer creation result %j', method, ChannelPeerData);
    //                 // console.log('Successfully created');
    //             }
    //             console.log('begin channel saved');
    //             console.log(channelDetail);
    //             await channel.updateOne({
    //                 _id: data.channelId
    //             }, {
    //                 status: 1
    //             });
    //             console.log('channel saved');
    //             return Promise.resolve({
    //                 message: result,
    //                 httpStatus: 200,
    //             });
    //         }
    //         logger.debug('%s - error %j', method, result);
    //         return Promise.reject({
    //             message: result,
    //             httpStatus: 400,
    //         });
    //     } catch (error) {
    //         logger.debug('%s - error %j', method, error);
    //         return Promise.reject({
    //             message: error,
    //             httpStatus: 400,
    //         });
    //     }
    // }

    /**
     * 
     * ============================== channel creation changes using fabric version 2.x =================================
     */

     static async createChannel(data) {
        const method = 'createChannel';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
            if (!channelDetailArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let channelDetail = channelDetailArray[0];
            if (!channelDetail) {
                return Promise.reject({
                    message: 'channel  does not exists',
                    httpStatus: 400,
                });
            }
            let organisations = channelDetailArray[0].organisations;
            if (!organisations.length) {
                return Promise.reject({
                    message: 'Add atleast one organisation in the channel',
                    httpStatus: 400,
                });
            }
            let organisation = organisations[0];

            if (channelDetail.status == 1) {
                return Promise.reject({
                    message: 'channel  already Created on network',
                    httpStatus: 400,
                });
            }

            let ordererDetail = await ordererModel.ordererService
                .findById({
                    _id: channelDetail.ordererserviceId
                })
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('tlsCaId');
            // console.log(ordererDetail)
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }

            let orderernode = await ordererModel.ordererNode.findOne({
                orderingServiceId: ordererDetail._id,
            }).populate('orgId')
                .populate('caId')
                .populate('tlsCaId');

            if (!orderernode) {
                return Promise.reject({
                    message: 'No Ordering node exists',
                    httpStatus: 400,
                });
            }
            console.log("organization data in create channel :", organisation)
            const basePath = `${os.homedir}/Documents/channel/${channelDetail.name}`;
            
            console.log("just test")
            const result = await configtx.createChannelData(basePath, organisation, orderernode, channelDetail.name);
            // const result = await caService.createChannel(request);
            console.log("result in create channel :", result);
            console.log(result.status);
            if (result.status === 'SUCCESS') {
                logger.debug('%s - channel creation result %j', method, result);

                console.log('here');
                // Update connection profile after channel creation
                configtx.addChannelInfoToconfig(channelDetail, orderernode);
                // add all the organisations to the peer channnel so that later on we can
                //check which organisation config has been upadted

                let operatorOrgs = channelDetail.organisations;
                for (let i = 0; i < operatorOrgs.length; i++) {
                    let org = operatorOrgs[i];
                    let ChannelPeerData = {
                        channelId: data.channelId,
                        orgId: org._id,
                        anchorpeer: org.peer._id,
                        configupdate: 1
                    };
                    console.log(ChannelPeerData);
                    await channelPeer.create(ChannelPeerData);
                    logger.debug('%s - channel peer creation result %j', method, ChannelPeerData);
                    // console.log('Successfully created');
                }
                console.log('begin channel saved');
                console.log(channelDetail);
                await channel.updateOne({
                    _id: data.channelId
                }, {
                    status: 1
                });
                console.log('channel saved');
                return Promise.resolve({
                    message: result,
                    httpStatus: 200,
                });
            }
            logger.debug('%s - error %j', method, result);
            return Promise.reject({
                message: result,
                httpStatus: 400,
            });
        } catch (error) {
            logger.debug('%s - error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    /**
     *  get latest channel configuration for adding new organisation
     */
    static async getChannelConfig(data) {
        const method = 'getChannelConfig';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
            if (!channelDetailArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let channelDetail = channelDetailArray[0];
            let organisations = channelDetail.organisations;
            if (!organisations.length) {
                return Promise.reject({
                    message: 'Add atleast one organisation in the channel',
                    httpStatus: 400,
                });
            }
            let organisation = organisations[0];
            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            const ccpPath = `${basePath}/${organisation.name}/config.json`;
            const ccpJSON = fs.readFileSync(ccpPath, "utf8");
			const ccp = JSON.parse(ccpJSON);
            const walletbasePath = utils.getBasePath(organisation.network.namespace, organisation.name, organisation.ca.name);
            const walletPath = `${walletbasePath}/wallet`;
            // const wallet = new FileSystemWallet(walletPath); 
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: organisation.admin.admnId,
                discovery: {
                    enabled: true,
                    asLocalhost: false
                },
            });
            // const client = gateway.getClient();
            /**
             * changes accroding to the fabric 2.x
             */
             const testbasePath = `${utils.getCaBasePath(
				organisation.network.namespace,
				organisation.ca.name
			)}`;
            const tlsPath = `${testbasePath}/tls-cert.pem`;

			const caInfo = ccp.certificateAuthorities[organisation.ca.name];
			const caTLSCACerts = fs.readFileSync(tlsPath);

			const caService = new FabricCAServices(
				caInfo.url,
				{ trustedRoots: caTLSCACerts, verify: false },
				caInfo.caName
			);

            const ChannelConfigPath = `${basePath}/${channelDetail.name}_config.pb`;
            const ChannelConfigJsonPath = `${basePath}/${channelDetail.name}_config.json`;
            const channelObject = caService.getChannel(channelDetail.name);
            const latestConfig = await channelObject.getChannelConfigFromOrderer();
            console.log(latestConfig);
            const latestConfigBuffer = latestConfig.toBuffer();
            fs.writeFileSync(ChannelConfigPath, latestConfigBuffer);
            configtx.convertConfigToJson(ChannelConfigPath, ChannelConfigJsonPath);
            logger.debug('%s - Success %j', method, channelDetail);
            return Promise.resolve({
                message: 'latestConfig fetched',
                httpStatus: 200,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    /**
     *  create channel on the orderer without any organisation
     */
    static async createOrgConfigtx(data) {
        const method = 'createOrgConfigtx';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetail = await channel.findOne({
                _id: data.channelId
            });
            if (!channelDetail) {
                return Promise.reject({
                    message: 'channel  does not exists',
                    httpStatus: 400,
                });
            }

            let peerDetails = await peerModel
                .findById({
                    _id: data.anchorpeerId
                })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId')
                .populate('clusterId')
                .populate('networkId');
            if (!peerDetails) {
                return Promise.reject({
                    message: 'peer does not exists',
                    httpStatus: 400,
                });
            }
            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            let orgMspPath = utils.getBasePath(peerDetails.networkId.namespace, peerDetails.orgId.name, peerDetails.caId.name)
            let configFileData = configtx.getMspConfigtx(peerDetails, `${orgMspPath}/msp`);
            let orgConfigtxPath = `${basePath}/${peerDetails.orgId
                .name}/configtx.yaml`;
            let channelTxPath = `${basePath}/${peerDetails.orgId.name}`;
            await utils.writeYaml2(orgConfigtxPath, configFileData);
            configtx.generateOrgConfig(peerDetails, channelTxPath);
            logger.debug('%s - success %j', method, peerDetails);
            return Promise.resolve({
                message: peerDetails,
                httpStatus: 200
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    /**
     *  generate channel configuration for organisation
     */
    static async addOrgToChannelConfig(data) {
        const method = 'addOrgToChannelConfig';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetail = await channel.findOne({
                _id: data.channelId
            });
            if (!channelDetail) {
                return Promise.reject({
                    message: 'channel  does not exists',
                    httpStatus: 400,
                });
            }
            let peerDetails = await peerModel
                .findById({
                    _id: data.anchorpeerId
                })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId')
                .populate('clusterId')
                .populate('networkId');
            if (!peerDetails) {
                return Promise.reject({
                    message: 'peer does not exists',
                    httpStatus: 400,
                });
            }

            let organisation = await channelPeer.findOne({
                channelId: data.channelId,
                orgId: peerDetails.orgId._id,
            });

            if (organisation) {

                return Promise.reject({
                    message: 'organisation already exist in the Channel ',
                    httpStatus: 400,
                });
            } else {
                const AnchorPeerDetail = {
                    mod_policy: 'Admins',
                    value: {
                        anchor_peers: [{
                            host: peerDetails.peer_enroll_id,
                            port: peerDetails.peerport,
                        },],
                    },
                    version: '0',
                };
                const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
                let orgConfig = `${basePath}/${peerDetails.orgId.name}/${peerDetails
                    .orgId.name}.json`;
                const ChannelConfigJsonPath = `${basePath}/${channelDetail.name}_config.json`;
                const ChannelConfigPbPath = `${basePath}/${channelDetail.name}_config.pb`;
                const UpdateConfigJsonPath = `${basePath}/${channelDetail.name}_updatedconfig.json`;
                const UpdateConfigPbPath = `${basePath}/${channelDetail.name}_updatedconfig.pb`;
                const FinalConfigPbPath = `${basePath}/${channelDetail.name}_finalconfig.pb`;
                const FinalConfigJsonPath = `${basePath}/${channelDetail.name}_finalconfig.json`;
                const FinalConfigEnvelopeJsonPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.json`;
                const FinalConfigEnvelopePbPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.pb`;
                // Code snippet to combine organisation config with channel config
                let orgConfigrawdata = fs.readFileSync(orgConfig);
                let orgConfigdata = JSON.parse(orgConfigrawdata);
                orgConfigdata.values.AnchorPeers = AnchorPeerDetail;
                let ChannelConfigrawdata = fs.readFileSync(ChannelConfigJsonPath);
                let ChannelConfigdata = JSON.parse(ChannelConfigrawdata);
                ChannelConfigdata.channel_group.groups.Application.groups[
                    peerDetails.orgId.mspId
                ] = orgConfigdata;
                let finalConfigUpdate = JSON.stringify(ChannelConfigdata);
                fs.writeFileSync(UpdateConfigJsonPath, finalConfigUpdate);

                // Steps to add new organisation to channel config
                await configtx.convertConfigJsonToPb(
                    UpdateConfigJsonPath,
                    UpdateConfigPbPath
                );
                await configtx.convertConfigJsonToPb(
                    ChannelConfigJsonPath,
                    ChannelConfigPbPath
                );
                await configtx.generateFinalChannelPb(
                    ChannelConfigPbPath,
                    UpdateConfigPbPath,
                    FinalConfigPbPath,
                    channelDetail.name
                );
                await configtx.convertFinalConfigToJson(
                    FinalConfigPbPath,
                    FinalConfigJsonPath
                );
                await configtx.addEnvelopeToConfig(
                    FinalConfigJsonPath,
                    FinalConfigEnvelopeJsonPath,
                    channelDetail.name
                );
                await configtx.EnvelopeConfigToPb(
                    FinalConfigEnvelopeJsonPath,
                    FinalConfigEnvelopePbPath
                );

                let ChannelPeerData = {
                    channelId: data.channelId,
                    orgId: peerDetails.orgId._id,
                    anchorpeer: data.anchorpeerId,
                };
                await channelPeer.create(ChannelPeerData);
            }
            logger.debug('%s - Success %j', method, organisation);
            return Promise.resolve({
                message: 'file update successfully',
                httpStatus: 200,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }
    /**
     *  Add organisation as Admin in channel Confogration file
     */
    static async addOrgAsChannelOperator(data) {
        const method = 'addOrgAsChannelOperator';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetail = await channel.findOne({
                _id: data.channelId
            });
            if (!channelDetail) {
                return Promise.reject({
                    message: 'channel  does not exists',
                    httpStatus: 400,
                });

            }

            let Organisation = await orgModel.findOne({
                _id: data.orgId
            });

            if (!Organisation) {
                return Promise.reject({
                    message: 'organisation  does not exists',
                    httpStatus: 400,
                });

            }

            let CheckOrg = await channelPeer.findOne({
                channelId: data.channelId,
                orgId: data.orgId,
                configupdate: 1
            });

            if (!CheckOrg) {
                return Promise.reject({
                    message: 'Organisation is not member of the channel',
                    httpStatus: 400,
                });

            }

            if (channelDetail.operators.includes(data.orgId)) {

                return Promise.reject({
                    message: 'Organisation is already Channel Admin',
                    httpStatus: 400,
                });

            }

            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            const ChannelConfigJsonPath = `${basePath}/${channelDetail.name}_config.json`;
            const ChannelConfigPbPath = `${basePath}/${channelDetail.name}_config.pb`;
            const UpdateConfigJsonPath = `${basePath}/${channelDetail.name}_updatedconfig.json`;
            const UpdateConfigPbPath = `${basePath}/${channelDetail.name}_updatedconfig.pb`;
            const FinalConfigPbPath = `${basePath}/${channelDetail.name}_finalconfig.pb`;
            const FinalConfigJsonPath = `${basePath}/${channelDetail.name}_finalconfig.json`;
            const FinalConfigEnvelopeJsonPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.json`;
            const FinalConfigEnvelopePbPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.pb`;
            // Code snippet to add organisation details in config
            let ChannelConfigrawdata = fs.readFileSync(ChannelConfigJsonPath);
            let ChannelConfigdata = JSON.parse(ChannelConfigrawdata);
            let PolicyArray = ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value;

            let newOrg = {
                principal: {
                    msp_identifier: Organisation.mspId,
                    role: 'ADMIN'
                },
                principal_classification: 'ROLE'
            };

            let newOrgRule = {
                signed_by: PolicyArray.rule.n_out_of.n
            };
            PolicyArray.rule.n_out_of.n = PolicyArray.rule.n_out_of.n + 1;
            PolicyArray.rule.n_out_of.rules.push(newOrgRule);
            PolicyArray.identities.push(newOrg);


            ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value = PolicyArray;
            let finalConfigUpdate = JSON.stringify(ChannelConfigdata);
            fs.writeFileSync(UpdateConfigJsonPath, finalConfigUpdate);

            // Steps to generate to channel config with envelope
            await configtx.convertConfigJsonToPb(
                UpdateConfigJsonPath,
                UpdateConfigPbPath
            );
            await configtx.convertConfigJsonToPb(
                ChannelConfigJsonPath,
                ChannelConfigPbPath
            );
            await configtx.generateFinalChannelPb(
                ChannelConfigPbPath,
                UpdateConfigPbPath,
                FinalConfigPbPath,
                channelDetail.name
            );
            await configtx.convertFinalConfigToJson(
                FinalConfigPbPath,
                FinalConfigJsonPath
            );
            await configtx.addEnvelopeToConfig(
                FinalConfigJsonPath,
                FinalConfigEnvelopeJsonPath,
                channelDetail.name
            );
            await configtx.EnvelopeConfigToPb(
                FinalConfigEnvelopeJsonPath,
                FinalConfigEnvelopePbPath
            );

            logger.debug('%s - file generated successfully %j', method, newOrg);
            return Promise.resolve({
                message: 'file generated successfully',
                httpStatus: 200,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    /**
     *  Remove organisation from channel
     */

    static async removeOrgOrAdminFromChannel(data) {
        const method = 'removeOrgOrAdminFromChannel';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetail = await channel.findOne({
                _id: data.channelId
            });
            if (!channelDetail) {
                return Promise.reject({
                    message: 'channel  does not exists',
                    httpStatus: 400,
                });

            }

            let Organisation = await orgModel.findOne({
                _id: data.orgId
            });

            if (!Organisation) {
                return Promise.reject({
                    message: 'organisation  does not exists',
                    httpStatus: 400,
                });

            }

            let CheckOrg = await channelPeer.findOne({
                channelId: data.channelId,
                orgId: data.orgId,
                configupdate: 1
            });

            if (!CheckOrg) {
                return Promise.reject({
                    message: 'Organisation is not member of the channel',
                    httpStatus: 400,
                });

            }

            if (channelDetail.operators.length === 1 && channelDetail.operators.indexOf(data.orgId) !== -1) {
                return Promise.reject({
                    message: 'Organisation is the only operator of the channel',
                    httpStatus: 400,
                });
            }

            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            const ChannelConfigJsonPath = `${basePath}/${channelDetail.name}_config.json`;
            const ChannelConfigPbPath = `${basePath}/${channelDetail.name}_config.pb`;
            const UpdateConfigJsonPath = `${basePath}/${channelDetail.name}_updatedconfig.json`;
            const UpdateConfigPbPath = `${basePath}/${channelDetail.name}_updatedconfig.pb`;
            const FinalConfigPbPath = `${basePath}/${channelDetail.name}_finalconfig.pb`;
            const FinalConfigJsonPath = `${basePath}/${channelDetail.name}_finalconfig.json`;
            const FinalConfigEnvelopeJsonPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.json`;
            const FinalConfigEnvelopePbPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.pb`;
            // Code snippet to add organisation details in config

            let ChannelConfigrawdata = fs.readFileSync(ChannelConfigJsonPath);
            // console.log(ChannelConfigJsonPath);
            let ChannelConfigdata = JSON.parse(ChannelConfigrawdata);
            console.log(ChannelConfigdata);

            // eslint-disable-next-line no-prototype-builtins
            if (data.isRemoveOrg && ChannelConfigdata.channel_group.groups.Application.groups.hasOwnProperty(Organisation.mspId)) {
                delete ChannelConfigdata.channel_group.groups.Application.groups[Organisation.mspId];
            }
            let identitiesArray = ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value.identities;
            let orgPolicyPos = -1;
            for (let i = 0; i < identitiesArray.length; i++) {
                let identity = identitiesArray[i];
                if (identity.principal.msp_identifier === Organisation.mspId) {
                    orgPolicyPos = i;
                    break;
                }
            }
            let rules = []
            if (orgPolicyPos !== -1) {
                ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value.identities.splice(orgPolicyPos, 1);
                let idsLength = ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value.identities.length
                for (let i = 0; i < idsLength; i++) {
                    rules.push({
                        signed_by: i
                    })
                }
                ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.rules = rules
                ChannelConfigdata.channel_group.groups.Application.policies.Admins.policy.value.rule.n_out_of.n = idsLength;
            }
            let finalConfigUpdate = JSON.stringify(ChannelConfigdata);
            fs.writeFileSync(UpdateConfigJsonPath, finalConfigUpdate);

            // Steps to generate to channel config with envelope
            await configtx.convertConfigJsonToPb(
                UpdateConfigJsonPath,
                UpdateConfigPbPath
            );
            await configtx.convertConfigJsonToPb(
                ChannelConfigJsonPath,
                ChannelConfigPbPath
            );
            await configtx.generateFinalChannelPb(
                ChannelConfigPbPath,
                UpdateConfigPbPath,
                FinalConfigPbPath,
                channelDetail.name
            );
            await configtx.convertFinalConfigToJson(
                FinalConfigPbPath,
                FinalConfigJsonPath
            );
            await configtx.addEnvelopeToConfig(
                FinalConfigJsonPath,
                FinalConfigEnvelopeJsonPath,
                channelDetail.name
            );
            await configtx.EnvelopeConfigToPb(
                FinalConfigEnvelopeJsonPath,
                FinalConfigEnvelopePbPath
            );

            logger.debug('%s - file generated successfully %j', method, ChannelConfigdata);
            return Promise.resolve({
                message: 'file generated successfully',
                data: ChannelConfigdata,
                httpStatus: 200,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }


    /**
     *  update channel for adding new organisation as Admin
     */
    static async updateChannelPolicy(data) {
        const method = 'updateChannelPolicy';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
            if (!channelDetailArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let channelDetail = channelDetailArray[0];
            let organisations = channelDetail.organisations;
            if (!organisations.length) {
                return Promise.reject({
                    message: 'Add atleast one organisation in the channel',
                    httpStatus: 400,
                });
            }
            let Organisation = await orgModel.findOne({
                _id: data.orgId
            });
            if (!Organisation) {
                return Promise.reject({
                    message: 'organisation  does not exists',
                    httpStatus: 400,
                });

            }

            let CheckOrg = await channelPeer.findOne({
                channelId: data.channelId,
                orgId: data.orgId,
                configupdate: 1
            });

            if (!CheckOrg) {
                return Promise.reject({
                    message: 'Organisation is not member of the channel',
                    httpStatus: 400,
                });

            }
            if (channelDetail.operators.includes(data.orgId)) {
                return Promise.reject({
                    message: 'Organisation is already Channel Admin',
                    httpStatus: 400,
                });
            }
            let operatorPeerId = organisations[0].peer._id;
            let operatorPeerIdDetails = await peerModel
                .findById(operatorPeerId)
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('clusterId')
                .populate('networkId');
            if (!operatorPeerIdDetails) {
                return Promise.reject({
                    message: 'peer does not exists',
                    httpStatus: 400,
                });
            }
            let ordererDetail = await ordererModel.ordererService
                .findById(channelDetail.ordererserviceId)
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('tlsCaId');
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }
            let orderernode = await ordererModel.ordererNode.findOne({
                orderingServiceId: ordererDetail._id,
            })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId');
            const walletbasePath = utils.getBasePath(operatorPeerIdDetails.networkId.namespace, operatorPeerIdDetails.orgId
                .name, operatorPeerIdDetails.caId.name);
            const walletPath = `${walletbasePath}/wallet`;

            // const walletPath = `${os.homedir}/${config.home}/${operatorPeerIdDetails.orgId
            //     .name}-${operatorPeerIdDetails.caId.name}/wallet`;
            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            const ccpPath = `${basePath}/${operatorPeerIdDetails.orgId
                .name}/config.json`;
            const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
            const ccp = JSON.parse(ccpJSON);
            const FinalConfigEnvelopePbPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.pb`;
            const envelope = fs.readFileSync(FinalConfigEnvelopePbPath);

            // const wallet = new FileSystemWallet(walletPath);
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: operatorPeerIdDetails.orgId.adminId.admnId,
                discovery: {
                    enabled: true,
                    asLocalhost: false
                },
            });
            console.log(operatorPeerIdDetails.orgId.adminId.admnId);
            // const client = gateway.getClient();
            /**
             * changes accroding to the fabric 2.x
             */
            const testbasePath = `${utils.getCaBasePath(
				operatorPeerIdDetails.networkId.namespace,
				operatorPeerIdDetails.caId.name
			)}`;
            const tlsPath = `${testbasePath}/tls-cert.pem`;

			const caInfo = ccp.certificateAuthorities[operatorPeerIdDetails.caId.name];
			const caTLSCACerts = fs.readFileSync(tlsPath);

			const caService = new FabricCAServices(
				caInfo.url,
				{ trustedRoots: caTLSCACerts, verify: false },
				caInfo.caName
			);
            const ordererFetch = caService.getOrderer(orderernode.name);
            let channelConfig = caService.extractChannelConfig(envelope);
            const signatures = [];
            console.log(organisations);
            for (let i = 0; i < organisations.length; i++) {
                let org = organisations[i];
                signatures.push(await configtx.signChannelTransaction(org, channelDetail.name));
            }
            console.log(signatures.length);
            const result = await caService.updateChannel({
                config: channelConfig,
                //envelope: envelope,
                orderer: ordererFetch,
                signatures: signatures,
                name: channelDetail.name,
                txId: caService.newTransactionID(true),
            });

            await gateway.disconnect();
            let info;
            if (result.status === 'SUCCESS') {
                if (data.isRemoveOrg == true || data.isRemoveAdmin == true) {
                    info = 'Update your chaincode endorsement policies if the existing organisation msp was part of it';
                    let channelDetails = await channel.findOne({
                        _id: data.channelId
                    });
                    let pos = channelDetails.operators.indexOf(data.orgId);
                    if (pos !== -1) {
                        channelDetails.operators.splice(pos, 1);
                    }
                    await channelDetails.save();

                    if (data.isRemoveOrg) {

                        await channelPeer.remove({
                            orgId: data.orgId
                        });

                    }

                } else {
                    info = 'Update your chaincode endorsement policies if you want this organisation to endorse transactions';
                    let channelDetails = await channel.findOne({
                        _id: data.channelId
                    });
                    channelDetails.operators.push(data.orgId);
                    await channelDetails.save();
                }
                logger.debug('%s - Success', method);
                return Promise.resolve({
                    message: info,
                    data: result,
                    httpStatus: 200
                });

            }

            return Promise.reject({
                message: result.info,
                httpStatus: 400,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }

    /**
     *  update channel  as per latest channel configuration for organisation
     */
    static async updateChannel(data) {
        const method = 'updateChannel';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
            if (!channelDetailArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let channelDetail = channelDetailArray[0];
            let organisations = channelDetail.organisations;
            if (!organisations.length) {
                return Promise.reject({
                    message: 'Add atleast one organisation in the channel',
                    httpStatus: 400,
                });
            }
            let operatorPeerId = organisations[0].peer._id;

            let operatorPeerIdDetails = await peerModel
                .findById(operatorPeerId)
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('clusterId')
                .populate('networkId');
            if (!operatorPeerIdDetails) {
                return Promise.reject({
                    message: 'peer does not exists',
                    httpStatus: 400,
                });
            }

            let anchorpeerIdDetails = await peerModel
                .findById(data.anchorpeerId)
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('tlsCaId')
                .populate('clusterId')
                .populate('networkId');
            if (!anchorpeerIdDetails) {
                return Promise.reject({
                    message: 'peer does not exists',
                    httpStatus: 400,
                });
            }

            let ordererDetail = await ordererModel.ordererService
                .findById(channelDetail.ordererserviceId)
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('tlsCaId');
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }


            // console.log(ordererDetail._id);
            let orderernodeArray = await configtx.fetchordernodeDetail(ordererDetail._id);


            if (!orderernodeArray.length) {
                return Promise.reject({
                    message: 'No Ordering node exists',
                    httpStatus: 400,
                });
            }
            let orderernode = orderernodeArray[0];


            // Check is peer organisation exist in the channel or not
            let organisation = await channelPeer.findOne({
                channelId: data.channelId,
                orgId: anchorpeerIdDetails.orgId._id,
                anchorpeer: anchorpeerIdDetails._id,
            });

            if (!organisation) {
                return Promise.reject({
                    message: 'add Organisation  To ChannelConfig  first in the Channel ',
                    httpStatus: 400,
                });
            }

            // Check is peer organisation exist in the channel than is the channel  updated
            if (organisation.configupdate === 1) {
                return Promise.reject({
                    message: 'peer organisation already  exist in the Channel ',
                    httpStatus: 400,
                });
            }

            // const walletPath = `${os.homedir}/${config.home}/${operatorPeerIdDetails.orgId
            //     .name}-${operatorPeerIdDetails.caId.name}/wallet`;

            const walletbasePath = utils.getBasePath(operatorPeerIdDetails.networkId.namespace, operatorPeerIdDetails.orgId
                .name, operatorPeerIdDetails.caId.name);
            const walletPath = `${walletbasePath}/wallet`;


            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            const ccpPath = `${basePath}/${operatorPeerIdDetails.orgId
                .name}/config.json`;
            const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
            const ccp = JSON.parse(ccpJSON);
            const FinalConfigEnvelopePbPath = `${basePath}/${channelDetail.name}_envelopefinalconfig.pb`;
            const envelope = fs.readFileSync(FinalConfigEnvelopePbPath);

            // const wallet = new FileSystemWallet(walletPath);
            const wallet = await Wallets.newFileSystemWallet(walletPath);
            const gateway = new Gateway();
            await gateway.connect(ccp, {
                wallet,
                identity: operatorPeerIdDetails.orgId.adminId.admnId,
                discovery: {
                    enabled: true,
                    asLocalhost: false
                },
            });
            console.log(operatorPeerIdDetails.orgId.adminId.admnId);
            // const client = gateway.getClient();
            /**
             * changes accroding to the fabric 2.x
             */
             const testbasePath = `${utils.getCaBasePath(
				operatorPeerIdDetails.networkId.namespace,
				operatorPeerIdDetails.caId.name
			)}`;
            const tlsPath = `${testbasePath}/tls-cert.pem`;

			const caInfo = ccp.certificateAuthorities[operatorPeerIdDetails.caId.name];
			const caTLSCACerts = fs.readFileSync(tlsPath);

			const caService = new FabricCAServices(
				caInfo.url,
				{ trustedRoots: caTLSCACerts, verify: false },
				caInfo.caName
			);
            const ordererFetch = caService.getOrderer(orderernode.name);
            let channelConfig = caService.extractChannelConfig(envelope);
            const signatures = [];
            console.log(organisations);
            for (let i = 0; i < organisations.length; i++) {
                let org = organisations[i];
                signatures.push(await configtx.signChannelTransaction(org, channelDetail.name));
            }
            console.log(signatures.length);
            const result = await caService.updateChannel({
                config: channelConfig,
                //envelope: envelope,
                orderer: ordererFetch,
                signatures: signatures,
                name: channelDetail.name,
                txId: caService.newTransactionID(true),
            });

            await gateway.disconnect();
            if (result.status === 'SUCCESS') {

                let clusterDataArray = await cluster.aggregate([

                    {
                        $match: {
                            _id: anchorpeerIdDetails.orgId.clusterId
                        }
                    },
                    {
                        $lookup: {
                            from: 'vms',
                            as: 'masternode',
                            let: {
                                master_node: '$master_node'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$master_node']
                                    }
                                },

                            },
                            {
                                $project: {
                                    ip: 1,
                                    password: 1
                                }
                            }
                            ]
                        }
                    },
                    {
                        $project: {
                            name: 1,
                            masternode: 1
                        }
                    },
                    {
                        $unwind: '$masternode'
                    },
                ]);

                let clusterData = clusterDataArray[0];

                let configOrganisation = JSON.parse(JSON.stringify(anchorpeerIdDetails.orgId));
                configOrganisation.ca = JSON.parse(JSON.stringify(anchorpeerIdDetails.caId));
                configOrganisation.ca.cluster = clusterData;
                let channelDetailNewOrg = {
                    name: channelDetail.name,
                    organisations: [configOrganisation]
                };

                console.log(configOrganisation);
                await configtx.writeChannelConnectionJsonOrgWise(
                    channelDetailNewOrg,
                    orderernode
                );
                //Update connection profile after channel creation
                configtx.addChannelInfoToconfig(channelDetailNewOrg, orderernode);

                organisation.configupdate = 1;
                await organisation.save();
                logger.debug('%s - Success %j', method, result);
                return Promise.resolve({
                    message: result,
                    httpStatus: 200
                });
            }

            return Promise.reject({
                message: result.info,
                httpStatus: 400,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }


    // /***  join channel for organisation peer
    //  */
    // static async joinChannel(data) {
    //     const method = 'joinChannel';
    //     logger.debug('%s - start', method);
    //     logger.debug('%s - has received the parameters %j', method, data);
    //     try {
    //         let channelDetail = await channel.findOne({
    //             _id: data.channelId
    //         });
    //         if (!channelDetail) {
    //             return Promise.reject({
    //                 message: 'channel  does not exists',
    //                 httpStatus: 400,
    //             });
    //         }

    //         let ordererDetail = await ordererModel.ordererService
    //             .findById({
    //                 _id: channelDetail.ordererserviceId
    //             })
    //             .populate('orgId')
    //             .populate('caId')
    //             .populate('tlsCaId');
    //         if (!ordererDetail) {
    //             return Promise.reject({
    //                 message: 'Ordering service does not exists',
    //                 httpStatus: 400,
    //             });
    //         }

    //         let peerDetails = await peerModel
    //             .findById({
    //                 _id: data.peerId
    //             })
    //             .populate({
    //                 path: 'orgId',
    //                 populate: {
    //                     path: 'adminId'
    //                 },
    //             })
    //             .populate('caId')
    //             .populate('tlsCaId')
    //             .populate('clusterId')
    //             .populate('networkId');
    //         if (!peerDetails) {
    //             return Promise.reject({
    //                 message: 'peer does not exists',
    //                 httpStatus: 400,
    //             });
    //         }

    //         let clusterData = await cluster
    //             .findOne({
    //                 _id: peerDetails.clusterId._id
    //             })
    //             .populate({
    //                 path: 'master_node',
    //                 select: 'ip username password',
    //                 match: {
    //                     status: {
    //                         $eq: 1
    //                     },
    //                 },
    //             });

    //         let organisation = await channelPeer.findOne({
    //             channelId: data.channelId,
    //             orgId: peerDetails.orgId._id,
    //         });

    //         if (organisation) {
    //             if (organisation.configupdate !== 1) {
    //                 return Promise.reject({
    //                     message: 'please update the channel first ',
    //                     httpStatus: 400,
    //                 }); 
    //             }
    //             let joinpeerindex = organisation.joinedpeer.indexOf(data.peerId);
    //             if (joinpeerindex > -1) {
    //                 //console.log(joinpeerindex);

    //                 return Promise.reject({
    //                     message: 'peer  already joined  the channel',
    //                     httpStatus: 400,
    //                 });
    //             }
    //         } else {
    //             return Promise.reject({
    //                 message: 'peer organisation does not exist in the channel',
    //                 httpStatus: 400,
    //             });
    //         }

    //         let orderernode = await ordererModel.ordererNode.findOne({
    //             orderingServiceId: ordererDetail._id,
    //         }).populate('orgId')
    //             .populate('caId')
    //             .populate('tlsCaId');

    //         const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
    //         const ccpPath = `${basePath}/${peerDetails.orgId.name}/config.json`;
    //         // Add peer information in ccp file
    //         await configtx.addPeerinCcp(
    //             ccpPath,
    //             peerDetails,
    //             clusterData,
    //             channelDetail.name
    //         );
    //         const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
    //         const ccp = JSON.parse(ccpJSON);
    //         // const walletPath = `${os.homedir}/${config.home}/${peerDetails.orgId
    //         //     .name}-${peerDetails.caId.name}/wallet`;

    //         const walletbasePath = utils.getBasePath(peerDetails.networkId.namespace, peerDetails.orgId
    //             .name, peerDetails.caId.name);
    //         const walletPath = `${walletbasePath}/wallet`;

    //         // const wallet = new FileSystemWallet(walletPath);
    //         const wallet = await Wallets.newFileSystemWallet(walletPath);
    //         console.log(wallet);
    //         console.log(peerDetails.orgId.adminId.admnId);
    //         const gateway = new Gateway();
    //         await gateway.connect(ccp, {
    //             wallet,
    //             identity: peerDetails.orgId.adminId.admnId,
    //             discovery: {
    //                 enabled: true,
    //                 asLocalhost: false
    //             },
    //         });
    //         // const client = gateway.getClient();
    //         /**
    //          * changes accroding to the fabric 2.x
    //          */
    //         const testbasePath = `${utils.getCaBasePath(
	// 			peerDetails.networkId.namespace,
	// 			peerDetails.caId.name
	// 		)}`;
    //         const tlsPath = `${testbasePath}/tls-cert.pem`;

	// 		const caInfo = ccp.certificateAuthorities[peerDetails.caId.name];
	// 		const caTLSCACerts = fs.readFileSync(tlsPath);

	// 		const caService = new FabricCAServices(
	// 			caInfo.url,
	// 			{ trustedRoots: caTLSCACerts, verify: false },
	// 			caInfo.caName
	// 		);
    //         const ordererFetch = caService.getOrderer(orderernode.name);
    //         const channelCreate = caService.getChannel(channelDetail.name);
    //         let request = {
    //             orderer: ordererFetch,
    //         };
    //         const result = await channelCreate.getGenesisBlock(request);
    //         let joinrequest = {
    //             targets: peerDetails.peer_enroll_id,
    //             block: result,
    //             txId: caService.newTransactionID(true),
    //         };
    //         const joinresult = await channelCreate.joinChannel(joinrequest);
    //         if (joinresult && joinresult[0].response && joinresult[0].response.status === 200) {
    //             console.log('Joined successfully');
    //             organisation.joinedpeer.push(data.peerId);
    //             await organisation.save();
    //             await gateway.disconnect();
    //             console.log(organisation);
    //             logger.debug('%s - success %j', method, joinresult);
    //             return Promise.resolve({
    //                 message: joinresult,
    //                 httpStatus: 200
    //             });
    //         } else if (joinresult && joinresult[0].message) {
    //             if (joinresult[0].message.includes('LedgerID already exists')) {
    //                 console.log('Joined successfully');
    //                 organisation.joinedpeer.push(data.peerId);
    //                 await organisation.save();
    //                 await gateway.disconnect();
    //                 console.log(organisation);
    //                 logger.debug('%s - success ledger already exists %j', method, joinresult);
    //                 return Promise.resolve({
    //                     message: joinresult,
    //                     httpStatus: 200
    //                 });
    //             }
    //         }
    //         logger.debug('%s - Error %j', method, joinresult);
    //         return Promise.reject({
    //             message: joinresult,
    //             httpStatus: 400,
    //         });


    //     } catch (error) {
    //         logger.debug('%s - Error %j', method, error);
    //         return Promise.reject({
    //             message: error,
    //             httpStatus: 400,
    //         });
    //     }
    // }

    /**
     * 
     * ===================== join channel changes according to fabric version 2.x ============================
     */
        /***  join channel for organisation peer
     */
    static async joinChannel(data) {
        const method = 'joinChannel';
        console.log("i am in join channel")
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetail = await channel.findOne({
                _id: data.channelId
            });
            if (!channelDetail) {
                return Promise.reject({
                    message: 'channel  does not exists',
                    httpStatus: 400,
                });
            }
    
            let ordererDetail = await ordererModel.ordererService
                .findById({
                    _id: channelDetail.ordererserviceId
                })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId');
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }
    
            let peerDetails = await peerModel
                .findById({
                    _id: data.peerId
                })
                .populate({
                    path: 'orgId',
                    populate: {
                        path: 'adminId'
                    },
                })
                .populate('caId')
                .populate('tlsCaId')
                .populate('clusterId')
                .populate('networkId');
            if (!peerDetails) {
                return Promise.reject({
                    message: 'peer does not exists',
                    httpStatus: 400,
                });
            }
    
            // let clusterData = await cluster
            //     .findOne({
            //         _id: peerDetails.clusterId._id
            //     })
            //     .populate({
            //         path: 'master_node',
            //         select: 'ip username password',
            //         match: {
            //             status: {
            //                 $eq: 1
            //             },
            //         },
            //     });
    
            let organisation = await channelPeer.findOne({
                channelId: data.channelId,
                orgId: peerDetails.orgId._id,
            });
    
            if (organisation) {
                if (organisation.configupdate !== 1) {
                    return Promise.reject({
                        message: 'please update the channel first ',
                        httpStatus: 400,
                    }); 
                }
                let joinpeerindex = organisation.joinedpeer.indexOf(data.peerId);
                if (joinpeerindex > -1) {
                    //console.log(joinpeerindex);
    
                    return Promise.reject({
                        message: 'peer  already joined  the channel',
                        httpStatus: 400,
                    });
                }
            } else {
                return Promise.reject({
                    message: 'peer organisation does not exist in the channel',
                    httpStatus: 400,
                });
            }
    
            let orderernode = await ordererModel.ordererNode.findOne({
                orderingServiceId: ordererDetail._id,
            }).populate('orgId')
                .populate('caId')
                .populate('tlsCaId');
    
            const basePath = `${os.homedir}/Documents/channel/${channelDetail.name}`;
            console.log("basepath :", basePath)
            const ccpPath = `${basePath}/${peerDetails.orgId.name}/config.json`;
            console.log("ccpPath :", ccpPath)
            
            // Add peer information in ccp file
            await configtx.addPeerinCcp(
                ccpPath,
                peerDetails,
                // clusterData,
                channelDetail.name
            );
            console.log("orgDATA :", organisation)
            // const joinresult = await channelCreate.joinChannel(joinrequest);
            
            /**
             * changes according to fabric version 2.x  
             */
            const joinresult = configtx.joinChannelData(basePath, peerDetails, orderernode, channelDetail.name);
            console.log("joinresult :", joinresult)
            console.log("type of result :", typeof (joinresult.status))
            // let setAnchorPeerResult = await configtx.setAnchorPeer(basePath, peerDetails, orderernode, channelDetail.name);
            // let updateAnchorPeerResult = await configtx.updateAnchorPeers(basePath, peerDetails, orderernode, channelDetail.name);
            if (joinresult.status === 'SUCCESS') {
                console.log('Joined successfully');
                organisation.joinedpeer.push(data.peerId);
                organisation.save();
                // await gateway.disconnect();
                console.log(organisation);
                logger.debug('%s - success %j', method, joinresult);
                let setAnchorPeerResult = await configtx.setAnchorPeer(basePath, peerDetails, orderernode, channelDetail.name);
                console.log("setAnchorPeerResult :", setAnchorPeerResult)
                if (setAnchorPeerResult.status === 'SUCCESS') {
                    console.log('set anchor peer successfully');
                    logger.debug('%s - success %j', method, setAnchorPeerResult);
                    let updateAnchorPeerResult = await configtx.updateAnchorPeers(basePath, peerDetails, orderernode, channelDetail.name);
                    console.log("updateAnchorPeerResult :", updateAnchorPeerResult)
                    if (updateAnchorPeerResult.status === 'SUCCESS') {
                        console.log('updated anchor peer successfully');
                        logger.debug('%s - success %j', method, updateAnchorPeerResult);
                        return Promise.resolve({
                            message: updateAnchorPeerResult,
                            httpStatus: 200
                        });
                        
                    }
                    return Promise.reject({
                        message: updateAnchorPeerResult,
                        httpStatus: 400,
                    });
                }
                return Promise.reject({
                    message: setAnchorPeerResult,
                    httpStatus: 400,
                });
            } else if (joinresult && joinresult[0].message) {
                if (joinresult[0].message.includes('LedgerID already exists')) {
                    console.log('Joined successfully');
                    organisation.joinedpeer.push(data.peerId);
                    await organisation.save();
                    await gateway.disconnect();
                    console.log(organisation);
                    logger.debug('%s - success ledger already exists %j', method, joinresult);
                    return Promise.resolve({
                        message: joinresult,
                        httpStatus: 200
                    });
                }
            }
            logger.debug('%s - Error %j', method, joinresult);
            return Promise.reject({
                message: joinresult,
                httpStatus: 400,
            });
    
    
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject({
                message: error,
                httpStatus: 400,
            });
        }
    }
        



    /**
     *  create channel tx to create channel
     */
    static async getUpdateAliasList(data) {
        const method = 'getUpdateAliasList';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
            if (!channelDetailArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let channelDetail = channelDetailArray[0];
            let ordererDetail = await ordererModel.ordererService
                .findById(channelDetail.ordererserviceId)
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId');
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }

            let clusterId = ordererDetail.orgId.clusterId;



            let organisationDiff = await orgModel.findOne({
                clusterId: {
                    $ne: clusterId
                }
            });

            if (organisationDiff) {

                let orgDiffArray = await this.fetchAllPeersOfChannel(data);

                if (!orgDiffArray.length) {
                    return Promise.reject({
                        message: 'Channel does not exists',
                        httpStatus: 400,
                    });
                }

                let orgDiff = orgDiffArray[0];


                // console.log(ordererDetail._id);
                let orderserviceId = ordererDetail._id;
                let orderernodeArray = await ordererModel.ordererNode.aggregate([{
                    $match: {
                        orderingServiceId: orderserviceId
                    },
                },
                {
                    $project: {
                        name: 1,
                        port: 1
                    }
                }
                ]);



                if (!orderernodeArray.length) {
                    return Promise.reject({
                        message: 'No Ordering node exists',
                        httpStatus: 400,
                    });
                }


                let aliasList = {
                    OrganisationList: orgDiff.channelpeers,
                    OrderNodelist: orderernodeArray,
                    orderingServiceId: orderserviceId
                };
                logger.debug('%s - Success %j', method, aliasList);
                return Promise.resolve({
                    message: 'Success',
                    data: aliasList,
                    httpStatus: 200
                });

            } else {
                logger.debug('%s - Error %j', method, ordererDetail);
                return Promise.reject({
                    message: 'No Need to update Complete System is under same Cluster',
                    httpStatus: 200,
                });


            }

            //  for (let i = 0; i < operatorOrgs.length; i++) {


        } catch (err) {
            logger.debug('%s - Error %j', method, err);
            return Promise.reject({
                message: err.message,
                httpStatus: 400
            });
        }
    }


    static async updateOrdererHost(ordererRequest) {
        const method = 'updateOrdererHost';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererRequest);
        try {
            let channelArray = await this.fetchAllPeersOfChannel(ordererRequest);
            if (!channelArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }
            let orderernodeArray = await ChannelControllerHelper.getordernodeDetail(ordererRequest.orderernodeId);
            if (!orderernodeArray.length) {
                return Promise.reject({
                    message: 'No Ordering node exists',
                    httpStatus: 400,
                });
            }
            let orderernode = orderernodeArray[0];

            let peerArray = channelArray[0];
            let ChannelOrganisations = peerArray.channelpeers;
            const networkDetailArray = await NetworkController.getNetWorkDetail(orderernode.organisation.networkId);
            const networkDetail = networkDetailArray[0];
            // Update Deployement here
            let currentDeployment = await new KubernetesRepository().fetchOrdererDeployment(orderernode, networkDetail.namespace);

            let template = currentDeployment.body.spec.template.spec;

            if (!template.hostAliases) {
                template.hostAliases = [];
            }
            let AliasArray = {};

            // organisation loop
            for (let i = 0; i < ChannelOrganisations.length; i++) {

                let Organisation = ChannelOrganisations[i].organisations;
                let OrganisationPeer = Organisation.peer;
                let firstpeer = OrganisationPeer[0];
                if (String(orderernode.organisation.clusterId) != String(firstpeer.cluster._id)) {

                    if (!AliasArray[firstpeer.cluster.masternode.ip]) {
                        AliasArray[firstpeer.cluster.masternode.ip] = [];
                    }

                    for (let i = 0; i < OrganisationPeer.length; i++) {
                        let peer = OrganisationPeer[i];
                        AliasArray[firstpeer.cluster.masternode.ip].push(peer.peer_enroll_id);

                    }


                }

            }

            for (let key in AliasArray) {
                let hostlist = {
                    ip: key,
                    hostnames: AliasArray[key]
                };
                template.hostAliases.push(hostlist);
            }

            currentDeployment.body.spec.template.spec = template;

            let updateDeployment = await new KubernetesRepository().updateOrdererDeployment(orderernode, networkDetail.namespace, currentDeployment.body);

            logger.debug('%s - Success %j', method, updateDeployment);
            return Promise.resolve({
                message: 'Success',
                data: updateDeployment,
                httpStatus: 200
            });
        } catch (err) {
            logger.debug('%s - has received the parameters %j', method, err);
            return Promise.reject({
                message: err.message,
                httpStatus: 400
            });
        }
    }


    static async updatePeerHosts(peerKubeRequest) {
        const method = 'updatePeerHosts';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, peerKubeRequest);
        try {

            let channelArray = await this.fetchAllPeersOfChannel(peerKubeRequest);
            if (!channelArray.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }

            let peerArray = channelArray[0];

            //Fetch peer list
            let peerDetails = await peerModel.findById({
                _id: peerKubeRequest.peerId
            })
                .populate('orgId')
                .populate('caId')
                .populate('clusterId')
                .populate('networkId')
                .populate('tlsCaId');

            if (!peerDetails) {
                //logger.error('%s - Peer does not exists', method);
                return Promise.reject({
                    message: 'Peer nodes does not exists',
                    httpStatus: 400
                });
            }


            let orderingServiceArray = await this.getordernode(peerArray.ordererserviceId);
            if (!orderingServiceArray.length) {
                return Promise.reject({
                    message: 'Ordering Service not found',
                    httpStatus: 400,
                });
            }

            let orderingservice = orderingServiceArray[0];
            let ordernodes = orderingservice.ordernode;
            //Fetch peer organisation admin
            let orgAdmin = await caModel.orgAdmin.findById({
                _id: peerDetails.orgId.adminId
            })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId');

            if (!orgAdmin) {
                // logger.error('%s - Organisation admin does not exists', method);
                return Promise.reject({
                    message: 'Organisation admin for ca does not exists',
                    httpStatus: 400
                });
            }

            if (!orgAdmin.cacets) {
                //  logger.error('%s - Organisation admin is not enrolled', method);
                return Promise.reject({
                    message: 'Organisation admin is not enrolled',
                    httpStatus: 400
                });
            }

            if ((!peerDetails.cacets) || (!peerDetails.tlsCacerts)) {
                //   logger.error('%s - Peer is not enrolled', method);
                return Promise.reject({
                    message: 'Peer must be enrolled to  ORG CA and TLS CA ',
                    httpStatus: 400
                });
            }

            // Get cluster details
            let clusterData = await Cluster.findOne({
                _id: peerDetails.clusterId._id
            })
                .populate({
                    path: 'master_node',
                    select: 'ip username password',
                    match: {
                        status: {
                            $eq: 1
                        }
                    }
                });
            if (!clusterData) {
                //logger.error('%s - Cluster does not exists', method);
                return Promise.reject({
                    message: 'Cluster details are invalid',
                    httpStatus: 400
                });
            }

            if (!ordernodes.length) {

                return Promise.reject({
                    message: 'No ordernodes exist for the ordering service',
                    httpStatus: 400,
                });

            }

            let currentDeployment = await new peerKubeRepos().fetchPeerDeployment(peerDetails);

            let template = currentDeployment.body.spec.template.spec;

            if (!template.hostAliases) {
                template.hostAliases = [];
            }
            let AliasArray = {};
            // Other PeerHost Aliasses

            let ChannelOrganisations = peerArray.channelpeers;

            // organisation loop
            for (let i = 0; i < ChannelOrganisations.length; i++) {

                let Organisation = ChannelOrganisations[i].organisations;
                let OrganisationPeer = Organisation.peer;
                let firstpeer = OrganisationPeer[0];
                if (String(peerDetails.orgId.clusterId) !== String(firstpeer.cluster._id)) {


                    if (!AliasArray[firstpeer.cluster.masternode.ip]) {
                        AliasArray[firstpeer.cluster.masternode.ip] = [];
                    }
                    for (let i = 0; i < OrganisationPeer.length; i++) {
                        let peer = OrganisationPeer[i];
                        AliasArray[firstpeer.cluster.masternode.ip].push(peer.peer_enroll_id);
                    }
                }
            }
            // Order Host Aliases
            if (String(orderingservice.organisation.cluster._id) !== String(peerDetails.orgId.clusterId)) {
                if (!AliasArray[orderingservice.organisation.cluster.masternode.ip]) {
                    AliasArray[orderingservice.organisation.cluster.masternode.ip] = [];
                }
                for (let i = 0; i < ordernodes.length; i++) {
                    let ordernode = ordernodes[i];
                    AliasArray[orderingservice.organisation.cluster.masternode.ip].push(ordernode.name);
                }
            }
            for (let key in AliasArray) {

                let hostlist = {
                    ip: key,
                    hostnames: AliasArray[key]
                };

                template.hostAliases.push(hostlist);
            }
            currentDeployment.body.spec.template.spec = template;

            let updateDeployment = await new peerKubeRepos().updatePeerDeployment(peerDetails, currentDeployment.body);

            logger.debug('%s - Success %j', method, updateDeployment);
            return Promise.resolve({
                message: 'Alias Update Successfully',
                data: updateDeployment,
                httpStatus: 200
            });

        } catch (err) {
            logger.debug('%s - Error %j', method, err);
            return Promise.reject({
                message: err.message,
                httpStatus: 400
            });
        }
    }
    // Channel detail
    static async channelDetail(data) {
        try {
            console.log(data.channelId);
            let channelDetail = await channel.aggregate([{
                $match: {
                    _id: mongoose.Types.ObjectId(data.channelId)
                }
            },
            {
                $lookup: {
                    from: 'channelpeers',
                    localField: '_id',
                    foreignField: 'channelId',
                    as: 'channelorgs',
                },
            },
            {
                $lookup: {
                    from: 'channelpeers',
                    as: 'channelorgs',
                    let: {
                        chId: '$_id'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ['$channelId', '$$chId']
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: 'organisations',
                            as: 'organisation',
                            let: {
                                orgid: '$orgId'
                            },
                            pipeline: [{
                                $match: {
                                    $expr: {
                                        $eq: ['$_id', '$$orgid']
                                    }
                                }
                            },]
                        }
                    },
                    {
                        $unwind: '$organisation'
                    }
                    ]
                }
            },
            {
                $lookup: {
                    from: 'organisations',
                    as: 'organisations',
                    let: {
                        orgid: '$operators'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $in: ['$_id', '$$orgid']
                            }
                        }
                    },]
                }
            },
            {
                $lookup: {
                    from: 'ordererservices',
                    as: 'ordererservices',
                    let: {
                        ordererserviceId: '$ordererserviceId'
                    },
                    pipeline: [{
                        $match: {
                            $expr: {
                                $eq: ['$_id', '$$ordererserviceId']
                            }
                        }
                    },]
                }
            },
            {
                $unwind: '$ordererservices'
            }
            ]);

            if (!channelDetail.length) {
                return Promise.reject({
                    message: 'Channel does not exists',
                    httpStatus: 400,
                });
            }

            return Promise.resolve({
                message: 'Success',
                data: channelDetail[0],
                httpStatus: 200,
            });
        } catch (error) {
            return Promise.reject({
                message: error.message,
                httpStatus: 400,
            });
        }
    }


    static async fetchAllPeersOfChannel(data) {
        let channelDetailArray = await channel.aggregate([{
            $match: {
                _id: mongoose.Types.ObjectId(data.channelId)
            },
        },
        {
            $lookup: {
                from: 'channelpeers',
                as: 'channelpeers',
                let: {
                    channelId: '$_id'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $and: [{
                                $eq: ['$channelId', '$$channelId']
                            }, {
                                $eq: ['$configupdate', 1]
                            }]
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'organisations',
                        as: 'organisations',
                        let: {
                            orgId: '$orgId',
                            joinedpeer: '$joinedpeer'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $and: [{
                                        $eq: ['$_id', '$$orgId']
                                    }, {
                                        $eq: ['$type', 0]
                                    }]
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'peers',
                                as: 'peer',
                                let: {
                                    orgId: '$_id'
                                },
                                pipeline: [{
                                    $match: {
                                        $expr: {
                                            $and: [{
                                                $eq: ['$orgId', '$$orgId']
                                            }, {
                                                $in: ['$_id', '$$joinedpeer']
                                            }]
                                        }
                                    }
                                },
                                {
                                    $lookup: {
                                        from: 'clusters',
                                        as: 'cluster',
                                        let: {
                                            clusterId: '$clusterId'
                                        },
                                        pipeline: [{
                                            $match: {
                                                $expr: {
                                                    $eq: ['$_id', '$$clusterId']
                                                }
                                            }
                                        },
                                        {
                                            $lookup: {
                                                from: 'vms',
                                                as: 'masternode',
                                                let: {
                                                    master_node: '$master_node'
                                                },
                                                pipeline: [{
                                                    $match: {
                                                        $expr: {
                                                            $eq: ['$_id', '$$master_node']
                                                        }
                                                    },

                                                },
                                                {
                                                    $project: {
                                                        ip: 1,
                                                        password: 1
                                                    }
                                                }
                                                ]
                                            }
                                        },
                                        {
                                            $project: {
                                                name: 1,
                                                masternode: 1
                                            }
                                        },
                                        {
                                            $unwind: '$masternode'
                                        },


                                        ]
                                    }
                                },
                                {

                                    $unwind: '$cluster'
                                },
                                {
                                    $project: {
                                        name: 1,
                                        peerport: 1,
                                        peer_enroll_secret: 1,
                                        peer_enroll_id: 1,
                                        cluster: 1
                                    }
                                },
                                ]
                            }
                        },

                        ]

                    },
                },
                {
                    $unwind: '$organisations'
                },
                ]
            }
        }

        ]);
        return channelDetailArray;
    }


    static async getordernode(orderserviceId) {

        let OrderArray = await ordererModel.ordererService.aggregate([{
            $match: {
                _id: mongoose.Types.ObjectId(orderserviceId)
            },
        },
        {
            $lookup: {
                from: 'orderernodes',
                as: 'ordernode',
                let: {
                    orderingId: '$_id'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $eq: ['$orderingServiceId', '$$orderingId']
                        }
                    }
                },
                {
                    $project: {
                        name: 1,
                        port: 1
                    }
                }
                ]
            }
        },
        {
            $lookup: {
                from: 'organisations',
                as: 'organisation',
                let: {
                    orgId: '$orgId'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$orgId']
                        }
                    }
                },
                {
                    $lookup: {
                        from: 'clusters',
                        as: 'cluster',
                        let: {
                            clusterId: '$clusterId'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$clusterId']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'vms',
                                as: 'masternode',
                                let: {
                                    master_node: '$master_node'
                                },
                                pipeline: [{
                                    $match: {
                                        $expr: {
                                            $eq: ['$_id', '$$master_node']
                                        }
                                    },

                                },
                                {
                                    $project: {
                                        ip: 1,
                                        password: 1
                                    }
                                }
                                ]
                            }
                        },
                        {
                            $project: {
                                name: 1,
                                masternode: 1
                            }
                        },
                        {
                            $unwind: '$masternode'
                        },


                        ]
                    }
                },
                {
                    $unwind: '$cluster'
                },
                {
                    $project: {
                        name: 1,
                        cluster: 1
                    }
                }

                ]
            }
        },
        {
            $unwind: '$organisation'
        },
        {
            $project: {
                name: 1,
                port: 1,
                organisation: 1,
                ordernode: 1
            }
        }



        ]);
        return OrderArray;

    }



    static async exportChannelDetail(data) {
        const method = 'exportChannelDetail';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);

        let channelDetailArray = await channel.aggregate([{
            $match: {
                _id: mongoose.Types.ObjectId(data.channelId)
            },
        },
        {
            $lookup: {
                from: 'ordererservices',
                as: 'ordererservice',
                let: {
                    ordererserviceId: '$ordererserviceId'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$ordererserviceId']
                        }
                    }
                },

                {
                    $lookup: {
                        from: 'orderernodes',
                        as: 'orderernodes',
                        let: {
                            orderingId: '$_id'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $eq: ['$orderingServiceId', '$$orderingId']
                                }
                            }
                        }]
                    }
                },
                {
                    $lookup: {
                        from: 'organisations',
                        as: 'organisation',
                        let: {
                            orgId: '$orgId'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$orgId']
                                }
                            }
                        }]
                    }
                },

                {
                    $lookup: {
                        from: 'clusters',
                        as: 'cluster',
                        let: {
                            clusterId: '$clusterId'
                        },
                        pipeline: [{
                            $match: {
                                $expr: {
                                    $eq: ['$_id', '$$clusterId']
                                }
                            }
                        },
                        {
                            $lookup: {
                                from: 'vms',
                                as: 'masternode',
                                let: {
                                    master_node: '$master_node'
                                },
                                pipeline: [{
                                    $match: {
                                        $expr: {
                                            $eq: ['$_id', '$$master_node']
                                        }
                                    },

                                },
                                {
                                    $project: {
                                        ip: 1,
                                        password: 1
                                    }
                                }
                                ]
                            }
                        },
                        {
                            $unwind: '$masternode'
                        },
                        {
                            $project: {
                                configuration: 0
                            }
                        }
                        ]
                    }
                },
                {
                    $unwind: '$cluster'
                },
                {
                    $unwind: '$organisation'
                }
                ]

            },


        },
        {
            $unwind: '$ordererservice'
        },

        ]);

        if (!channelDetailArray.length) {
            logger.error('%s -Channel not found', method);
            throw new Exception.ChannelNotFound()
        }

        let channelDetail = channelDetailArray[0];
        if (!channelDetail.type === 1) {
            logger.error('%s - Importd channnel canont be exported', method);
            throw new Exception.ImportedChannelError()
        }

        if (!channelDetail.ordererservice.orderernodes.length) {
            logger.error('%s -Orderer nodes does not exists', method);
            throw new Exception.OrdererNodesNotFound()
        }

        let exportchannelDetail = {
            channelName: channelDetail.name,
            ordererName: channelDetail.ordererservice.orderernodes[0].name,
            ordererOrg: channelDetail.ordererservice.organisation.name,
            ordererUrl: channelDetail.ordererservice.cluster.masternode.ip,
            ordererPort: channelDetail.ordererservice.orderernodes[0].port,
            tlsCacerts: channelDetail.ordererservice.orderernodes[0].tlsCacerts,
        };
        return Promise.resolve({
            message: exportchannelDetail,
            status: 200
        });

    }

    /**
      *  get latest channel configuration for adding new organisation
      */
    static async importChannelDetail(data) {
        try {
            const method = 'importChannelDetail';
            logger.debug('%s - start', method);
            logger.debug('%s - has received the parameters %j', method, data);
            let networkDetail = await Network.findById(data.networkId);
            if (!networkDetail) {
                logger.error('%s - Network not found', method);
                throw new Exception.NetworkNotFound()
            }
            let channelData = await channel.findOne({ name: data.channelName });
            if (channelData) {
                logger.error('%s - Network not found', method);
                throw new Exception.ChannelAlreadyExists()
            }

            let channelDetail = {
                name: data.channelName,
                extras: {
                    networkId: data.networkId,
                    orderer: data.orderer,
                    ordererOrg: data.ordererOrg,
                    ordererUrl: data.ordererUrl,
                    ordererPort: data.ordererPort,
                    tlsCacerts: data.tlsCacerts,
                },
                type: 1, //Exported channel
            };
            let saveOrg = await channel.create(channelDetail);
            return Promise.resolve({
                message: 'Successfull Created',
                data: saveOrg,
                status: 200,
            });
        }
        catch (error) {
            return Promise.reject(ErrorHandler.handleError(error));
        }

    }
    /**
       *  get latest channel configuration for adding new organisation
       */
    static async getExportedChannelDetail(data) {
        const ccp = JSON.parse(ccpJSON);
        const walletbasePath = utils.getBasePath(organisation.network.namespace, organisation.name, organisation.ca.name);
        const walletPath = `${walletbasePath}/wallet`;
        const wallet = new FileSystemWallet(walletPath);
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: organisation.admin.admnId,
            discovery: {
                enabled: true,
                asLocalhost: false
            },
        });
        // const client = gateway.getClient();
        /**
             * changes accroding to the fabric 2.x
             */
        const testbasePath = `${utils.getCaBasePath(
            organisation.network.namespace,
            organisation.ca.name
        )}`;
        const tlsPath = `${testbasePath}/tls-cert.pem`;

        const caInfo = ccp.certificateAuthorities[organisation.ca.name];
        const caTLSCACerts = fs.readFileSync(tlsPath);

        const caService = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );
        const channelObject = caService.getChannel(data.name);
        const ChannelConfigPath = `${basePath}/${data.name}_config.pb`;
        const ChannelConfigJsonPath = `${basePath}/${data.name}_config.json`;
        const latestConfig = await channelObject.getChannelConfigFromOrderer();
        const latestConfigBuffer = latestConfig.toBuffer();
        fs.writeFileSync(ChannelConfigPath, latestConfigBuffer);
        configtx.convertConfigToJson(ChannelConfigPath, ChannelConfigJsonPath);
        const channelDetailString = fs.readFileSync(ChannelConfigJsonPath, 'utf8');
        const channleJson = JSON.parse(channelDetailString);
        let channelDetail =
            logger.debug('%s - Success %j', method, channelDetail);
        return Promise.resolve({
            message: 'latestConfig fetched',
            data: channleJson,
            status: 200,
        });

    }

    /**
    *  create orgConfigtx for imported organisation
    */

    static async createExternalOrgConfigtx(data) {
        const method = 'createExternalOrgConfigtx';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let configFileData = await ChannelControllerHelper.CreateExternalOrgConfigtxHelper(data)
            return Promise.resolve({
                message: configFileData,
                status: 200
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject(ErrorHandler.handleError(error));
        }
    }

    /**
     *  generate channel configuration for organisation
     */
    static async addExportedOrgToChannelConfig(data) {
        const method = 'addExportedOrgToChannelConfig';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            await ChannelControllerHelper.AddExportedOrgToChannelConfigHelper(data)
            return Promise.resolve({
                message: 'file update successfully',
                status: 200,
            });
        } catch (error) {
            logger.debug('%s - Error %j', method, error);
            return Promise.reject(ErrorHandler.handleError(error));
        }
    }
    /**
   *  update channel for adding new organisation as Admin
   */
    static async updateExportedOrgToChannel(data) {
        const method = 'updateExportedOrgToChannel';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let result = await ChannelControllerHelper.UpdateExportedOrgToChannelHelper(data)
            return Promise.resolve({
                message: result.info,
                data: result.data,
                status: 200
            });
        } catch (error) {
            return Promise.reject(ErrorHandler.handleError(error));
        }
    }
    /**
     *  get latest channel configuration for adding new organisation
     */
    static async getExportedChannelConfig(data) {
        const method = 'getExportedChannelConfig'
        logger.debug('%s - start', method)
        logger.debug('%s - has received the parameters %j', method, data)
        try {
            let result = await ChannelControllerHelper.getExportedChannelConfigHelper(data)
            return Promise.resolve({
                message: result,
                status: 200,
            })
        } catch (error) {
            logger.debug('%s - Error %j', method, error)
            return Promise.reject(ErrorHandler.handleError(error))
        }
    }

    /***  join channel for organisation peer
    */
    static async joinExportedChannel(data) {
        const method = 'joinExportedChannel'
        logger.debug('%s - start', method)
        logger.debug('%s - has received the parameters %j', method, data)
        try {
            let result = await ChannelControllerHelper.joinExportedChannelHelper(data)
            return Promise.resolve({
                message: result,
                status: 200,
            })
        } catch (error) {
            logger.debug('%s - Error %j', method, error)
            return Promise.reject(ErrorHandler.handleError(error))
        }
    }
}

module.exports = ChannelController;