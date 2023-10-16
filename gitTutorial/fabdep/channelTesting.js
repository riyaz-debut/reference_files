// =================== channel seperate functions =================================== 
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
        
        // console.log("peerDetails data :", peerDetails)
        // console.log("orderernode data :", orderernode)
        // console.log("channelDetail data :", channelDetail)
        // Add peer information in ccp file
        await configtx.addPeerinCcp(
            ccpPath,
            peerDetails,
            // clusterData,
            channelDetail.name
        );
        
        // const joinresult = await channelCreate.joinChannel(joinrequest);
        // changes according to fabric version 2.x
        // const joinresult = await configtx.joinChannelData(basePath, peerDetails, orderernode, channelDetail.name);
        // const joinresult = await configtx.setAnchorPeer(basePath, peerDetails, orderernode, channelDetail.name);
        const joinresult = await configtx.updateAnchorPeers(basePath, peerDetails, orderernode, channelDetail.name);
        if (joinresult && joinresult[0].response && joinresult[0].response.status === 200) {
            console.log('Joined successfully');
            organisation.joinedpeer.push(data.peerId);
            await organisation.save();
            await gateway.disconnect();
            console.log(organisation);
            logger.debug('%s - success %j', method, joinresult);
            return Promise.resolve({
                message: joinresult,
                httpStatus: 200
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


// ======================== combined channel function =======================================

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
        
        // console.log("peerDetails data :", peerDetails)
        // console.log("orderernode data :", orderernode)
        // console.log("channelDetail data :", channelDetail)
        // Add peer information in ccp file
        await configtx.addPeerinCcp(
            ccpPath,
            peerDetails,
            // clusterData,
            channelDetail.name
        );
        
        // const joinresult = await channelCreate.joinChannel(joinrequest);
        // changes according to fabric version 2.x
        const joinresult = await configtx.joinChannelData(basePath, peerDetails, orderernode, channelDetail.name);
        // const joinresult = await configtx.setAnchorPeer(basePath, peerDetails, orderernode, channelDetail.name);
        // const joinresult = await configtx.updateAnchorPeers(basePath, peerDetails, orderernode, channelDetail.name);
        if (joinresult && joinresult[0].response && joinresult[0].response.status === 200) {
            console.log('Joined successfully');
            organisation.joinedpeer.push(data.peerId);
            await organisation.save();
            await gateway.disconnect();
            console.log(organisation);
            logger.debug('%s - success %j', method, joinresult);
            setAnchorPeerResult = await configtx.setAnchorPeer(basePath, peerDetails, orderernode, channelDetail.name);
            if (setAnchorPeerResult && setAnchorPeerResult[0].response && setAnchorPeerResult[0].response.status === 200) {
                console.log('set anchor peer successfully');
                logger.debug('%s - success %j', method, setAnchorPeerResult);
                updateAnchorPeerResult = await configtx.updateAnchorPeers(basePath, peerDetails, orderernode, channelDetail.name);
                if (updateAnchorPeerResult && updateAnchorPeerResult[0].response && updateAnchorPeerResult[0].response.status === 200) {
                    console.log('updated anchor peer successfully');
                    logger.debug('%s - success %j', method, updateAnchorPeerResult);
                    return Promise.resolve({
                        message: updateAnchorPeerResult,
                        httpStatus: 200
                    });
                    
                }
                return Promise.reject({
                    message: joinresult,
                    httpStatus: 400,
                });
            }
            return Promise.reject({
                message: joinresult,
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
