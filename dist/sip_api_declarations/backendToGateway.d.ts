import * as types from "../lib/types";
import { types as dcTypes } from "chan-dongle-extended-client";
export declare namespace notifySimOnline {
    const methodName = "notifySimOnline";
    /**
     * replacementPassword is the sip password that will
     * replace the current password if the server respond
     * with status "REPLACE PASSWORD"
     */
    type Params = {
        imsi: string;
        storageDigest: string;
        password: string;
        replacementPassword: string;
        towardSimEncryptKeyStr: string;
        simDongle: {
            imei: string;
            isVoiceEnabled: boolean | undefined;
            manufacturer: string;
            model: string;
            firmwareVersion: string;
        };
        isGsmConnectivityOk: boolean;
        cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength;
    };
    type Response = {
        status: "OK";
    } | {
        status: "NOT REGISTERED";
    } | {
        status: "REPLACE PASSWORD";
        allowedUas: types.UaRef[];
    };
}
export declare namespace notifyGsmConnectivityChange {
    const methodName = "notifyGsmConnectivityChange";
    type Params = {
        imsi: string;
        isGsmConnectivityOk: boolean;
    };
    type Response = undefined;
}
export declare namespace notifyCellSignalStrengthChange {
    const methodName = "notifyCellSignalStrengthChange";
    type Params = {
        imsi: string;
        cellSignalStrength: dcTypes.Dongle.Usable.CellSignalStrength;
    };
    type Response = undefined;
}
export declare namespace notifyLockedDongle {
    const methodName = "notifyLockedDongle";
    type Params = dcTypes.Dongle.Locked;
    type Response = undefined;
}
export declare namespace notifyDongleOffline {
    const methodName = "notifyDongleOffline";
    type Params = {
        imsi: string;
    } | {
        imei: string;
    };
    type Response = undefined;
}
export declare namespace notifyOngoingCall {
    const methodName = "notifyOngoingCall";
    /** Assert we never send this notif when the sim
     * is not registered. ( ok as the notif is sent only
     * when at least one user joined the call )
    */
    type Params = {
        ongoingCallId: string;
        from: "DONGLE" | "SIP";
        imsi: string;
        number: string;
        uasInCall: types.UaRef[];
        isTerminated: boolean;
    };
    type Response = undefined;
}
export declare namespace notifyNewOrUpdatedUa {
    const methodName = "notifyNewOrUpdatedUa";
    type Params = Omit<types.Ua, "towardUserEncryptKeyStr">;
    type Response = undefined;
}
export declare namespace wakeUpContact {
    const methodName = "wakeUpContact";
    type Params = {
        contact: types.Contact;
    };
    type Response = "REACHABLE" | "PUSH_NOTIFICATION_SENT" | "UNREACHABLE";
}
export declare namespace forceContactToReRegister {
    const methodName = "forceContactToReRegister";
    interface Params {
        contact: types.Contact;
    }
    type Response = boolean;
}
