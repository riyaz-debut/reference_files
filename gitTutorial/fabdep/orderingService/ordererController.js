'use strict';
const ordererModel = require('./ordererModel');
const caModel = require('./../caManager/caModel');
const orgModel = require('./../orgManager/orgModel');
const configtx = require('./configtx');
const fs = require('fs-extra');
const os = require('os');
const utils = require('../../utils/utils.js');
// Changes according to v2.x
// const { FileSystemWallet, Gateway } = require('fabric-network');
const { Wallets, Gateway } = require('fabric-network');
const config = require('../../config');
const mongoose = require('mongoose');
const KubernetesRepository = require('../repositry/kubernetes/ordererKubernetesRepo');
const cluster = require('../cluster/clusterModel');
const logger = require('../repositry/utils').getLogger('OrdererController');
const NetworkController = require('../network/networkController');
const FabricCAServices = require('fabric-ca-client');

class OrdererController {

    static async addOrdererService(ordererParam) {
        const method = 'addOrdererService';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererParam);

        try {
            let existingOrg = await orgModel.findOne({ _id: ordererParam.orgId, type: 1 })
                .populate('caId')
                .populate('tlsCaId');
            if (!existingOrg) {
                logger.error('%s - Orderer Org does exists', method);
                return Promise.reject({ message: 'Organisation does not exists or is peer organisation', httpStatus: 400 });
            }

            let orderer = await ordererModel.ordererService.findOne({ name: ordererParam.name, networkId: existingOrg.networkId })
            if (orderer) {
                return Promise.reject({ message: 'Ordering service already exists with same name', httpStatus: 400 });
            }
            let existingOrderer = await ordererModel.ordererService.findOne({ orgId: ordererParam.orgId })

            if (existingOrderer) {
                logger.error('%s - Ordering service already exists with organisation', method);
                return Promise.reject({ message: 'Ordering service already exists with organisation', httpStatus: 400 });
            }

            ordererParam.caId = existingOrg.caId._id;
            ordererParam.tlsCaId = existingOrg.tlsCaId._id;
            ordererParam.consortium = [];
            ordererParam.clusterId = existingOrg.clusterId;
            ordererParam.networkId = existingOrg.networkId;

            let savedService = await ordererModel.ordererService.create(ordererParam);
            logger.debug('%s - Ordering service infomation added into database', method);

            let savedOrderingService = await ordererModel.ordererService.findById({ _id: savedService._id })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId');

            //Add ordering nodes based on the ordering service type
            let ordererCount = 1; // solo type ordering service
            let ordererNewlist = Array(); // Array to hold orderer nodes
            if (ordererParam.ordererType === 1) {
                ordererCount = 5; // Raft  ordering service
            }

            logger.debug('%s - Orderer count: %s', method, ordererCount);

            // Fetch the highest port number so that ports does not mess up
            // and be  in all the cases
            let baseOrdererPort;

            let highestPort = await ordererModel.ordererNode.find({}, { port: 1, _id: 0 }).
                sort({ port: -1 }).
                limit(1);

            if (!highestPort.length) {
                baseOrdererPort = config.ports.ordererPort;
            } else {
                baseOrdererPort = highestPort[0].port;
            }

            for (let i = 0; i < ordererCount; i++) {
                baseOrdererPort += 1;
                // Register the user, enroll the user, and import the new identity into the wallet.
                let ordererName = `orderer${i}-${savedOrderingService.orgId.name}`.toLowerCase();
                let ordererNode = {
                    name: ordererName,
                    orgId: savedOrderingService.orgId._id,
                    caId: savedOrderingService.caId._id,
                    tlsCaId: savedOrderingService.tlsCaId._id,
                    orderingServiceId: savedOrderingService._id,
                    port: baseOrdererPort,
                    clusterId: existingOrg.clusterId,
                    networkId: existingOrg.networkId
                };

                ordererNewlist.push(await ordererModel.ordererNode.findOneAndUpdate({ orderingServiceId: savedOrderingService._id, name: ordererName }, ordererNode, {
                    new: true,
                    upsert: true // Make this update into an upsert
                }));
                logger.debug('%s - Orderer - %s added into the database', method, ordererName);
            }

            let orderingService = {
                orderingService: savedOrderingService,
                orderingNodes: ordererNewlist
            };
            logger.debug('%s - All orderers added into', method);
            return Promise.resolve({ message: 'Ordering service added successfully', data: orderingService, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async getOrdererService(ordererParam) {
        const method = 'getOrdererService';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererParam);

        try {
            let ordererDetail = await ordererModel.ordererService.findOne({ _id: ordererParam._id })
                .populate('orgId');
            if (!ordererDetail) {
                logger.error('%s - Ordering service not exists', method);
                return Promise.reject({ message: 'Ordering service does not exists', httpStatus: 400 });
            }
            logger.debug('%s - Ordering service information returned from database', method);
            return Promise.resolve({ message: 'Success', data: ordererDetail, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async getAllOrdererServicesByNetwork(data) {
        const method = 'getAllOrdererService';
        logger.debug('%s - start', method);
        try {
            let ordererList = await ordererModel.ordererService.aggregate([
                { $match: { networkId: mongoose.Types.ObjectId(data.networkId) } },
                {
                    $lookup: {
                        from: 'organisations',
                        as: 'organisation',
                        let: { orgId: '$orgId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$orgId'] } } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'ca',
                        let: { caId: '$caId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$caId'] } } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'tlsCa',
                        let: { tlsCaId: '$tlsCaId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$tlsCaId'] } } }
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
                {
                    $lookup: {
                        from: 'clusters',
                        as: 'cluster',
                        let: { clusterId: '$clusterId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                            { $project: { configuration: 0 } }
                        ]
                    }
                },
                { $unwind: '$ca' },
                { $unwind: '$organisation' },
                { $unwind: '$tlsCa' },
                { $unwind: '$cluster' },
                { $unwind: '$network' },
            ]);
            if (!ordererList.length) {
                logger.error('%s - Ordering service does not exists', method);
                return Promise.reject({ message: 'Ordering service does not exists', httpStatus: 400 });
            }
            logger.debug('%s - Ordering service information returned from database', method);
            return Promise.resolve({ message: 'Success', data: ordererList, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async getAllOrdererServicesByCluster(data) {
        const method = 'getAllOrdererService';
        logger.debug('%s - start', method);
        try {
            let ordererList = await ordererModel.ordererService.aggregate([
                { $match: { clusterId: mongoose.Types.ObjectId(data.clusterId) } },
                {
                    $lookup: {
                        from: 'organisations',
                        as: 'organisation',
                        let: { orgId: '$orgId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$orgId'] } } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'ca',
                        let: { caId: '$caId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$caId'] } } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'tlsCa',
                        let: { tlsCaId: '$tlsCaId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$tlsCaId'] } } }
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
                {
                    $lookup: {
                        from: 'clusters',
                        as: 'cluster',
                        let: { clusterId: '$clusterId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                            { $project: { configuration: 0 } }
                        ]
                    }
                },
                { $unwind: '$ca' },
                { $unwind: '$organisation' },
                { $unwind: '$tlsCa' },
                { $unwind: '$cluster' },
                { $unwind: '$network' },]);
            if (!ordererList.length) {
                logger.error('%s - Ordering service does not exists', method);
                return Promise.reject({ message: 'Ordering service does not exists', httpStatus: 400 });
            }
            logger.debug('%s - Ordering service information returned from database', method);
            return Promise.resolve({ message: 'Success', data: ordererList, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async getAllOrdererNodes(orderingService) {
        const method = 'getAllOrdererNodes';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, orderingService);

        try {
            let orderersList = await ordererModel.ordererNode.aggregate([
                { $match: { orderingServiceId: mongoose.Types.ObjectId(orderingService._id) } },
                {
                    $project: {
                        tlsCacerts: 0, tlsPrimaryKey: 0, tlsSignCert: 0,
                        cacets: 0, primaryKey: 0, signCert: 0
                    }
                },

                {
                    $lookup: {
                        from: 'organisations',
                        as: 'organisation',
                        let: { orgId: '$orgId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$orgId'] } } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'ca',
                        let: { caId: '$caId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$caId'] } } }
                        ]
                    }
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'tlsCa',
                        let: { tlsCaId: '$tlsCaId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$tlsCaId'] } } }
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
                {
                    $lookup: {
                        from: 'clusters',
                        as: 'cluster',
                        let: { clusterId: '$clusterId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$clusterId'] } } },
                            { $project: { configuration: 0 } }
                        ]
                    }
                },
                { $unwind: '$ca' },
                { $unwind: '$organisation' },
                { $unwind: '$tlsCa' },
                { $unwind: '$cluster' },
                { $unwind: '$network' },
            ]);

            if (!orderersList.length) {
                logger.error('%s - Ordering nodes does not exists', method);
                return Promise.reject({ message: 'Ordering nodes does not exists', httpStatus: 400 });
            }
            logger.debug('%s - Ordering nodes information returned from database', method);
            return Promise.resolve({ message: 'Success', data: orderersList, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

	static async registerOrderingNodesWithCa(ordererRequest) {
		const method = "registerOrderingNodesWithCa";
		logger.debug("%s - start", method);
		logger.debug(
			"%s - has received the parameters %j",
			method,
			ordererRequest
		);

		try {
			let savedOrderingService = await ordererModel.ordererService
				.findById({ _id: ordererRequest._id })
				.populate("orgId")
				.populate({
					path: "caId",
					populate: { path: "networkId" },
				})
				.populate({
					path: "tlsCaId",
					populate: { path: "networkId" },
				});
			if (!savedOrderingService) {
				logger.error("%s - Ordering service does not exists", method);
				return Promise.reject({
					message: "Ordering service does not exists",
					httpStatus: 400,
				});
			}

			logger.debug(
				"%s - Ordering service fetched from database: %j",
				method,
				savedOrderingService
			);

			let savedcaId = savedOrderingService.caId._id;
			let savedcaName = savedOrderingService.caId.name;
			let admnId = savedOrderingService.caId.admnId;
			let admnSecret = savedOrderingService.caId.admnSecret;
			let namespace = savedOrderingService.caId.networkId.namespace;
			/* If ca is of tls type change the above variables with the values from the tls ca*/
			if (ordererRequest.isTLS) {
				logger.debug("%s - Request for TLS CA", method);
				savedcaId = savedOrderingService.tlsCaId._id;
				savedcaName = savedOrderingService.tlsCaId.name;
				admnId = savedOrderingService.tlsCaId.admnId;
				admnSecret = savedOrderingService.tlsCaId.admnSecret;
				namespace = savedOrderingService.tlsCaId.networkId.namespace;
			}

			logger.debug("%s - savedcaId: %s", method, savedcaId);
			logger.debug("%s - savedcaName: %s", method, savedcaName);
			logger.debug("%s - admnId: %s", method, admnId);
			logger.debug("%s - admnSecret: %s", method, admnSecret);

			let savedAdmin = await caModel.caAdmin.findOne({ caId: savedcaId });
			if (!savedAdmin) {
				logger.error("%s - Organisation Admin does not exists", method);
				return Promise.reject({
					message: "Org Admin does not exists or not registered",
					httpStatus: 400,
				});
			}

			const basePath = `${utils.getCaBasePath(namespace, savedcaName)}`;
			const ccpPath = `${basePath}/config.json`;
			const ccpJSON = fs.readFileSync(ccpPath, "utf8");
			const ccp = JSON.parse(ccpJSON);
			const walletPath = `${basePath}/wallet`;
			const tlsPath = `${basePath}/tls-cert.pem`;

			logger.debug("%s - basePath: %s", method, basePath);
			logger.debug("%s - ccpPath: %s", method, ccpPath);
			logger.debug("%s - walletPath: %s", method, walletPath);

			/*
			 *
			 * ############################## Fabric 2.x Version changes here ##############################
			 * Now imports will be like this -------- const { Wallets, X509WalletMixin } = require('fabric-network');
			 * And will be used like below --------
			 *
			 */

			// Create a new file system based wallet for managing identities.
			// const wallet = new FileSystemWallet(walletPath);
			const wallet = await Wallets.newFileSystemWallet(walletPath);

			// Check to see if we've already enrolled the admin user.
			// const adminExists = await wallet.exists(`${admnId}`);
			// if (!adminExists) {
			//     logger.error('%s - User %s does not exists in the wallet', method, admnId);
			//     return Promise.reject({ message: `An identity for the ${admnId}  "admin" does not exists  in the wallet`, httpStatus: 400 });
			// }

			// Check to see if we've already enrolled the admin user.
			const adminExists = await wallet.get(`${admnId}`);
			if (!adminExists) {
				console.log(
					'An identity for the admin user "admin" does not exist in the wallet'
				);
				console.log("Run the enrollAdmin.js application before retrying");
				return;
			}

			const gateway = new Gateway();
			await gateway.connect(ccp, {
				wallet,
				identity: `${admnId}`,
				discovery: { enabled: true, asLocalhost: true },
			});

			// Get the CA client object from the gateway for interacting with the CA.
			// const ca = gateway.getClient().getCertificateAuthority();
			// const adminIdentity = gateway.getIdentity();

			// Create a new CA client for interacting with the CA.
			const caInfo = ccp.certificateAuthorities[`${savedcaName}`];
			const caTLSCACerts = fs.readFileSync(tlsPath);

			const caService = new FabricCAServices(
				caInfo.url,
				{ trustedRoots: caTLSCACerts, verify: false },
				caInfo.caName
			);

			const provider = wallet
				.getProviderRegistry()
				.getProvider(adminExists.type);
			const adminIdentity = await provider.getUserContext(
				adminExists,
				`${savedcaName}`
			);

			// Fetch orderer list
			let orderersList = await ordererModel.ordererNode.find({
				orderingServiceId: ordererRequest._id,
			});

			if (!orderersList.length) {
				logger.error("%s - Ordering nodes does not exists", method, admnId);
				return Promise.reject({
					message: "Ordering nodes does not exists or not created",
					httpStatus: 400,
				});
			}

			let errorArray = Array();
			for (let i = 0; i < orderersList.length; i++) {
				let orderer = orderersList[i];

				// Register the user, enroll the user, and import the new identity into the wallet.
				try {
					await caService.register(
						{
							maxEnrollments: -1,
							enrollmentID: orderer.name,
							enrollmentSecret: admnSecret,
							role: "orderer",
						},
						adminIdentity
					);
					logger.debug(
						"%s - Ordering nodes %s registered with CA",
						method,
						orderer.name
					);
				} catch (err) {
					logger.error(
						"%s - Ordering nodes %s failed to register with CA",
						method,
						orderer.name
					);
					errorArray.push(err.message);
				}
			}

			await gateway.disconnect();
			logger.debug("%s - All Ordering nodes registered with CA", method);
			return Promise.resolve({
				message: "Successfully Registered",
				data: errorArray,
				httpStatus: 200,
			});
		} catch (err) {
			logger.error("%s - Error: %s", method, err.message);
			return Promise.reject({ message: err.message, httpStatus: 400 });
		}
	}

    // Register the organisation admin
	static async enrollOrderingNodes(ordererRequest) {
		const method = "enrollOrderingNodes";
		logger.debug("%s - start", method);
		logger.debug(
			"%s - has received the parameters %j",
			method,
			ordererRequest
		);

		try {
			let savedOrderingService = await ordererModel.ordererService
				.findById({ _id: ordererRequest._id })
				.populate("orgId")
				.populate({
					path: "caId",
					populate: { path: "networkId" },
				})
				.populate({
					path: "tlsCaId",
					populate: { path: "networkId" },
				});

			if (!savedOrderingService) {
				logger.error("%s - Ordering service does not exists", method);
				return Promise.reject({
					message: "Ordering service does not exists",
					httpStatus: 400,
				});
			}

			logger.debug(
				"%s - Ordering service fetched from database: %j",
				method,
				savedOrderingService
			);

			let savedcaId = savedOrderingService.caId._id;
			let savedcaName = savedOrderingService.caId.name;
			let admnId = savedOrderingService.caId.admnId;
			let admnSecret = savedOrderingService.caId.admnSecret;
			let namespace = savedOrderingService.caId.networkId.namespace;
			/* If ca is of tls type change the above variables with the values from the tls ca*/
			if (ordererRequest.isTLS) {
				logger.debug("%s - Request for TLS CA", method);
				savedcaId = savedOrderingService.tlsCaId._id;
				savedcaName = savedOrderingService.tlsCaId.name;
				admnId = savedOrderingService.tlsCaId.admnId;
				admnSecret = savedOrderingService.tlsCaId.admnSecret;
				namespace = savedOrderingService.tlsCaId.networkId.namespace;
			}

			logger.debug("%s - savedcaId: %s", method, savedcaId);
			logger.debug("%s - savedcaName: %s", method, savedcaName);
			logger.debug("%s - admnId: %s", method, admnId);
			logger.debug("%s - admnSecret: %s", method, admnSecret);

			let savedAdmin = await caModel.caAdmin.findOne({ caId: savedcaId });
			if (!savedAdmin) {
				logger.error("%s - Organisation Admin does not exists", method);
				return Promise.reject({
					message: "Org Admin does not exists or not registered",
					httpStatus: 400,
				});
			}

			const basePath = `${utils.getCaBasePath(namespace, savedcaName)}`;
			const ccpPath = `${basePath}/config.json`;
			const tlsPath = `${basePath}/tls-cert.pem`;
			const ccpJSON = fs.readFileSync(ccpPath, "utf8");
			const ccp = JSON.parse(ccpJSON);
			const walletPath = `${basePath}/wallet`;

			logger.debug("%s - basePath: %s", method, basePath);
			const caInfo = ccp.certificateAuthorities[savedcaName];
			const caTLSCACerts = fs.readFileSync(tlsPath);
			const caService = new FabricCAServices(
				caInfo.url,
				{ trustedRoots: caTLSCACerts, verify: false },
				caInfo.caName
			);

			//Fetch orderer list
			let orderersList = await ordererModel.ordererNode.find({
				orderingServiceId: ordererRequest._id,
			});
			if (!orderersList.length) {
				logger.error("%s - Ordering nodes does not exists", method, admnId);
				return Promise.reject({
					message: "Ordering nodes does not exists or not enrolled",
					httpStatus: 400,
				});
			}

			let updatedOrdererList = Array();
			for (let i = 0; i < orderersList.length; i++) {
				let orderer = orderersList[i];

				/* If ca is of tls type then add the certificates to the tls related keys*/
				if (ordererRequest.isTLS) {
					logger.debug(
						"%s - **************** TLS ENABLED ********************",
						method
					);
					let enrollment = await caService.enroll({
						enrollmentID: orderer.name,
						enrollmentSecret: admnSecret,
						profile: "tls",
					});

					orderer.admnSecret = admnSecret;
					orderer.tlsCacerts = enrollment.rootCertificate;
					orderer.tlsPrimaryKey = enrollment.key.toBytes();
					orderer.tlsSignCert = enrollment.certificate;
				} else {
					/* If ca is of not of tls type then add the certificates to the other keys*/
					logger.debug(
						"%s - **************** TLS DISABLED ********************",
						method
					);
					let enrollment = await caService.enroll({
						enrollmentID: orderer.name,
						enrollmentSecret: admnSecret,
					});
					orderer.admnSecret = admnSecret;
					orderer.cacets = enrollment.rootCertificate;
					orderer.primaryKey = enrollment.key.toBytes();
					orderer.signCert = enrollment.certificate;
				}

				/* Add or update the orderer nodes values to the db and also add the returned result to  the array so that it can be returned in the api response*/
				updatedOrdererList.push(
					await ordererModel.ordererNode.findOneAndUpdate(
						{
							orderingServiceId: savedOrderingService._id,
							name: orderer.name,
						},
						orderer,
						{
							new: true,
							upsert: true, // Make this update into an upsert
						}
					)
				);
				logger.debug(
					"%s - Ordering nodes %s enrolled with CA",
					method,
					orderer.name
				);
			}
			logger.debug("%s - All Ordering nodes enrolled with CA", method);
			return Promise.resolve({
				message: "Successfully registered",
				data: orderersList,
				httpStatus: 200,
			});
		} catch (err) {
			logger.error("%s - Error: %s", method, err.message);
			return Promise.reject({ message: err.message, httpStatus: 400 });
		}
	}

	static async  generateOrderingServiceMsp(ordererMspRequest) {
		const method = "generateOrderingServiceMsp";
		logger.debug("%s - start", method);
		logger.debug(
			"%s - has received the parameters %j",
			method,
			ordererMspRequest
		);

		try {
			// Fetch orderer list
			let orderersList = await ordererModel.ordererNode
				.find({ orderingServiceId: ordererMspRequest._id })
				.populate("orgId")
				.populate("caId")
				.populate("tlsCaId")
				.populate("networkId");

			if (!orderersList.length) {
				logger.error("%s - Ordering nodes does not exists", method);
				return Promise.reject({
					message: "Ordering nodes does not exists",
					httpStatus: 400,
				});
			}

			// Fetch orderer organisation admin
			let orgAdmin = await caModel.orgAdmin
				.findOne({ _id: orderersList[0].orgId.adminId })
				// .populate("orgId")
				.populate("caId");
			// .populate("tlsCaId");

			if (!orgAdmin) {
				logger.error("%s - Organisation admin does not exists", method);
				return Promise.reject({
					message: "Organisation admin for ca does not exists",
					httpStatus: 400,
				});
			}

			if (!orgAdmin.cacets) {
				logger.error("%s - Organisation admin is not enrolled", method);
				return Promise.reject({
					message: "Organisation admin is not enrolled",
					httpStatus: 400,
				});
			}

			for (let i = 0; i < orderersList.length; i++) {
				let ordererNode = orderersList[i];
				if (!ordererNode.cacets || !ordererNode.tlsCacerts) {
					logger.error(
						"%s - Orderer %s is not enrolled",
						method,
						ordererNode.name
					);
					return Promise.reject({
						message: "Orderer must be enrolled to  ORG CA and TLS CA ",
						httpStatus: 400,
					});
				}

				// const basePath = `${os.homedir}/${config.home}/${ordererNode.orgId.name}-${ordererNode.caId.name}`;
				const basePath = utils.getBasePath(
					ordererNode.networkId.namespace,
					ordererNode.orgId.name,
					ordererNode.caId.name
				);

				const orgMspPath = `${basePath}/msp`;
				const orgClientPath = `${basePath}/admin/msp`;
				const mspPath = `${basePath}/${ordererNode.name}/crypto/msp`;
				const tlsMspPath = `${basePath}/${ordererNode.name}/crypto/tls`;

				logger.debug("%s - basePath: %s", method, basePath);
				logger.debug("%s - orgMspPath: %s", method, orgMspPath);
				logger.debug("%s - orgClientPath: %s", method, orgClientPath);
				logger.debug("%s - mspPath: %s", method, mspPath);
				logger.debug("%s - tlsMspPath: %s", method, tlsMspPath);

				// organisation msp
				if (i === 0) {
					fs.outputFileSync(
						`${orgMspPath}/admincerts/admin.pem`,
						orgAdmin.signCert
					);
					fs.outputFileSync(
						`${orgMspPath}/cacerts/ca.pem`,
						ordererNode.cacets
					);
					fs.outputFileSync(
						`${orgMspPath}/tlscacerts/tlsca.pem`,
						ordererNode.tlsCacerts
					);
                    await utils.writenodeOUSConfigYaml(`${orgMspPath}/config.yaml`);
					logger.debug("%s - Organisation MSP generated", method);
				}

				// orderer msp
				fs.outputFileSync(
					`${mspPath}/admincerts/admin.pem`,
					orgAdmin.signCert
				);
				fs.outputFileSync(`${mspPath}/cacerts/ca.pem`, ordererNode.cacets);
				fs.outputFileSync(
					`${mspPath}/keystore/key.pem`,
					ordererNode.primaryKey
				);
				fs.outputFileSync(
					`${mspPath}/signcerts/signcerts.pem`,
					ordererNode.signCert
				);
				fs.outputFileSync(
					`${mspPath}/tlscacerts/tlsca.pem`,
					ordererNode.tlsCacerts
				);
                await utils.writenodeOUSConfigYaml(`${mspPath}/config.yaml`);

				fs.outputFileSync(`${tlsMspPath}/ca.crt`, ordererNode.tlsCacerts);
				fs.outputFileSync(
					`${tlsMspPath}/server.key`,
					ordererNode.tlsPrimaryKey
				);
				fs.outputFileSync(
					`${tlsMspPath}/server.crt`,
					ordererNode.tlsSignCert
				);

				fs.outputFileSync(
					`${orgClientPath}/admincerts/admin.pem`,
					orgAdmin.signCert
				);
				fs.outputFileSync(
					`${orgClientPath}/cacerts/ca.pem`,
					orgAdmin.cacets
				);
				fs.outputFileSync(
					`${orgClientPath}/keystore/key.pem`,
					orgAdmin.primaryKey
				);
				fs.outputFileSync(
					`${orgClientPath}/signcerts/signcerts.pem`,
					orgAdmin.signCert
				);
				fs.outputFileSync(
					`${orgClientPath}/tlscacerts/tlsca.pem`,
					ordererNode.tlsCacerts
				);
                await utils.writenodeOUSConfigYaml(`${orgClientPath}/config.yaml`);
				logger.debug(
					"%s - orderer %s MSP generated",
					method,
					ordererNode.name
				);
			}

			logger.debug("%s - Orderer org MSP generated", method);
			return Promise.resolve({
				message: "MSP structure successfully generated",
				httpStatus: 200,
			});
		} catch (err) {
			logger.error("%s - Error: %s", method, err.message);
			return Promise.reject({ message: err.message, httpStatus: 400 });
		}
	}

    static async addConsortiumMembers(consortiumParam) {
        const method = 'addConsortiumMembers';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, consortiumParam);

        try {
            let ordererDetail = await ordererModel.ordererService.findById(consortiumParam.orderingServiceId);
            if (!ordererDetail) {
                logger.error('%s - Ordering service does not exists', method);
                return Promise.reject({ message: 'Ordering service does not exists', httpStatus: 400 });
            }

            let orgDetail = await orgModel.findOne({ _id: consortiumParam.orgId, type: 0 })
                .populate('caId')
                .populate('networkId');
            if (!orgDetail) {
                logger.error('%s - Organisation does not exists', method);
                return Promise.reject({ message: 'Organisation does not exist or is a orderer org', httpStatus: 400 });
            }

            // const basePath = `${os.homedir}/${config.home}/${orgDetail.name}-${orgDetail.caId.name}`;


            const basePath = utils.getBasePath(orgDetail.networkId.namespace, orgDetail.name, orgDetail.caId.name);

            const orgMspPath = `${basePath}/msp`;
            if (!fs.existsSync(orgMspPath)) {
                return Promise.reject({ message: 'Organisation must have atleast one peer with msp generated', httpStatus: 400 });
            }

            let alreadyAddedObj = await ordererModel.ordererService.findOne({
                _id: ordererDetail._id, consortium: { $in: [mongoose.Types.ObjectId(orgDetail._id)] }
            });

            if (alreadyAddedObj) {
                logger.error('%s - Organisation already part of consortium %j', method, alreadyAddedObj);
                return Promise.reject({ message: 'Organisation already a part of consortium', httpStatus: 400 });
            }

            ordererDetail.consortium.push(orgDetail._id);
            await ordererDetail.save();
            logger.debug('%s - Organisation added in consortium', method);
            return Promise.resolve({ message: 'Success', data: ordererDetail, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }


    static async copyCryptoMaterialToNfs(ordererRequest) {
        const method = 'copyCryptoMaterialToNfs';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererRequest);

        try {
            let orderer = await ordererModel.ordererNode.findById({ _id: ordererRequest._id })
                .populate('orgId')
                .populate('caId');

            if (!orderer) {
                logger.error('%s - Orderer does not exists', method);
                return Promise.reject({ message: 'Orderer does not exists', httpStatus: 400 });
            }

            let clusterData = await cluster.findOne({ _id: orderer.orgId.clusterId })
                .populate({
                    path: 'master_node',
                    select: 'ip username password',
                    match: {
                        status: { $eq: 1 }
                    }
                });

            logger.debug('%s - Orderer fetched from database: %j', method, orderer);
            logger.debug('%s - Cluster fetched from database: %j', method, clusterData);

            const networkDetail = await NetworkController.getNetWorkDetail(orderer.orgId.networkId);
            logger.debug('%s - Network fetched from database: %j', method, networkDetail);

            let response = await new KubernetesRepository().copyCryptoMaterialToNfs(orderer, networkDetail[0].namespace, clusterData.master_node);
            logger.debug('%s - Crypto material copied to cluster', method);
            return Promise.resolve({ message: 'Success', data: response, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async copyChannelArtifactsToNfs(ordererRequest) {
        const method = 'copyChannelArtifactsToNfs';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererRequest);

        try {
            let orderer = await ordererModel.ordererNode.findById({ _id: ordererRequest._id })
                .populate('orgId')
                .populate('caId');

            if (!orderer) {
                logger.error('%s - Orderer does not exists', method);
                return Promise.reject({ message: 'Orderer does not exists', httpStatus: 400 });
            }

            let clusterData = await cluster.findOne({ _id: orderer.orgId.clusterId })
                .populate({
                    path: 'master_node',
                    select: 'ip username password',
                    match: {
                        status: { $eq: 1 }
                    }
                });

            logger.debug('%s - Orderer fetched from database: %j', method, orderer);
            logger.debug('%s - Cluster fetched from database: %j', method, clusterData);
            const networkDetail = await NetworkController.getNetWorkDetail(orderer.orgId.networkId);
            logger.debug('%s - Network fetched from database: %j', method, networkDetail);

            let response = await new KubernetesRepository().copyChannelArtifactsToNfs(orderer, networkDetail[0].namespace, clusterData.master_node);

            logger.debug('%s - Channel Artifacts copied to cluster', method);
            return Promise.resolve({ message: 'Success', data: response, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async createGenesisBlock(genesisRequest) {
        const method = 'createGenesisBlock';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, genesisRequest);

        try {
            let ordererDetailList = await ordererModel.ordererService.aggregate([
                {
                    $match: { _id: mongoose.Types.ObjectId(genesisRequest._id) },
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'ca',
                        let: { caId: '$caId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$caId'] } } },
                        ]
                    },
                },
                {
                    $lookup: {
                        from: 'cas',
                        as: 'tlsCa',
                        let: { tlsCaId: '$tlsCaId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$tlsCaId'] } } },
                        ]
                    },
                },
                {
                    $lookup: {
                        from: 'organisations',
                        as: 'org',
                        let: { orgId: '$orgId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$orgId'] } } },
                        ]
                    },
                },
                {
                    $lookup: {
                        from: 'networks',
                        as: 'network',
                        let: { networkId: '$networkId' },
                        pipeline: [
                            { $match: { $expr: { $eq: ['$_id', '$$networkId'] } } },
                        ]
                    },
                },
                {
                    $lookup: {
                        from: 'organisations',
                        as: 'organisations',
                        let: { consortium: '$consortium' },
                        pipeline: [
                            { $match: { $expr: { $in: ['$_id', '$$consortium'] } } },
                            {
                                $lookup: {
                                    from: 'cas',
                                    as: 'ca',
                                    let: { caId: '$caId' },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ['$_id', '$$caId'] } } },
                                    ]
                                }
                            },
                            {
                                $lookup: {
                                    from: 'networks',
                                    as: 'network',
                                    let: { networkId: '$networkId' },
                                    pipeline: [
                                        { $match: { $expr: { $eq: ['$_id', '$$networkId'] } } },
                                    ]
                                },
                            },
                            { $unwind: '$network' },
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
                            { $unwind: '$peer' },
                            { $unwind: '$ca' },
                        ]
                    },
                },
                { $unwind: '$ca' },
                { $unwind: '$tlsCa' },
                { $unwind: '$org' },
                { $unwind: '$network' },
            ]);

            if (!ordererDetailList.length) {
                logger.error('%s - Ordering service does not exists', method);
                return Promise.reject({ message: 'Ordering service does not exists', httpStatus: 400 });
            }

            let ordererDetail = ordererDetailList[0];

            //Fetch orderer list
            let orderersList = await ordererModel.ordererNode.find({ orderingServiceId: genesisRequest._id })
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId')
                .populate('networkId');

            if (!orderersList.length) {
                logger.error('%s - Ordering nodes does not exists', method);
                return Promise.reject({ message: 'Ordering nodes does not exists', httpStatus: 400 });
            }
            if (!ordererDetail.organisations.length) {
                return Promise.reject({ message: 'Add organization to the consortium', httpStatus: 400 });
            }
            
            // console.log("ordererDetail data :", ordererDetail)
            let genesisFile;
            if (ordererDetail.ordererType === 1) {
                // Raft  ordering service
                logger.debug('%s - Raft Orderer', method);
                genesisFile = configtx.getGenesisRaftTx(orderersList, ordererDetail);
            } else {
                //Solo ordering service
                logger.debug('%s - Solo Orderer', method);
                genesisFile = configtx.getGenesisSoloTx(orderersList[0], ordererDetail);
            }
            
            // let genesisFilePath = `${os.homedir}/${config.home}/${ordererDetail.network.namespace}/${ordererDetail.org.name}-${ordererDetail.ca.name}/channel-artifacts`;
            const basePath = utils.getBasePath(
                ordererDetail.network.namespace,
                ordererDetail.org.name,
                ordererDetail.ca.name
            );
            const genesisFilePath = `${basePath}/channel-artifacts/testConfigFile`;
            logger.debug('%s - genesisFilePath: %s', method, genesisFilePath);
            await utils.writeYaml2(`${genesisFilePath}/configtx.yaml`, genesisFile);
            // logger.debug('%s - Genesis file written', method);
            // configtx.generateGenesisBlock(genesisFilePath, ordererDetail.ordererType);
            return Promise.resolve({ message: 'Success', data: genesisFilePath, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async createOrdererService(ordererRequest) {
        const method = 'createOrdererService';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererRequest);

        try {
            let orderer = await ordererModel.ordererNode.findById({ _id: ordererRequest._id })
                .populate('orgId')
                .populate('caId');
            if (!orderer) {
                logger.error('%s - Orderer does not exists', method);
                return Promise.reject({ message: 'Orderer does not exists', httpStatus: 400 });
            }
            const networkDetail = await NetworkController.getNetWorkDetail(orderer.orgId.networkId);
            logger.debug('%s - Network fetched from database: %j', method, networkDetail);

            let response = await new KubernetesRepository().createOrdererService(orderer, networkDetail[0].namespace);
            logger.debug('%s - Orderer node service deployed to cluster', method);
            return Promise.resolve({ message: 'Success', data: response, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async createOrdererDeployment(ordererRequest) {
        const method = 'createOrdererDeployment';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, ordererRequest);

        try {
            let orderer = await ordererModel.ordererNode.findById({ _id: ordererRequest._id })
                .populate('orgId')
                .populate('caId');
            if (!orderer) {
                logger.error('%s - Orderer does not exists', method);
                return Promise.reject({ message: 'Orderer does not exists', httpStatus: 400 });
            }
            const networkDetail = await NetworkController.getNetWorkDetail(orderer.orgId.networkId);
            logger.debug('%s - Network fetched from database: %j', method, networkDetail);

            let response = await new KubernetesRepository().createOrdererDeployment(orderer, networkDetail[0].namespace);
            logger.debug('%s - Orderer node deployed to cluster', method);
            return Promise.resolve({ message: 'Success', data: response, httpStatus: 200 });
        } catch (err) {
            fabdr
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }
    
    static async deleteOrderer(ordererRequest) {
        try {
            let orderer = await ordererModel.ordererNode.findById({ _id: ordererRequest._id })
                .populate('orgId')
                .populate({
                    path: 'caId',
                    populate: { path: 'networkId' }
                });
            let response = await new KubernetesRepository().deleteOrderer(orderer);
            await ordererModel.ordererNode.deleteOne({ _id: ordererRequest._id });
            return Promise.resolve({ message: 'Success', data: response, httpStatus: 200 });
        } catch (err) {
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // export ordering service
    static async exportOrderingService(data) {
        const method = 'exportOrderingService';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, data);
        try {
            let ordererDetail = await ordererModel.ordererService
                .findById(data._id)
                .populate('orgId')
                .populate('caId')
                .populate('tlsCaId');
            if (!ordererDetail) {
                return Promise.reject({
                    message: 'Ordering service does not exists',
                    httpStatus: 400,
                });
            }
            // console.log(ordererDetail._id);
            let orderernodeArray = await channelconfigtx.fetchordernodeDetail(ordererDetail._id);
            if (!orderernodeArray.length) {
                return Promise.reject({ message: 'Ordering nodes does not exists', httpStatus: 400 });
            }
            let ordernode = orderernodeArray[0];
            let exportOrderingService = {
                name: ordernode.name,
                url: `grpcs://${ordernode.organisation.cluster.masternode.ip}:${ordernode.port}`,
                msp_name: ordernode.organisation.name,
                mspId: ordernode.organisation.mspId,
                servicename: ordererDetail.name,
                ordererType: ordererDetail.ordererType,
                port: ordernode.port,
                admincerts: ordernode.organisation.orgadmin.signCert,
                tlsCacerts: ordernode.tlsCacerts,
                cacets: ordernode.cacets,
            };
            return Promise.resolve({ message: 'Success', data: exportOrderingService, httpStatus: 200 });
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    // import ordering service 
    static async importOrderingService(orgParam) {
        const method = 'importOrderingService';
        logger.debug('%s - start', method);
        logger.debug('%s - has received the parameters %j', method, orgParam);

        try {
            let networkDetail = await Network.findById(orgParam.networkId);
            if (!networkDetail) {
                return Promise.reject({ message: 'Network Not exist', httpStatus: 400 });
            }
            let existingOrg = await orgModel.findOne({ name: orgParam.msp_name, networkId: orgParam.networkId });
            if (existingOrg) {
                logger.error('%s - Organisation already exists with the same name', method);
                return Promise.reject({ message: 'Organisation already exists', httpStatus: 400 });
            }
            let existingMsp = await orgModel.findOne({ mspId: orgParam.mspId, networkId: orgParam.networkId });
            if (existingMsp) {
                logger.error('%s - MSP ID already exists', method);
                return Promise.reject({ message: 'MSPID  already exists', httpStatus: 400 });
            }

            let existingOrderer = await ordererModel.ordererService.findOne({ name: orgParam.servicename });
            if (existingOrderer) {
                return Promise.reject({ message: 'Ordering service already exists with same name', httpStatus: 400 });
            }
            let checkorderenode = await ordererModel.ordererNode.findOne({ name: orgParam.name });
            if (checkorderenode) {
                logger.error('%s - OrderNode  already exists', method);
                return Promise.reject({ message: 'OrderNode  already exists', httpStatus: 400 });
            }
            let orgDetail = {
                name: orgParam.msp_name,
                mspId: orgParam.mspId,
                networkId: orgParam.networkId,
                type: 1,
                external: 1
            };
            let saveOrg = await orgModel.create(orgDetail);
            // create organisation msp
            if (saveOrg) {
                const basePath = utils.getExportedOrdererBasePath(networkDetail.namespace, orgParam.servicename)
                const orgMspPath = `${basePath}/msp`;
                fs.outputFileSync(`${orgMspPath}/admincerts/admin.pem`, orgParam.admincerts);
                fs.outputFileSync(`${orgMspPath}/cacerts/ca.pem`, orgParam.cacets);
                fs.outputFileSync(`${orgMspPath}/tlscacerts/tlsca.pem`, orgParam.tlsCacerts);
            }

            let ordservicedata = {
                name: orgParam.servicename,
                orgId: saveOrg._id,
                networkId: orgParam.networkId,
                ordererType: orgParam.ordererType,
                external: 1
            };
            let savedService = await ordererModel.ordererService.create(ordservicedata);
            if (savedService) {
                let ordererNodeData = {
                    name: orgParam.name,
                    orgId: saveOrg._id,
                    orderingServiceId: savedService._id,
                    port: orgParam.port,
                    cacets: orgParam.cacets,
                    tlsCacerts: orgParam.tlsCacerts,
                    networkId: orgParam.networkId,
                    external: 1,
                    extras: {
                        admincerts: orgParam.admincerts,
                        url: orgParam.url,
                    }
                };

                let saveNode = await ordererModel.ordererNode.create(ordererNodeData);

                if (saveNode) {
                    return Promise.resolve({ message: 'Ordering service imported  successfully', data: saveOrg, httpStatus: 200 });
                } else {
                    await orgModel.find({ _id: saveOrg._id }).remove();
                    await ordererModel.ordererService.find({ _id: savedService._id }).remove();
                    return Promise.reject({ message: 'OrderNode  not saved successfully exists', httpStatus: 400 });
                }
            } else {
                return Promise.reject({ message: 'Ordering service   not saved successfully exists', httpStatus: 400 });
            }
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }
    }

    static async writeOrdererKubernetesFiles(ordererRequest) {
        const method = 'writePeerKubernetesFiles';
        try {
            let orderer = await ordererModel.ordererNode.findById({ _id: ordererRequest._id })
                .populate('orgId')
                .populate('caId');
            if (!orderer) {
                logger.error('%s - Orderer does not exists', method);
                return Promise.reject({ message: 'Orderer does not exists', httpStatus: 400 });
            }
            const networkDetail = await NetworkController.getNetWorkDetail(orderer.orgId.networkId);
            logger.debug('%s - Network fetched from database: %j', method, networkDetail);
            let namespace = networkDetail[0].namespace
            let deployment = await new KubernetesRepository().getOrdererdeployment(orderer, namespace)
            const svc = await new KubernetesRepository().getOrdererService(orderer)

            const deploymentPath = `${os.homedir}/kubefiles/${orderer.orgId.name}/${orderer.name}-deployment.yaml`;
            const svcPath = `${os.homedir}/kubefiles/${orderer.orgId.name}/${orderer.name}-svc.yaml`;

            await utils.writeYaml2(deploymentPath, deployment);
            await utils.writeYaml2(svcPath, svc);
            return Promise.resolve(deploymentPath);
        } catch (err) {
            logger.error('%s - Error: %s', method, err.message);
            return Promise.reject({ message: err.message, httpStatus: 400 });
        }

    }
}

module.exports = OrdererController;