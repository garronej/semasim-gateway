
export type Contact = {
    uri: string;
    path: string;
    connectionId: string;
    uaSim: UaSim;
};

export type UaSim = {
    ua: Ua;
    imsi: string;
};


export type Ua = {
    instance: string;
    userEmail: string;
    towardUserEncryptKeyStr: string;
    platform: Ua.Platform;
    pushToken: string;
    messagesEnabled: boolean;
};

export namespace Ua {

    export type Platform = "android" | "iOS" | "web";

}

export type MessageTowardGsm = {
    dateTime: number;
    uaSim: UaSim;
    toNumber: string;
    textB64: string;
    appendPromotionalMessage: boolean;
};

export type MessageTowardSip = {
    isFromDongle: boolean;
    bundledData: BundledData.ServerToClient;
    dateTime: number;
    fromNumber: string;
};


export type BundledData =
    BundledData.ClientToServer |
    BundledData.ServerToClient
    ;

export namespace BundledData {

    export type _Base = {
        textB64: string;
    };

    export type ClientToServer =
        ClientToServer.Message
        ;

    export namespace ClientToServer {

        export type Message = _Base & {
            type: "MESSAGE";
            exactSendDateTime: number;
            appendPromotionalMessage: boolean;
        };

    }

    export type ServerToClient =
        ServerToClient.Message |
        ServerToClient.MmsNotification |
        ServerToClient.SendReport |
        ServerToClient.StatusReport |
        ServerToClient.MissedCall |
        ServerToClient.CallAnsweredBy |
        ServerToClient.Ringback
        ;

    export namespace ServerToClient {

        export type Message = _Base & {
            type: "MESSAGE";
            pduDateTime: number;
        };

        export type MmsNotification = _Base & {
            type: "MMS NOTIFICATION";
            pduDateTime: number;
            wapPushMessageB64: string;
        };

        export type SendReport = _Base & {
            type: "SEND REPORT";
            messageTowardGsm: MessageTowardGsm;
            sendDateTime: number | null;
        };

        export type StatusReport = _Base & {
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

        export type MissedCall = _Base & {
            type: "MISSED CALL";
            dateTime: number;
        };

        export type CallAnsweredBy = _Base & {
            type: "CALL ANSWERED BY";
            dateTime: number;
            ua: Ua
        };

        export type Ringback = _Base & {
            type: "RINGBACK";
            callId: string;
        };

    }

}
