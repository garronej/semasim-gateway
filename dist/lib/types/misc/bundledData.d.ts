import * as types from "../types";
export declare function smuggleBundledDataInHeaders(data: types.BundledData, headers?: Record<string, string>): Record<string, string>;
/** assert there is data */
export declare function extractBundledDataFromHeaders(headers: Record<string, string>): types.BundledData;
