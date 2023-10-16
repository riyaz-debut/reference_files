/*
 * SPDX-License-Identifier: Apache-2.0
 */

import {Context, Contract, Info, Returns, Transaction} from 'fabric-contract-api';
import {ChaincodeXFarm} from './chaincodeObjects';

@Info({title: 'ChaincodeXFarm', description: 'Smart contract XFarm'})
export class ChaincodeXFarmContract extends Contract {



    // CreateRecord issues a new record to the world state with given details.
    @Transaction()
    public async CreateXFarmRecord(ctx: Context, data: string): Promise<string> {
        let insertData=JSON.parse(data)
        console.log(" here txnid ",insertData.xfarm_id)
        //id to make key
        let xfarmId=insertData.xfarm_id

    
        delete insertData.xfarm_id;
       
        await ctx.stub.putState(xfarmId,Buffer.from(JSON.stringify(insertData)));
        return "Data successfully added"
    }

    // ReadRecord returns the record stored in the world state with given id.
    @Transaction(false)
    public async ReadXFarmRecord(ctx: Context, query: string): Promise<string> {

    
        let queryString = query

        let recordString = await this.GetRecordByQuery(ctx,queryString) // get the record from world state
        if (!recordString || recordString.length === 0) {
            throw new Error(`The record does not exist`);
        }
        return recordString
    }

    // UpdateRecord updates an existing record in the world state with provided parameters.
    @Transaction()
    public async UpdateXFarmRecord(ctx: Context, data:string): Promise<string> {
  
        let record=JSON.parse(data)
        console.log("record in update fx :", record)
    
        let query = record.queryString
        let recordString = await this.ReadXFarmRecord(ctx,query)
        let existingData = JSON.parse(recordString)
        return existingData
        // console.log("existing record :", existingData)

        // let xfarmId=record.Key

        // delete record.Key

        // if ( record.order_Status == null || record.order_Status == undefined || !record.order_Status ) {
        //     console.log("in 1st if condition")
            
        //     let updatedData = {
        //         ...record,
        //         ...existingData,
        //     };
        //     ctx.stub.putState(xfarmId, Buffer.from(JSON.stringify(updatedData)));
        //     return "Data successfully updated"
        // } else if ( record.order_Status != existingData.order_Status ) {
        //     console.log("in 1st if condition")
            
        //     delete existingData.order_Status;

        //     let updatedData = {
        //         ...record,
        //         ...existingData,
        //     };
        //     ctx.stub.putState(xfarmId, Buffer.from(JSON.stringify(updatedData)));
        //     return "Data successfully updated"
        // } else {
        //     throw new Error(`The record does not exist`);
        // }
    }

    // DeleteRecord deletes an given xfarm record from the world state.
    @Transaction()
    public async DeleteXFarmRecord(ctx: Context, data: string): Promise<string> {

        let deleteData=JSON.parse(data)
        let deleteKey=deleteData.Key
        ctx.stub.deleteState(deleteKey);
        return "record successfully deleted"
    }

    // RecordExists returns true when xfarm record with given ID exists in world state.
    @Transaction(false)
    @Returns('boolean')
    public async RecordExists(ctx: Context, id: string): Promise<boolean> {
        const recordJson = await ctx.stub.getState(id);
        return recordJson && recordJson.length > 0;
    }

  

    // GetAllRecords returns all records found in the world state.
    @Transaction(false)
    @Returns('string')
    public async GetAllXFarmRecords(ctx: Context,data: string): Promise<string> {
        const allResults = [];

        let insertData=JSON.parse(data)
        console.log(insertData.id)
        //if keys are not provided , then it will automatically fetch all records.
        let startKey=insertData.startKey ?? ''
        let endKey=insertData.endKey ?? ''

        // range query with empty string for startKey and endKey does an open-ended query of all records in the chaincode namespace.
        const iterator = await ctx.stub.getStateByRange(startKey, endKey);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({Key: result.value.key, Record: record});
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }


    // get all records with particular doc_type
   @Transaction(false)
   @Returns('string')
   public async GetRecordsByDocType(ctx: Context,docType: string): Promise<string> {
        const allResults = [];
        var stringQuery="{\"selector\":{\"docType\":\"" + docType + "\"}}"
        let iterator = await ctx.stub.getQueryResult(stringQuery);
        let result = await iterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            allResults.push({Key: result.value.key, Record: record});
            result = await iterator.next();
        }
        return JSON.stringify(allResults);
    }




    // get all records with particular doc_type
    @Transaction(false)
    @Returns('string')
    public async GetRecordByQuery(ctx: Context,query: string): Promise<string> {
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
                } catch (err) {
                    console.log(err);
                    record = strValue;
                }
                allResults.push({Key: result.value.key, Record: record});
                result = await iterator.next();
            }
            let resultString:string=allResults[0]
            // return JSON.stringify(allResults[0]);
            return resultString
     
        } catch (err) {
            console.log(err);
            return err

        }

    }

    // get history by key
    @Transaction(false)
    @Returns('string')
    public async GetRecordsHistory(ctx: Context, query: string): Promise<string> 
    {
        console.log("i am in get history fx in cc")
        const historyResults = [];
        let queryString = query

        let key = await this.GetKeyByQuery(ctx,queryString)
        console.log("key is :", key)
        const iterator = await ctx.stub.getHistoryForKey(key);
        let result = await iterator.next();
        
        ///
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record;
            try {
                record = JSON.parse(strValue);
            } catch (err) {
                console.log(err);
                record = strValue;
            }
            historyResults.push({Key: key, Record: record, Timestamp: result.value.timestamp});
            result = await iterator.next();
        }
        return JSON.stringify(historyResults);
    }

     // get all records with particular doc_type
     @Transaction(false)
     @Returns('string')
     public async GetKeyByQuery(ctx: Context,query: string): Promise<string> {
         try {
             console.log("in getkeybyquery fx")
             let iterator = await ctx.stub.getQueryResult(query);
             let result = await iterator.next();
             let key = result.value.key
           
             let keyString:string=key
             console.log("keyString :", keyString)
             return keyString
      
         } catch (err) {
             console.log(err);
             return err
 
         }
 
     }
 
 }
