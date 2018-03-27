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
    platform: Ua.Platform;
    pushToken: string;
    software: string;
};
export declare namespace Ua {
    type Platform = "android" | "iOS" | "web";
}
export declare type MessageTowardGsm = {
    date: Date;
    uaSim: UaSim;
    toNumber: string;
    text: string;
};
export declare type MessageTowardSip = {
    isFromDongle: boolean;
    bundledData: BundledData;
    date: Date;
    fromNumber: string;
    text: string;
};
export declare type BundledData = BundledData.ClientToServer | BundledData.ServerToClient;
export declare namespace BundledData {
    type ClientToServer = ClientToServer.Message;
    namespace ClientToServer {
        type Message = {
            type: "MESSAGE";
            exactSendDate: Date;
        };
    }
    type ServerToClient = ServerToClient.Message | ServerToClient.SendReport | ServerToClient.StatusReport | ServerToClient.MissedCall | ServerToClient.CallAnsweredBy | ServerToClient.TargetGsmRinging;
    namespace ServerToClient {
        type Message = {
            type: "MESSAGE";
            pduDate: Date;
        };
        type SendReport = {
            type: "SEND REPORT";
            messageTowardGsm: MessageTowardGsm;
            sendDate: Date | null;
        };
        type StatusReport = {
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
        type MissedCall = {
            type: "MISSED CALL";
            date: Date;
        };
        type CallAnsweredBy = {
            type: "CALL ANSWERED BY";
            date: Date;
            ua: Ua;
        };
        type TargetGsmRinging = {
            type: "TARGET GSM RINGING";
        };
    }
}
