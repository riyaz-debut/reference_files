'use strict';
const { check, validationResult } = require('express-validator');

class OrgValidator {
    validateHandler(req, res, next) {
        let errors = validationResult(req);
        if (errors.isEmpty()) {
            next();
        } else {
            res.status(422).send({ message: errors.errors[0].msg, status: 0 });
        }
    }

    get orderingServiceRequest() {
        return [
            check('name').not().isEmpty().withMessage('Orderer service name is required.').isString(),
            check('orgId').not().isEmpty().withMessage('Organisation id  is required.').isString(),
            check('ordererType').not().isEmpty().withMessage('Org type is required.').isNumeric(),
        ];
    }
    get getOrderingServiceRequest() {
        return [
            check('_id').not().isEmpty().withMessage('Ordering service id  is required.').isString(),
        ];
    }


    get importOrderingServiceRequest() {
        return [
            check('name').not().isEmpty().withMessage('Ordering  name is required.').isString(),
            check('servicename').not().isEmpty().withMessage('servicename  name is required.').isString(),
            check('networkId').not().isEmpty().withMessage('Network id is required.').isString(),
            check('port').not().isEmpty().withMessage('port is required.').isNumeric(),
            check('msp_name').not().isEmpty().withMessage('msp_name  is required.').isString(),
            check('mspId').not().isEmpty().withMessage('OrgMsp  is required.').isString(),
            check('ordererType').not().isEmpty().withMessage('ordererType is required.').isNumeric(),
            check('tlsCacerts').not().isEmpty().withMessage('tlsCacerts name is required.').isString(),
            check('cacets').not().isEmpty().withMessage('cacets  is required.').isString(),
            check('admincerts').not().isEmpty().withMessage('admincerts name is required.').isString(),
            check('url').not().isEmpty().withMessage('url is required.').isString(),
        ];
    }




    /**
      * Validates the ID
      */
    get getNetwork() {
        return [
            check('networkId')
                .not().isEmpty().withMessage('The networkId field is required.')
                .isString().withMessage('The networkId must be a string.'),
        ];
    }
    /**
    * Validates the ID
    */
    get getCluster() {
        return [
            check('clusterId')
                .not().isEmpty().withMessage('The clusterId field is required.')
                .isString().withMessage('The clusterId must be a string.'),
        ];
    }
    get addConsortiumMember() {
        return [
            check('orgId').not().isEmpty().withMessage('Organisation id  is required.').isString(),
            check('orderingServiceId').not().isEmpty().withMessage('Orderer service  id is required.').isString(),
        ];
    }
    get exportOrderingService() {
        return [
            check('orderingServiceId').not().isEmpty().withMessage('Orderer service  id is required.').isString(),
        ];
    }
    get registerOrdererNodesRequest() {
        return [
            check('_id').not().isEmpty().withMessage('Ordering service id  is required.').isString(),
            check('isTLS').not().isEmpty().withMessage('TLS flag is required').isBoolean(),

        ];
    }

}
module.exports = OrgValidator;