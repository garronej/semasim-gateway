import * as cryptoLib from "crypto-lib/dist/sync/types";
import { BundledData } from "../types";
export declare function smuggleBundledDataInHeaders<T extends BundledData>(data: T, encryptor: cryptoLib.Encryptor, headers?: Record<string, string>): Promise<Record<string, string>>;
export declare function smuggleBundledDataInHeaders<T extends BundledData>(data: T, encryptor: cryptoLib.Sync<cryptoLib.Encryptor>, headers?: Record<string, string>): Record<string, string>;
export declare type BundledDataSipHeaders = string[] & {
    _bundledDataSipHeaderBrand: any;
};
export declare namespace BundledDataSipHeaders {
    function build(getHeaderValue: (headerName: string) => string | null): BundledDataSipHeaders;
}
/** Throws if there is not bundled data in the headers */
export declare function extractBundledDataFromHeaders<T extends BundledData>(headers: Record<string, string>, decryptor: cryptoLib.Decryptor): Promise<T>;
export declare function extractBundledDataFromHeaders<T extends BundledData>(headers: BundledDataSipHeaders, decryptor: cryptoLib.Sync<cryptoLib.Decryptor>): T;
