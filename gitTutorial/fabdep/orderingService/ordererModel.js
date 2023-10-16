'use strict';
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ordererServiceSchema = new Schema({
    name: { type: String },
    orgId: {
        type: Schema.Types.ObjectId,
        ref: 'Organisation'
    },
    caId: {
        type: Schema.Types.ObjectId,
        ref: 'Ca'
    },
    tlsCaId: {
        type: Schema.Types.ObjectId,
        ref: 'Ca'
    },
    clusterId: { type: Schema.Types.ObjectId, ref: 'cluster' },
    networkId: { type: Schema.Types.ObjectId, ref: 'networks' },
    consortium: [{
        type: Schema.Types.ObjectId,
        ref: 'Organisation',
        required: true,
        default: []
    }],
    ordererType: { type: Number, default: 0 }, //orderer service type (0) sole and (1) for the raft
    is_deleted: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });



const ordererNodeSchema = new Schema({
    name: { type: String },
    orgId: { //Organisation id
        type: Schema.Types.ObjectId,
        ref: 'Organisation'
    },
    caId: { //Certificate authority id
        type: Schema.Types.ObjectId,
        ref: 'Ca'
    },
    tlsCaId: { //Certificate authority id
        type: Schema.Types.ObjectId,
        ref: 'Ca'
    },
    secret: { type: String },
    orderingServiceId: { //Certificate authority id
        type: Schema.Types.ObjectId,
        ref: 'OrdererService'
    },
    cacets: { type: String },
    primaryKey: { type: String },
    signCert: { type: String, default: null },
    tlsCacerts: { type: String },
    tlsPrimaryKey: { type: String },
    tlsSignCert: { type: String },
    clusterId: { type: Schema.Types.ObjectId, ref: 'cluster' },
    networkId: { type: Schema.Types.ObjectId, ref: 'networks' },
    port: { type: Number, default: 0 },
    is_deleted: { type: Number, default: 0 },
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

let ordererService = mongoose.model('OrdererService', ordererServiceSchema);
let ordererNode = mongoose.model('OrdererNode', ordererNodeSchema);

module.exports = {
    ordererService,
    ordererNode
};



