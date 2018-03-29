
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
    platform: Ua.Platform;
    pushToken: string;
    software: string;
};

export namespace Ua {

    export type Platform = "android" | "iOS" | "web";

}

export type MessageTowardGsm = {
    date: Date;
    uaSim: UaSim;
    toNumber: string;
    text: string;
};

export type MessageTowardSip = {
    isFromDongle: boolean;
    bundledData: BundledData;
    date: Date;
    fromNumber: string;
    text: string;
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
            exactSendDate: Date;
        }

    }

    export type ServerToClient =
        ServerToClient.Message |
        ServerToClient.SendReport |
        ServerToClient.StatusReport |
        ServerToClient.MissedCall |
        ServerToClient.CallAnsweredBy |
        ServerToClient.Ringback
        ;

    export namespace ServerToClient {

        export type Message = {
            type: "MESSAGE";
            pduDate: Date;
        };

        export type SendReport = {
            type: "SEND REPORT";
            messageTowardGsm: MessageTowardGsm;
            sendDate: Date | null;
        };

        export type StatusReport = {
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

        export type MissedCall = {
            type: "MISSED CALL";
            date: Date;
        };

        export type CallAnsweredBy = {
            type: "CALL ANSWERED BY";
            date: Date;
            ua: Ua
        };

        export type Ringback = {
            type: "RINGBACK";
            callId: string;
        };

    }

}
