

import { DongleController as Dc, types as dcTypes } from "chan-dongle-extended-client";
import { phoneNumber } from "phone-number";

/** two contact are considered duplicated when they have the same number 
 * regardless of the name of the contact */
export async function removeDuplicateContactInSimInternalStorage(
    dongle: dcTypes.Dongle.Usable,
    dc: Dc
) {
    const tasks: Promise<void>[] = [];

    const numberSet = new Set<string>(
        dongle.sim.storage.contacts
            .map(({ number }) =>
                phoneNumber.build(
                    number,
                    !!dongle.sim.country ?
                        dongle.sim.country.iso : undefined
                )
            )
    );

    for (const number of numberSet) {

        const contacts = dongle.sim.storage.contacts
            .filter(contact => phoneNumber.areSame(
                number, contact.number
            ))
            ;

        contacts.shift();

        for (const { index } of contacts) {

            tasks[tasks.length] = dc.deleteContact(dongle.sim.imsi, index)
                .catch(() => { })
                ;

        }


    }

    await Promise.all(tasks);

}