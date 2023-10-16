'use strict';
const { check, validationResult } = require('express-validator');

class ChannelValidator {
    validateHandler(req, res, next) {
        let errors = validationResult(req);
        if (errors.isEmpty()) {
            next();
        } else {
            res.status(422).send({ message: errors.errors[0].msg, status: 0 });
        }
    }

    get addChannelRequest() {
        return [
            check('name').not().isEmpty().withMessage('Channel  name is required.').isString(),
            check('ordererserviceId').not().isEmpty().withMessage('orderer service id  is required').isString(),
            check('operators').not().isEmpty().withMessage('operators  ids  are required').isArray()];
    }

    get addChannelTxRequest() {
        return [
            check('channelId').not().isEmpty().withMessage('Channel id is required').isString()
        ];
    }
    get peerChannelRequest() {
        return [
            check('channelId').not().isEmpty().withMessage('Channel id is required').isString(),
            check('anchorpeerId').not().isEmpty().withMessage('Anchor Peer id is required').isString(),];

    }

    get importChannelRequest() {
        return [
            check('channelName').not().isEmpty().withMessage('ChannelName name is required.').isString(),
            check('networkId').not().isEmpty().withMessage('Network id is required.').isString(),
            check('ordererName').not().isEmpty().withMessage('ordererName is required.').isString(),
            check('ordererOrg').not().isEmpty().withMessage('Orderer organization name is required.').isString(),
            check('ordererUrl').not().isEmpty().withMessage('Orderer url is required.').isString(),
            check('ordererPort').not().isEmpty().withMessage('Orderer port is required.').isNumeric(),
            check('tlsCacerts').not().isEmpty().withMessage('tlsCacerts   is required.').isString(),
        ];
    }

    get externalOrgRequest() {
        return [
            check('channelId').not().isEmpty().withMessage('Channel id is required').isString(),
            check('orgId').not().isEmpty().withMessage('organisation id is required').isString(),
        ];

    }

    get orgChannelRequest() {
        return [
            check('channelId').not().isEmpty().withMessage('Channel id is required').isString(),
            check('orgId').not().isEmpty().withMessage('Organisation id is required').isString(),];

    }

    get updatePolicyRequest() {
        return [
            check('channelId').not().isEmpty().withMessage('Channel id is required').isString(),
            check('orgId').not().isEmpty().withMessage('Organisation id is required').isString(),
            check('isRemoveOrg').not().isEmpty().withMessage('isRemoveOrg option is required').isBoolean(),
            check('isRemoveAdmin').not().isEmpty().withMessage('isRemoveAdmin option is required').isBoolean()];

    }

    get getPeerOrderer() {
        return [
            check('peerId').not().isEmpty().withMessage('peer id  is required.').isString(),
            check('channelId').not().isEmpty().withMessage('channelId   is required.').isString(),

        ];
    }


    get getOrderingPeerRequest() {
        return [
            check('orderernodeId').not().isEmpty().withMessage('Ordernode  id  is required.').isString(),
            check('channelId').not().isEmpty().withMessage('channelId    is required.').isString(),
        ];
    }




    get joinChannelRequest() {
        return [
            check('channelId').not().isEmpty().withMessage('Channel id is required').isString(),
            check('peerId').not().isEmpty().withMessage('Peer id is required').isString(),];

    }


    get getOrderingServiceRequest() {
        return [
            check('_id').not().isEmpty().withMessage('Ordering service id  is required.').isString(),
        ];
    }


    get getchannelsByNetwork() {
        return [
            check('networkId')
                .not().isEmpty().withMessage('The networkId field is required.')
                .isString().withMessage('The networkId must be a string.'),
        ];
    }
    /*
    get registerOrdererNodesRequest() {
        return [
            check("_id").not().isEmpty().withMessage("Ordering service id  is required.").isString(),
            check("isTLS").not().isEmpty().withMessage("TLS flag is required").isBoolean(),

        ]
    } */

}
module.exports = ChannelValidator;