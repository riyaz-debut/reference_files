'use strict';
const {
    channel,
    channelPeer
} = require('./channelModel'); // require model users
const orgModel = require('../orgManager/orgModel');
const configtx = require('./channelConfigtx');
const utils = require('../../utils/utils.js');
const Exception = require("../errors/errors");
const Cluster = require('../cluster/clusterModel');
const mongoose = require('mongoose'); //orm for database
const os = require('os');
const fs = require('fs');
const config = require('../../config');
const peerModel = require('../peerManager/peerModel');
const ordererModel = require('../orderingService/ordererModel');
// const {
//     FileSystemWallet,
//     Gateway
// } = require('fabric-network');

const { Wallets, FileSystemWallet, Gateway } = require('fabric-network');
const FabricCAServices = require("fabric-ca-client");

class ChannelControllerHelper {
    /* Create the configtx file so that organisation can
     be added to the channel by following the edit channel config flow of
     hyperledger fabric */

    static async CreateExternalOrgConfigtxHelper(data) {
        let channelDetail = await channel.findOne({
            _id: data.channelId
        });
        if (!channelDetail) {
            // Channel not found found
            throw new Exception.ChannelNotFound()
        }
        let orgDetails = await orgModel.findOne({
            _id: data.orgId,
            type: 2
        }).populate('networkId')
        if (!orgDetails) {
            // Organisation not found error
            throw new Exception.OrganisationNotFound()
        }
        const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
        let peerDetails = {
            orgId: {
                name: orgDetails.name,
                mspId: orgDetails.mspId,
            },
            peer_enroll_id: orgDetails.extras.peer_enroll_id,
            peerport: orgDetails.extras.peerport,
            networkId: orgDetails.networkId
        }
        let orgMspPath = utils.getExportedOrgBasePath(orgDetails.networkId.namespace, orgDetails.name)
        let configFileData = configtx.getMspConfigtx(peerDetails, `${orgMspPath}/msp`);
        let orgConfigtxPath = `${basePath}/${peerDetails.orgId
            .name}/configtx.yaml`;
        let channelTxPath = `${basePath}/${peerDetails.orgId.name}`;
        await utils.writeYaml2(orgConfigtxPath, configFileData);
        configtx.generateOrgConfig(peerDetails, channelTxPath);
        return Promise.resolve(channelTxPath);
    }

    /**
    *  generate channel configuration for organisation
    */

    static async AddExportedOrgToChannelConfigHelper(data) {
        let channelDetail = await channel.findOne({
            _id: data.channelId
        });
        if (!channelDetail) {
            throw new Exception.ChannelNotFound()
        }
        let orgDetails = await orgModel.findOne({
            _id: data.orgId,
            type: 2
        }).populate('networkId')
        if (!orgDetails) {
            // Organisation not found error
            throw new Exception.OrganisationNotFound()
        }

        let channelOrg = await channelPeer.findOne({
            channelId: data.channelId,
            orgId: data.orgId,
        });

        if (channelOrg) {
            throw new Exception.OrganisationAlreadyexistsInChannel()
        } else {
            const AnchorPeerDetail = {
                mod_policy: 'Admins',
                value: {
                    anchor_peers: [{
                        host: orgDetails.extras.peer_enroll_id,
                        port: orgDetails.extras.peerport,
                    },],
                },
                version: '0',
            };
            const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
            let orgConfig = `${basePath}/${orgDetails.name}/${orgDetails.name}.json`;

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
                orgDetails.mspId
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
            return Promise.resolve()
        }
    }

    /**
    *  update channel for adding new organisation as Admin
    */

    static async UpdateExportedOrgToChannelHelper(data) {

        let channelDetailArray = await configtx.fetchChannelPrereqsiteData(data);
        if (!channelDetailArray.length) {
            throw new Exception.ChannelNotFound()
        }
        let channelDetail = channelDetailArray[0];
        let organisations = channelDetail.organisations;
        if (!organisations.length) {
            throw new Exception.ChannelNotFound()
        }
        let Organisation = await orgModel.findOne({
            _id: data.orgId
        });
        if (!Organisation) {
            throw new Exception.ChannelWithoutOrganization()

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
            throw new Exception.PeerNotFound()
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
            throw new Exception.OrdereringServiceNotFound()
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
            return Promise.resolve({
                message: info,
                data: result,
            });
        }
        throw new Exception.ChannelConfigError(result.info)
    }


    static async updateOrdererHostAliasForExternalOrg(ordererRequest) {
        let orderernodeArray = await this.getordernodeDetail(ordererRequest.orderernodeId);
        if (!orderernodeArray.length) {
            throw new Exception.OrdererNodesNotFound()
        }
        let orderernode = orderernodeArray[0];
        const networkDetailArray = await NetworkController.getNetWorkDetail(orderernode.organisation.networkId);
        const networkDetail = networkDetailArray[0];
        // Update Deployement here
        let currentDeployment = await new KubernetesRepository().fetchOrdererDeployment(orderernode, networkDetail.namespace);

        let template = currentDeployment.body.spec.template.spec;

        if (!template.hostAliases) {
            template.hostAliases = [];
        }
        let aliasArray = [];
        let Organisation = await orgModel.findOne({
            _id: data.orgId,
            type: 2
        }).populate('networkId')
        if (!Organisation) {
            // Organisation not found error
            throw new Exception.OrganisationNotFound()
        }
        let exportedClusterIp = Organisation.extras.clusterIp
        if (String(orderernode.organisation.cluster.masternode.ip) != String(exportedClusterIp)) {
            aliasArray.push(Organisation.extras.peer_enroll_id);
        }
        let hostlist = {
            ip: key,
            hostnames: []
        }
        if (template.hostAliases.has(key)) {
            let podAliasArray = template.hostAliases[key]
            podAliasArray.concat(aliasArray);
            hostlist.hostnames = podAliasArray
        } else {
            hostlist = {
                ip: key,
                hostnames: aliasArray
            }
        }
        template.hostAliases.push(hostlist);
        currentDeployment.body.spec.template.spec = template;
        let updateDeployment = await new KubernetesRepository().updateOrdererDeployment(orderernode, networkDetail.namespace, currentDeployment.body);
        logger.debug('%s - Success %j', method, updateDeployment);
        return Promise.resolve(updateDeployment);
    }



    static async updatePeerHostsExternalOrgHelper(peerKubeRequest) {
        const method = 'updatePeerHostsExternalOrg';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, peerKubeRequest);
        try {

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


    static async getExportedChannelConfigHelper(data) {
        let channelDetail = await channel.findOne({ _id: data.channelId });
        if (!channelDetail) {
            throw new Exception.ChaincodeNotFound()
        }
        let existingOrg = await orgModel.findById(data.orgId)
            .populate("networkId")
            .populate("caId")
            .populate("adminId")
        if (!existingOrg) {
            throw new Exception.OrganisationNotFound()
        }
        const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
        await configtx.writeExportedChannelConnectionJson(
            channelDetail, existingOrg
        );
        const ccpPath = `${basePath}/${existingOrg.name}/config.json`;
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);
        console.log(ccp)
        const walletbasePath = utils.getBasePath(existingOrg.networkId.namespace, existingOrg.name, existingOrg.caId.name);
        const walletPath = `${walletbasePath}/wallet`;
        // const wallet = new FileSystemWallet(walletPath);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        const adminId = existingOrg.adminId.admnId
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: adminId,
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
            existingOrg.networkId.namespace,
            existingOrg.caId.name
        )}`;
        const tlsPath = `${testbasePath}/tls-cert.pem`;

        const caInfo = ccp.certificateAuthorities[existingOrg.caId.name];
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
        configtx.convertConfigToJson(ChannelConfigPath, ChannelConfigJsonPath)
        return Promise.resolve('latestConfig fetched');
    }

    /***  join channel for organisation peer
        */

    static async joinExportedChannelHelper(data) {


        let channelDetail = await channel.findOne({
            _id: data.channelId, type: 1
        });
        if (!channelDetail) {
            throw new Exception.ChannelNotFound()
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
            throw new Exception.PeerNotFound()
        }
        let clusterData = await Cluster.findOne({
            _id: peerDetails.clusterId._id
        })
            .populate({
                path: 'master_node',
                select: 'ip username password',
                match: {
                    status: {
                        $eq: 1
                    },
                },
            });

        let organisation = await channelPeer.findOne({
            channelId: data.channelId,
            orgId: peerDetails.orgId._id,
        });

        if (organisation) {
            let joinpeerindex = organisation.joinedpeer.indexOf(data.peerId);
            if (joinpeerindex > -1) {
                throw new Exception.PeerAlreadyJoinedChannel()
            }
        } else {
            let ChannelPeerData = {
                channelId: data.channelId,
                orgId: peerDetails.orgId._id,
                anchorpeer: data.peerId,
            };
            organisation = await channelPeer.create(ChannelPeerData);
        }
        const basePath = `${os.homedir}/${config.home}/channel/${channelDetail.name}`;
        const ccpPath = `${basePath}/${peerDetails.orgId.name}/config.json`;
        // Add peer information in ccp file
        await configtx.addPeerinCcp(
            ccpPath,
            peerDetails,
            clusterData,
            channelDetail.name
        );
        const ccpJSON = fs.readFileSync(ccpPath, 'utf8');
        const ccp = JSON.parse(ccpJSON);

        const walletbasePath = utils.getBasePath(peerDetails.networkId.namespace, peerDetails.orgId
            .name, peerDetails.caId.name);
        const walletPath = `${walletbasePath}/wallet`;

        // const wallet = new FileSystemWallet(walletPath);
        const wallet = await Wallets.newFileSystemWallet(walletPath);
        console.log(wallet);
        console.log(peerDetails.orgId.adminId.admnId);
        const gateway = new Gateway();
        await gateway.connect(ccp, {
            wallet,
            identity: peerDetails.orgId.adminId.admnId,
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
            peerDetails.networkId.namespace,
            peerDetails.caId.name
        )}`;
        const tlsPath = `${testbasePath}/tls-cert.pem`;

        const caInfo = ccp.certificateAuthorities[peerDetails.caId.name];
        const caTLSCACerts = fs.readFileSync(tlsPath);

        const caService = new FabricCAServices(
            caInfo.url,
            { trustedRoots: caTLSCACerts, verify: false },
            caInfo.caName
        );
        const ordererFetch = caService.getOrderer(`orderer0-${channelDetail.extras.ordererOrg}`);
        const channelCreate = caService.getChannel(channelDetail.name);
        let request = {
            orderer: ordererFetch,
        };
        const result = await channelCreate.getGenesisBlock(request);
        let joinrequest = {
            targets: peerDetails.peer_enroll_id,
            block: result,
            txId: caService.newTransactionID(true),
        };
        const joinresult = await channelCreate.joinChannel(joinrequest);
        if (joinresult && joinresult[0].response && joinresult[0].response.status === 200) {
            console.log('Joined successfully');
            organisation.joinedpeer.push(data.peerId);
            await organisation.save();
            await gateway.disconnect();
            console.log(organisation);
            return Promise.resolve(joinresult);
        } else if (joinresult && joinresult[0].message) {
            if (joinresult[0].message.includes('LedgerID already exists')) {
                console.log('Joined successfully');
                organisation.joinedpeer.push(data.peerId);
                await organisation.save();
                await gateway.disconnect();
                console.log(organisation);
                return Promise.resolve(joinresult);
            }
        }

        return Promise.reject(joinresult)
    }

    static async getordernodeDetail(id) {
        let channelDetailArray = await ordererModel.ordererNode.aggregate([{
            $match: {
                _id: mongoose.Types.ObjectId(id)
            },
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
                                masternode: 1,
                                configuration: 1
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

                ]
            }
        },
        {
            $lookup: {
                from: 'cas',
                as: 'tlsca',
                let: {
                    tlsCaId: '$tlsCaId'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$tlsCaId']
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
                }

                ]
            }
        },
        {
            $lookup: {
                from: 'cas',
                as: 'basicca',
                let: {
                    basiccaId: '$caId'
                },
                pipeline: [{
                    $match: {
                        $expr: {
                            $eq: ['$_id', '$$basiccaId']
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
                }

                ]
            }
        },
        {
            $unwind: '$organisation'
        },
        {
            $unwind: '$basicca'
        },
        {
            $unwind: '$tlsca'
        }
        ]);
        return channelDetailArray;
    }

}
module.exports = ChannelControllerHelper

