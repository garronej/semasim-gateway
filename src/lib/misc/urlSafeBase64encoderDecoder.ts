
//NOTE: Transpiled to ES3.
import * as stringTransform from "transfer-tools/dist/lib/stringTransform";

export const urlSafeB64 = stringTransform.transcode(
    "base64", 
    { 
        "=": "_", 
        "/": "-" 
    }
);