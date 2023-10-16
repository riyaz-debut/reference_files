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
const CryptoTS = require("crypto-ts");
let ChaincodeXFarmContract = class ChaincodeXFarmContract extends fabric_contract_api_1.Contract {
    // CreateRecord issues a new record to the world state with given details.
    async CreateXFarmRecord(ctx, data) {
        console.log("i am in create fx");
        let insertData = JSON.parse(data);
        console.log("inserted data :", insertData);
        let xfarmId = insertData.xfarm_id;
        delete insertData.xfarm_id;
        // const ciphertext = AES.encrypt(insertData.signature, 'secretkey').toString();
        // delete insertData.signature
        // insertData.signatureHash = ciphertext
        // // Decrypt
        // var bytes  = AES.decrypt(ciphertext.toString(), 'secretkey');
        // // var plaintext = bytes.toString(CryptoTS.enc.Utf8);
        // // console.log(plaintext);
        // console.log("bytes data :", bytes)
        // await ctx.stub.putState(uniqueId,Buffer.from(JSON.stringify(insertData)));
        // return "Data successfully added"
        // Encrypt
        var ciphertext = CryptoTS.AES.encrypt(JSON.stringify(data), 'secret key 123');
        console.log("ciphext data :", ciphertext);
        // Decrypt
        var bytes = CryptoTS.AES.decrypt(ciphertext.toString(), 'secret key 123');
        console.log("bytes data :", bytes);
        var decryptedData = JSON.parse(bytes.toString(CryptoTS.enc.Utf8));
        console.log("decrypted data", decryptedData);
        let finalData = JSON.parse(decryptedData);
        console.log("final data", finalData);
        await ctx.stub.putState(xfarmId, Buffer.from(JSON.stringify(finalData)));
        return "Data successfully added";
    }
};
__decorate([
    fabric_contract_api_1.Transaction(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [fabric_contract_api_1.Context, String]),
    __metadata("design:returntype", Promise)
], ChaincodeXFarmContract.prototype, "CreateXFarmRecord", null);
ChaincodeXFarmContract = __decorate([
    fabric_contract_api_1.Info({ title: 'ChaincodeXFarm', description: 'Smart contract XFarm' })
], ChaincodeXFarmContract);
exports.ChaincodeXFarmContract = ChaincodeXFarmContract;
//# sourceMappingURL=chaincodeXFarm.js.map