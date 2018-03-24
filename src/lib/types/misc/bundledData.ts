import * as ttJC from "transfer-tools/dist/lib/JSON_CUSTOM";
import * as stringTransform from "transfer-tools/dist/lib/stringTransform";
import * as types from "../types";

const JSON_CUSTOM= ttJC.get();
export const urlSafeB64= stringTransform.transcode("base64", { "=": "_" });
const header = (i: number) => `Bundled-Data-${i}`;

export function smuggleBundledDataInHeaders(
    data: types.BundledData,
    headers: Record<string, string>= {}
): Record<string, string> {

    let split = stringTransform.textSplit(
        125,
        urlSafeB64.enc( 
            JSON_CUSTOM.stringify(data)
        )
    );

    for (let i = 0; i < split.length; i++) {

        headers[header(i)]= split[i];

    }

    return headers;

}

/** assert there is data */
export function extractBundledDataFromHeaders( 
    headers: Record<string, string>
): types.BundledData {

    let split: string[]= [];

    let i=0;

    while(true){

        let key= header(i++);

        let part= headers[key] || headers[key.toLowerCase()];

        if( part ){
            split.push(part);
        }else{
            break;
        }

    }

    if( !split.length ){
        throw new Error("No bundled data in header");
    }

    return JSON_CUSTOM.parse(
        urlSafeB64.dec(
            split.join("")
        )
    );

}
