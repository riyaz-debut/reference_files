"use strict";
/*
 * SPDX-License-Identifier: Apache-2.0
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChaincodeXFarmContract = void 0;
const fabric_contract_api_1 = require("fabric-contract-api");
let ChaincodeXFarmContract = class ChaincodeXFarmContract extends fabric_contract_api_1.Contract {
    // CreateRecord issues a new record to the world state with given details.
    async CreateXFarmRecord(ctx, data) {
        let insertData = JSON.parse(data);
        console.log(" here txnid ", insertData.xfarm_id);
        //id to make key
        let xfarmId = insertData.xfarm_id;
        delete insertData.xfarm_id;
        await ctx.stub.putState(xfarmId, Buffer.from(JSON.stringify(insertData)));
        return "Data successfully added";
    }
    // ReadRecord returns the record stored in the world state with given id.
    async ReadXFarmRecord(ctx, query) {
        let queryString = query;
        let recordString = await this.GetRecordByQuery(ctx, queryString); // get the record from world state
        if (!recordString || recordString.length === 0) {
            throw new Error(`The record does not exist`);
        }
        return recordString;
    }
    // UpdateRecord updates an existing record in the world state with provided parameters.
    async UpdateXFarmRecord(ctx, data) {
        let record = JSON.parse(data);
        let xfarmId = record.Key;
        delete record.Key;
        ctx.stub.putState(xfarmId, Buffer.from(JSON.stringify(record)));
        return "Data successfully updated";
    }
    // DeleteRecord deletes an given xfarm record from the world state.
    async DeleteXFarmRecord(ctx, data) {
        let deleteData = JSON.parse(data);
        let deleteKey = deleteData.Key;
        ctx.stub.deleteState(deleteKey);
        return "record successfully deleted";
    }
    // RecordExists returns true when xfarm record with given ID exists in world state.
    async RecordExists(ctx, id) {
        const recordJson = await ctx.stub.getState(id);
        return recordJson && recordJson.length > 0;
    }
    // GetAllRecords returns all records found in the world state.
    async GetAllXFarmRecords(ctx, data) {
        var _a, _b;
        const allResults = [];
        let insertData = JSON.parse(data);
        console.log(insertData.id);
        //if keys are not provided , then it will automatically fetch all records.
        let startKey = (_a = insertData.startKey) !== null && _a !== void 0 ? _a : '';
        let endKey = (_b = insertData.endKey) !== null && _b !== void 0 ? _b : '';
        // range query with empty string for startKey and endKey does an open-ended query of all records in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            }
            catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
    // get all records with particular doc_type
    async GetRecordsByDocType(ctx, docType) {
        const allResults = [];
        var stringQuery = "{\"selector\":{\"docType\":\"" + docType + "\"}}";
        let iterator = await ctx.stub.getQueryResult(stringQuery);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            }
            catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({ Key: result.value.key, Record: record });
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }
    // get all records with particular doc_type
    async GetRecordByQuery(ctx, query) {
        //  const allResults = [];
        //  var stringQuery="{\"selector\":{\"doc_type\":\"" + docType + "\"}}"
        try {
            const allResults = [];
            let iterator = await ctx.stub.getQueryResult(query);
            let result = await iterator.next();
            while (!result.done) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
                let record;
                try {
                    record = JSON.parse(strValue);
                }
                catch (err) {
                    console.log(err);
                    record = strValue;
                }
                allResults.push({ Key: result.value.key, Record: record });
                result = await iterator.next();
            }
            let resultString = allResults[0];
            // return JSON.stringify(allResults[0]);
            return resultString;
        }
        catch (err) {
            console.log(err);
            return err;
        }
    }
    // get history by key
    async GetRecordsHistory(ctx, query) {
        console.log("i am in get history fx in cc");
        const historyResults = [];
        let queryString = query;
        let key = await this.GetKeyByQuery(ctx, queryString);
        console.log("key is :", key);
        const iterator = await ctx.stub.getHistoryForKey(key);
        let result = await iterator.next();
        ///
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            }
            catch (err) {
                console.log(err);
                record = strValue;
            }
            historyResults.push({ Key: key, Record: record, Timestamp: result.value.timestamp });
            result = await iterator.next();
        }
        return JSON.stringify(historyResults);
    }
    // get all records with particular doc_type
    async GetKeyByQuery(ctx, query) {
        try {
            console.log("in getkeybyquery fx");
            let iterator = await ctx.stub.getQueryResult(query);
            let result = await iterator.next();
            let key = result.value.key;
            let keyString = key;
            console.log("keyString :", keyString);
            return keyString;
        }
        catch (err) {
            console.log(err);
            return err;
        }
    }
};
__decorate([
    fabric_contract_api_1.Transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "CreateXFarmRecord", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "ReadXFarmRecord", null);
__decorate([
    fabric_contract_api_1.Transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "UpdateXFarmRecord", null);
__decorate([
    fabric_contract_api_1.Transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "DeleteXFarmRecord", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    fabric_contract_api_1.Returns('boolean'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "RecordExists", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    fabric_contract_api_1.Returns('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "GetAllXFarmRecords", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    fabric_contract_api_1.Returns('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "GetRecordsByDocType", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    fabric_contract_api_1.Returns('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "GetRecordByQuery", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    fabric_contract_api_1.Returns('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "GetRecordsHistory", null);
__decorate([
    fabric_contract_api_1.Transaction(false),
    fabric_contract_api_1.Returns('string'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "GetKeyByQuery", null);
ChaincodeXFarmContract = __decorate([
    fabric_contract_api_1.Info({ title: 'ChaincodeXFarm', description: 'Smart contract XFarm' })
], ChaincodeXFarmContract);
exports.ChaincodeXFarmContract = ChaincodeXFarmContract;
//# sourceMappingURL=chaincodeXFarm.js.map