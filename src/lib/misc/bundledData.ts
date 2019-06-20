/* NOTE: Used in the browser. */

import * as cryptoLib from "crypto-lib";
import { urlSafeB64 } from "./urlSafeBase64encoderDecoder";
//NOTE: Transpiled to ES3.
import * as stringTransform from "transfer-tools/dist/lib/stringTransform";

//Should be only types def. striped.
import * as types from "../types";


const header = (i: number) => `Bundled-Data-${i}`;

export async function smuggleBundledDataInHeaders<T extends types.BundledData>(
    data: T,
    encryptor: cryptoLib.Encryptor,
    headers: Record<string, string> = {},
): Promise<Record<string, string>> {

    const split = stringTransform.textSplit(
        125,
        urlSafeB64.enc(
            await cryptoLib.stringifyThenEncryptFactory(encryptor)<types.BundledData>(
                data
            )
        )
    );

    for (let i = 0; i < split.length; i++) {

        headers[header(i)] = split[i];

    }

    return headers;

}

/** assert there is data */
export async function extractBundledDataFromHeaders<T extends types.BundledData>(
    headers: Record<string, string>,
    decryptor: cryptoLib.Decryptor
): Promise<T> {

    const split: string[] = [];

    let i = 0;

    while (true) {

        const key = header(i++);

        const part = headers[key] || headers[key.toLowerCase()];

        if (!!part) {
            split.push(part);
        } else {
            break;
        }

    }

    if (!split.length) {
        throw new Error("No bundled data in header");
    }

    return await cryptoLib.decryptThenParseFactory(decryptor)<T>(
        urlSafeB64.dec(
            split.join("")
        )
    );

}
