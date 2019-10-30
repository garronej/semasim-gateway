
import * as sipContactsMonitor from "../sipContactsMonitor";
import * as toBackendRemoteApiCaller from "../toBackend/remoteApiCaller";
import * as dbSemasim from "../dbSemasim";
import * as types from "../types";
import { areSameUas } from "./misc";


async function asyncFilter<T>(array: T[], asyncMatcher: (entry: T) => Promise<boolean>): Promise<T[]> {

    const __removed__ = [];

    const arr = await Promise.all(
        array.map(
            entry => asyncMatcher(entry)
                .then(doKeep => doKeep ? entry : __removed__)
        )
    );

    return arr.filter((entry): entry is T => entry !== __removed__);

}

export function getReachableSipContactsAndWakeUpUasThatAreNotCurrentlyRegistered(params: {
    imsi: string;
    asyncUaMatcher?: (ua: types.Ua) => Promise<boolean>;
    reachableSipContactCallbackFn: (reachableSipContact: types.Contact) => void;
}): void {

    const { imsi, reachableSipContactCallbackFn } = params;

    const asyncUaMatcher = params.asyncUaMatcher || (()=> Promise.resolve(true))

    const contacts = sipContactsMonitor.getContacts(imsi);

    asyncFilter(contacts, contact => asyncUaMatcher(contact.uaSim.ua))
        .then(contacts => contacts.forEach(
            contact => toBackendRemoteApiCaller.seeIfSipContactIsReachableElseSendWakeUpPushNotification(contact)
                .then(({ isReachable }) => {

                    if (!isReachable) {
                        return;
                    }

                    reachableSipContactCallbackFn(contact);

                })
        ));

    dbSemasim.getUas(imsi).then(
        async uas => toBackendRemoteApiCaller.sendWakeUpPushNotifications({
            "uas": await asyncFilter(
                uas.filter(ua => !contacts.find(contact => areSameUas(ua, contact.uaSim.ua))),
                asyncUaMatcher
            ),
            imsi
        })
    );


}





