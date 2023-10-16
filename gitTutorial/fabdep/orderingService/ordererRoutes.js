'use strict';
const express = require('express');
const router = express.Router();
const ordererController = require('./ordererController');
const OrdererValidator = require('./ordererValidator');
const ordererValidatorObj = new OrdererValidator();

//Add new organisation

router.post('/addOrderingService',
    ordererValidatorObj.orderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.addOrdererService(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            console.log('Error on org add');
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


//Get  organisation detail
router.post('/orderingServiceDetail',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.getOrdererService(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

//Get  all ordering services by network
router.get('/getAllOrdererServicesByNetwork',
    ordererValidatorObj.getNetwork,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.getAllOrdererServicesByNetwork(req.query);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

//Get  all ordering services by network
router.get('/getAllOrdererServicesByCluster',
    ordererValidatorObj.getCluster,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.getAllOrdererServicesByCluster(req.query);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

// Export ordering service 
router.post('/exportOrderingService',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.exportOrderingService(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });




// Import ordering service 
router.post('/importOrderingService',
    ordererValidatorObj.importOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.importOrderingService(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

//Get  organisation detail
router.post('/getAllOrdererNodes',
    async function (req, res, next) {
        try {
            let result = await ordererController.getAllOrdererNodes(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

//Register ordering node
router.post('/registerOrderingNodesWithCa',
    ordererValidatorObj.registerOrdererNodesRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.registerOrderingNodesWithCa(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

//Register ordering node
router.post('/enrollOrderingNodes',
    ordererValidatorObj.registerOrdererNodesRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.enrollOrderingNodes(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

// Generate ordering service msp
router.post('/generateOrderingServiceMsp',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.generateOrderingServiceMsp(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

// Generate orderer kuberenetes deployments
router.post('/createOrdererDeployment',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.createOrdererDeployment(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


// Generate orderer kuberenetes service of node port type
router.post('/createOrdererService',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.createOrdererService(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


router.post('/addConsortiumMembers',
    ordererValidatorObj.addConsortiumMember,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.addConsortiumMembers(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


// Generate ordering service msp
router.post('/createGenesisBlock',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.createGenesisBlock(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

// Generate ordering service msp

router.post('/copyCryptoMaterialToNfs',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.copyCryptoMaterialToNfs(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });

        }
    });



// Generate ordering service msp
router.post('/copyChannelArtifactsToNfs',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.copyChannelArtifactsToNfs(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });

// Generate ordering service msp
router.post('/writeOrdererKubernetesFiles',
    ordererValidatorObj.getOrderingServiceRequest,
    ordererValidatorObj.validateHandler,
    async function (req, res, next) {
        try {
            let result = await ordererController.writeOrdererKubernetesFiles(req.body);
            res.status(200).send({ message: result.message, status: 1, data: result.data });
        } catch (err) {
            res.status(err.httpStatus || 500).send({ message: err.message, status: 0 });
        }
    });


module.exports = router;



