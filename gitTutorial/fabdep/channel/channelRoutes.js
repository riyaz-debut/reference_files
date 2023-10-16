'use strict';
const express = require('express');
const router = express.Router();
const channelController = require('./channelController');
const channelValidator = require('./channelValidator');
const channelValidatorObj = new channelValidator();



router.get('/',
    async (req, res, next) => {
        try {
            const result = await channelController.listChannels();
            res.status(200).send({ message: 'success', status: 1, data: result });
        } catch (error) {
            res.status(400).send({ message: error.message, status: error.status || 0 });
        }
    });


router.get('/listChannelsByNetwork',
    channelValidatorObj.getchannelsByNetwork,
    channelValidatorObj.validateHandler,
    async (req, res, next) => {
        try {
            const result = await channelController.listChannelsByNetwork(req.query);
            res.status(200).send({ message: 'success', status: 1, data: result });
        } catch (error) {
            res.status(400).send({ message: error.message, status: error.status || 0 });
        }
    });

router.get('/channel',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async (req, res, next) => {
        try {
            const result = await channelController.channelDetail(req.query);
            res.status(200).send({ message: 'success', status: 1, data: result.data });
        } catch (error) {
            res.status(400).send({ message: error.message, status: error.status || 0 });
        }
    });

//Add new organisation
router.post('/saveChannelInfo',
    channelValidatorObj.addChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.saveChannelInfo(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/createChannelTx',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.createChannelTx(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


router.post('/createChannel',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.createChannel(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/generateOrgConfig',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.createOrgConfigtx(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/getChannelConfig',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.getChannelConfig(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/getExportedChannelDetail',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.getExportedChannelDetail(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/getUpdateAliasList',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.getUpdateAliasList(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });




router.post('/createOrgConfigtx',
    channelValidatorObj.peerChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.createOrgConfigtx(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/createExternalOrgConfigtx',
    channelValidatorObj.externalOrgRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.createExternalOrgConfigtx(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });




router.post('/addOrgToChannelConfig',
    channelValidatorObj.peerChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.addOrgToChannelConfig(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });



router.post('/updateChannel',
    channelValidatorObj.peerChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.updateChannel(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/signConfigUpdateChannel',
    channelValidatorObj.peerChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.signConfigUpdateChannel(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


router.post('/joinChannel',
    channelValidatorObj.joinChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.joinChannel(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });



router.post('/addOrgAsChannelOperator',
    channelValidatorObj.orgChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.addOrgAsChannelOperator(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });



router.post('/updateChannelPolicy',
    channelValidatorObj.updatePolicyRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.updateChannelPolicy(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


router.post('/listOrderingServiceConsortium',
    channelValidatorObj.getOrderingServiceRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.listOrderingServiceConsortium(req.body);
            res.status(result.httpStatus).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/updatePeerHosts',
    channelValidatorObj.getPeerOrderer,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.updatePeerHosts(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/updateOrdererHost',
    channelValidatorObj.getOrderingPeerRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.updateOrdererHost(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/removeOrgOrAdminFromChannel',
    channelValidatorObj.orgChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.removeOrgOrAdminFromChannel(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/exportChannel',
    channelValidatorObj.addChannelTxRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.exportChannelDetail(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/importChannelDetail',
    channelValidatorObj.importChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.importChannelDetail(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/addExportedOrgToChannelConfig',
    channelValidatorObj.externalOrgRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.addExportedOrgToChannelConfig(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/updateExportedOrgToChannel',
    channelValidatorObj.updatePolicyRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.updateExportedOrgToChannel(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/getExportedChannelConfig',
    channelValidatorObj.externalOrgRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.getExportedChannelConfig(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

router.post('/joinExportedChannel',
    channelValidatorObj.joinChannelRequest,
    channelValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await channelController.joinExportedChannel(req.body);
            res.status(result.status).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.status || 500).send({ message: err.message, status: 0 });
        }
    });

module.exports = router;



