export declare type Contact = {
    uri: string;
    path: string;
    connectionId: string;
    uaSim: UaSim;
};
export declare type UaSim = {
    ua: Ua;
    imsi: string;
};
export declare type Ua = {
    instance: string;
    userEmail: string;
    towardUserEncryptKeyStr: string;
    platform: Ua.Platform;
    pushToken: string;
    messagesEnabled: boolean;
};
export declare namespace Ua {
    type Platform = "android" | "iOS" | "web";
}
export declare type MessageTowardGsm = {
    date: Date;
    uaSim: UaSim;
    toNumber: string;
    text: string;
    appendPromotionalMessage: boolean;
};
export declare type MessageTowardSip = {
    isFromDongle: boolean;
    bundledData: BundledData.ServerToClient;
    date: Date;
    fromNumber: string;
};
export declare type BundledData = BundledData.ClientToServer | BundledData.ServerToClient;
export declare namespace BundledData {
    type ClientToServer = ClientToServer.Message;
    namespace ClientToServer {
        type Message = {
            type: "MESSAGE";
            text: string;
            exactSendDate: Date;
            appendPromotionalMessage: boolean;
        };
    }
    type ServerToClient = ServerToClient.Message | ServerToClient.MmsNotification | ServerToClient.SendReport | ServerToClient.StatusReport | ServerToClient.MissedCall | ServerToClient.CallAnsweredBy | ServerToClient.Ringback;
    namespace ServerToClient {
        type _Base = {
            text: string;
        };
        type Message = _Base & {
            type: "MESSAGE";
            pduDate: Date;
        };
        type MmsNotification = _Base & {
            type: "MMS NOTIFICATION";
            pduDate: Date;
            wapPushMessage: string;
        };
        type SendReport = _Base & {
            type: "SEND REPORT";
            messageTowardGsm: MessageTowardGsm;
            sendDate: Date | null;
        };
        type StatusReport = _Base & {
            type: "STATUS REPORT";
            messageTowardGsm: MessageTowardGsm;
            statusReport: {
                sendDate: Date;
                dischargeDate: Date;
                isDelivered: boolean;
                status: string;
                recipient: string;
            };
        };
        type MissedCall = _Base & {
            type: "MISSED CALL";
            date: Date;
        };
        type CallAnsweredBy = _Base & {
            type: "CALL ANSWERED BY";
            date: Date;
            ua: Ua;
        };
        type Ringback = _Base & {
            type: "RINGBACK";
            callId: string;
        };
    }
}
