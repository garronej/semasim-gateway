
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


export type UaRef= {
    instance: string;
    userEmail: string;
};

export type Ua = UaRef & {
    towardUserEncryptKeyStr: string;
    platform: Ua.Platform;
    pushToken: string;
};

export namespace Ua {

    export type Platform = "android" | "ios" | "web";

}

export type MessageTowardGsm = {
    dateTime: number;
    uaSim: UaSim;
    toNumber: string;
    text: string;
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
        text: string;
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
        ServerToClient.FromSipCallSummary |
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
            wapPushMessage: string;
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

        export type FromSipCallSummary = _Base & {
            type: "FROM SIP CALL SUMMARY";
            callPlacedAtDateTime: number;
            callRingingAfterMs: number | undefined; //NOTE: ms since placed date
            callAnsweredAfterMs: number | undefined; //NOTE: ms since placed date
            callTerminatedAfterMs: number; //NOTE: ms since placed date.
            ua: Ua
        };

        /*
        export type FromDongleCallSummary = _Base & {
            type: "FROM DONGLE CALL SUMMARY";
            callReceivedAtDateTime: number;
            callTerminatedAfterMs: number; //NOTE: ms since call received.
            pickedUp: {
                callPickedUpAfterMs: number;
                ua: Ua;
            } | undefined;
        };
        */

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
