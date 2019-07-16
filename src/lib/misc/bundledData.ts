/* NOTE: Used in the browser. */

import * as cryptoLib from "crypto-lib/dist/sync/types";
import { stringifyThenEncryptFactory, decryptThenParseFactory } from "crypto-lib/dist/async/serializer";
import { urlSafeB64 } from "./urlSafeBase64encoderDecoder";
//NOTE: Transpiled to ES3.
import * as stringTransform from "transfer-tools/dist/lib/stringTransform";

//Should be only types def. striped.
import { BundledData } from "../types";

//NOTE: Exported for semasim-mobile
const getIndexedHeaderName = (i: number) => `Bundled-Data-${i}`;

export function smuggleBundledDataInHeaders<T extends BundledData>(
    data: T,
    encryptor: cryptoLib.Encryptor,
    headers?: Record<string, string>,
): Promise<Record<string, string>>;
export function smuggleBundledDataInHeaders<T extends BundledData>(
    data: T,
    encryptor: cryptoLib.Sync<cryptoLib.Encryptor>,
    headers?: Record<string, string>,
): Record<string, string>;
export function smuggleBundledDataInHeaders<
    T extends BundledData,
    U extends cryptoLib.Encryptor | cryptoLib.Sync<cryptoLib.Encryptor>
>(
    data: T,
    encryptor: U,
    headers: Record<string, string> = {},
): U extends cryptoLib.Encryptor ? Promise<Record<string, string>> : Record<string, string> {

    const followUp = (value: string) => {

        const split = stringTransform.textSplit(
            125,
            urlSafeB64.enc(value)
        );

        for (let i = 0; i < split.length; i++) {

            headers[getIndexedHeaderName(i)] = split[i];

        }

        return headers;

    };

    const prValueOrValue: Promise<string> | string =
        stringifyThenEncryptFactory(encryptor)<BundledData>(data);

    return (
        typeof prValueOrValue === "string" ?
            followUp(prValueOrValue) :
            prValueOrValue.then(value => followUp(value))
    ) as any;

}


export type BundledDataSipHeaders = string[] & {
    _bundledDataSipHeaderBrand: any;
};

export namespace BundledDataSipHeaders {

    export function build(
        getHeaderValue: (headerName: string) => string | null
    ): BundledDataSipHeaders {

        const headersValues: string[] = [];

        let i = 0;

        while (true) {

            const headerName = getIndexedHeaderName(i++);

            const headerValue = getHeaderValue(headerName) ||
                getHeaderValue(headerName.toLocaleLowerCase());

            if (!headerValue) {
                break;
            }

            headersValues.push(headerValue);

        }

        return headersValues as BundledDataSipHeaders;

    }

}

/** Throws if there is not bundled data in the headers */
export function extractBundledDataFromHeaders<T extends BundledData>(
    headers: Record<string, string>,
    decryptor: cryptoLib.Decryptor
): Promise<T>;
export function extractBundledDataFromHeaders<T extends BundledData>(
    headers: BundledDataSipHeaders,
    decryptor: cryptoLib.Sync<cryptoLib.Decryptor>
): T;
export function extractBundledDataFromHeaders<
    T extends BundledData,
    U extends cryptoLib.Decryptor | cryptoLib.Sync<cryptoLib.Decryptor>
>(
    headers: Record<string, string> | BundledDataSipHeaders,
    decryptor: U
): U extends cryptoLib.Encryptor ? Promise<T> : T {

    const split = headers instanceof Array ?
        headers :
        BundledDataSipHeaders.build(headerName => headers[headerName] || null)
        ;

    if (!split.length) {
        throw new Error("No bundled data in header");
    }

    return decryptThenParseFactory(decryptor)<T>(
        urlSafeB64.dec(
            split.join("")
        )
    ) as any;

}
