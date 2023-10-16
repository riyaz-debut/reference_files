import { Context, Contract } from 'fabric-contract-api';
export declare class ChaincodeXFarmContract extends Contract {
    CreateXFarmRecord(ctx: Context, data: string): Promise<string>;
}
