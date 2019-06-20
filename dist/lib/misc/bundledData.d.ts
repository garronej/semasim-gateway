import * as cryptoLib from "crypto-lib";
import * as types from "../types";
export declare function smuggleBundledDataInHeaders<T extends types.BundledData>(data: T, encryptor: cryptoLib.Encryptor, headers?: Record<string, string>): Promise<Record<string, string>>;
/** assert there is data */
export declare function extractBundledDataFromHeaders<T extends types.BundledData>(headers: Record<string, string>, decryptor: cryptoLib.Decryptor): Promise<T>;
