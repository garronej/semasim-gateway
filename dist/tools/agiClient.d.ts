import { AGIChannel as _AGIChannel_ } from "ts-async-agi";
import { Ami } from "chan-dongle-extended-client";
export declare type AGIChannel = _AGIChannel_;
export declare type Scripts = {
    [context: string]: {
        [extensionPattern: string]: (channel: AGIChannel) => Promise<void>;
    };
};
export declare function startServer(scripts: Scripts, ami?: Ami): Promise<void>;
export declare function dialAndGetOutboundChannel(channel: AGIChannel, dialString: string, outboundHandler: (channel: AGIChannel) => Promise<void>): Promise<boolean>;
