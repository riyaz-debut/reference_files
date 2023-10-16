import { Context, Contract } from 'fabric-contract-api';
export declare class ChaincodeXFarmContract extends Contract {
    CreateXFarmRecord(ctx: Context, data: string): Promise<string>;
    ReadXFarmRecord(ctx: Context, query: string): Promise<string>;
    UpdateXFarmRecord(ctx: Context, data: string): Promise<string>;
    DeleteXFarmRecord(ctx: Context, data: string): Promise<string>;
    RecordExists(ctx: Context, id: string): Promise<boolean>;
    GetAllXFarmRecords(ctx: Context, data: string): Promise<string>;
    GetRecordsByDocType(ctx: Context, docType: string): Promise<string>;
    GetRecordByQuery(ctx: Context, query: string): Promise<string>;
    GetRecordsHistory(ctx: Context, query: string): Promise<string>;
    GetKeyByQuery(ctx: Context, query: string): Promise<string>;
}
