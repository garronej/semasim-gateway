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
export declare type UaRef = {
    instance: string;
    userEmail: string;
};
export declare type Ua = UaRef & {
    towardUserEncryptKeyStr: string;
    platform: Ua.Platform;
    pushToken: string;
};
export declare namespace Ua {
    type Platform = "android" | "iOS" | "web";
}
export declare type MessageTowardGsm = {
    dateTime: number;
    uaSim: UaSim;
    toNumber: string;
    textB64: string;
    appendPromotionalMessage: boolean;
};
export declare type MessageTowardSip = {
    isFromDongle: boolean;
    bundledData: BundledData.ServerToClient;
    dateTime: number;
    fromNumber: string;
};
export declare type BundledData = BundledData.ClientToServer | BundledData.ServerToClient;
export declare namespace BundledData {
    type _Base = {
        textB64: string;
    };
    type ClientToServer = ClientToServer.Message | ClientToServer.ConversationCheckedOut;
    namespace ClientToServer {
        type Message = _Base & {
            type: "MESSAGE";
            exactSendDateTime: number;
            appendPromotionalMessage: boolean;
        };
        type ConversationCheckedOut = _Base & {
            type: "CONVERSATION CHECKED OUT";
            checkedOutAtTime: number;
        };
    }
    type ServerToClient = ServerToClient.Message | ServerToClient.MmsNotification | ServerToClient.SendReport | ServerToClient.StatusReport | ServerToClient.MissedCall | ServerToClient.FromSipCallSummary | ServerToClient.CallAnsweredBy | ServerToClient.Ringback | ServerToClient.ConversationCheckedOutFromOtherUa;
    namespace ServerToClient {
        type Message = _Base & {
            type: "MESSAGE";
            pduDateTime: number;
        };
        type MmsNotification = _Base & {
            type: "MMS NOTIFICATION";
            pduDateTime: number;
            wapPushMessageB64: string;
        };
        type SendReport = _Base & {
            type: "SEND REPORT";
            messageTowardGsm: MessageTowardGsm;
            sendDateTime: number | null;
        };
        type StatusReport = _Base & {
            type: "STATUS REPORT";
            messageTowardGsm: MessageTowardGsm;
            statusReport: {
                sendDateTime: number;
                dischargeDateTime: number;
                isDelivered: boolean;
                status: string;
                recipient: string;
            };
        };
        type MissedCall = _Base & {
            type: "MISSED CALL";
            dateTime: number;
        };
        type FromSipCallSummary = _Base & {
            type: "FROM SIP CALL SUMMARY";
            callPlacedAtDateTime: number;
            callRingingAfterMs: number | undefined;
            callAnsweredAfterMs: number | undefined;
            callTerminatedAfterMs: number;
            ua: Ua;
        };
        type CallAnsweredBy = _Base & {
            type: "CALL ANSWERED BY";
            dateTime: number;
            ua: Ua;
        };
        type Ringback = _Base & {
            type: "RINGBACK";
            callId: string;
        };
        type ConversationCheckedOutFromOtherUa = _Base & {
            type: "CONVERSATION CHECKED OUT FROM OTHER UA";
            checkedOutAtTime: number;
        };
    }
}
