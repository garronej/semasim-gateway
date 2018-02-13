import * as types from "./types";
export declare const parseSdp: (rawSdp: string) => any;
export declare const stringifySdp: (sdp: any) => string;
export declare const makeStreamParser: (handler: (sipPacket: types.Packet) => void, onFlood: () => void, maxBytesHeaders: number, maxContentLength: number) => ((dataAsBinaryString: string) => void);
export declare const stringify: (sipPacket: types.Packet) => string;
export declare const parseUri: (uri: string) => types.ParsedUri;
export declare const generateBranch: () => string;
export declare const stringifyUri: (parsedUri: types.ParsedUri) => string;
export declare const parse: (rawSipPacket: string) => types.Packet;
