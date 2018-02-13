import * as sip from "sip";
import * as _sdp_ from "sip/sdp";
import * as types from "./types";

export const parseSdp: (rawSdp: string) => any = _sdp_.parse;

export const stringifySdp: (sdp: any) => string = _sdp_.stringify;

export const makeStreamParser: (
    handler: (sipPacket: types.Packet) => void,
    onFlood: () => void,
    maxBytesHeaders: number,
    maxContentLength: number
) => ((dataAsBinaryString: string) => void) = sip.makeStreamParser;

export const stringify: (sipPacket: types.Packet) => string = sip.stringify;

export const parseUri: (uri: string) => types.ParsedUri = sip.parseUri;

export const generateBranch: () => string = sip.generateBranch;

export const stringifyUri: (parsedUri: types.ParsedUri) => string = sip.stringifyUri;

export const parse: (rawSipPacket: string) => types.Packet = sip.parse;