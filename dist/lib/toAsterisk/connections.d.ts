import * as sip from "ts-sip";
/** Assert we have an active backend connection */
export declare function connect(connectionId: string, imsi: string): sip.Socket;
export declare function get(connectionId: string, imsi: string): sip.Socket | undefined;
export declare function isExpiredRegistration(connectionId: string, imsi: string): boolean;
