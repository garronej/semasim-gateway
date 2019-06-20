
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
    date: Date;
    uaSim: UaSim;
    toNumber: string;
    text: string;
    appendPromotionalMessage: boolean;
};

export type MessageTowardSip = {
    isFromDongle: boolean;
    bundledData: BundledData.ServerToClient;
    date: Date;
    fromNumber: string;
};


export type BundledData =
    BundledData.ClientToServer |
    BundledData.ServerToClient
    ;

export namespace BundledData {

    export type ClientToServer =
        ClientToServer.Message
        ;

    export namespace ClientToServer {

        export type Message = {
            type: "MESSAGE";
            text: string;
            exactSendDate: Date;
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

        export type _Base = {
            text: string;
        };

        export type Message = _Base & {
            type: "MESSAGE";
            pduDate: Date;
        };

        export type MmsNotification = _Base & {
            type: "MMS NOTIFICATION";
            pduDate: Date;
            wapPushMessage: string;
        };

        export type SendReport = _Base & {
            type: "SEND REPORT";
            messageTowardGsm: MessageTowardGsm;
            sendDate: Date | null;
        };

        export type StatusReport = _Base & {
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

        export type MissedCall = _Base & {
            type: "MISSED CALL";
            date: Date;
        };

        export type CallAnsweredBy = _Base & {
            type: "CALL ANSWERED BY";
            date: Date;
            ua: Ua
        };

        export type Ringback = _Base & {
            type: "RINGBACK";
            callId: string;
        };

    }

}
