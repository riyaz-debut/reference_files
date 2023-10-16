'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const channelSchema = new Schema({
    name: { type: String },
    ordererserviceId: { type: Schema.Types.ObjectId, ref: 'OrdererService' },
    status: { type: Number, default: 0 },    //NOTE 0=> deactive, 1=> active
    is_deleted: { type: Number, default: 0 },
    operators: [{
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        default: []
    }],
    extras: {
        networkId: String,
        ordererOrg: String,
        ordererUrl: String,
        ordererPort: Number,
        tlsCacerts: String,
    },
    type: { type: Number, default: 0 }, //(0)  native channel (1)  imported
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

const ChannelPeerSchema = new Schema({
    anchorpeer: { type: Schema.Types.ObjectId, ref: 'Peer' },
    configupdate: { type: Number, default: 0 },
    joinedpeer: [{ type: Schema.Types.ObjectId, ref: 'Peer' }],
    orgId: { //Organisation id
        type: Schema.Types.ObjectId,
        ref: 'Organisation'
    },
    channelId: { //Certificate authority id
        type: Schema.Types.ObjectId,
        ref: 'channel'
    }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

let channel = mongoose.model('channel', channelSchema);
let channelPeer = mongoose.model('ChannelPeer', ChannelPeerSchema);

module.exports = {
    channel,
    channelPeer
};





