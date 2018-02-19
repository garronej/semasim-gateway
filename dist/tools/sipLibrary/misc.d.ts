/// <reference types="node" />
import * as types from "./types";
export declare function matchRequest(sipPacket: types.Packet): sipPacket is types.Request;
/** Safely set text based content (encoded in utf8 ) */
export declare function setPacketContent(sipPacket: types.Packet, str: string): void;
/** Get the RAW content as buffer */
export declare function getPacketContent(sipPacket: types.Packet): Buffer;
export declare function readSrflxAddrInSdp(sdp: string): string | undefined;
export declare function isPlainMessageRequest(sipRequest: types.Request): boolean;
export declare function parsePath(path: string): types.AoRWithParsedUri[];
export declare function stringifyPath(parsedPath: types.AoRWithParsedUri[]): string;
export declare function parseOptionTags(headerFieldValue: string | undefined): string[];
export declare function hasOptionTag(headers: types.Headers, headerField: string, optionTag: string): boolean;
export declare function addOptionTag(headers: types.Headers, headerField: string, optionTag: string): void;
export declare function filterSdpCandidates(keep: {
    host: boolean;
    srflx: boolean;
    relay: boolean;
}, sdp: string): string;
