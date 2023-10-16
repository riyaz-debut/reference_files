/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import {ChaincodeXFarm} from './chaincodeObjects';
import * as CryptoTS from "crypto-ts";
import { AES } from 'crypto-ts';
@Info({title: 'ChaincodeXFarm', description: 'Smart contract XFarm'})
export class ChaincodeXFarmContract extends Contract {



    // CreateRecord issues a new record to the world state with given details.
    @Transaction()
    public async CreateXFarmRecord(ctx: Context, data: string): Promise<string> {
        console.log("i am in create fx")
        let insertData=JSON.parse(data)
        console.log("inserted data :", insertData)
        
        let xfarmId=insertData.xfarm_id

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
        console.log("ciphext data :",ciphertext)
        
        // Decrypt
        var bytes  = CryptoTS.AES.decrypt(ciphertext.toString(), 'secret key 123');
        console.log("bytes data :", bytes)
        var decryptedData = JSON.parse(bytes.toString(CryptoTS.enc.Utf8));
        
        console.log("decrypted data",decryptedData);

        let finalData=JSON.parse(decryptedData)
        console.log("final data",  finalData)
        await ctx.stub.putState(xfarmId,Buffer.from(JSON.stringify(finalData)));
        return "Data successfully added"

    }
}
