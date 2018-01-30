
import { DongleController as Dc } from "chan-dongle-extended-client";
import { Contact } from "../lib/sipContact";
import * as f from "../tools/mySqlFunctions";

export function generateSim(
    contactCount: number = ~~(Math.random() * 200)
): Dc.ActiveDongle["sim"] {

    let sim: Dc.ActiveDongle["sim"] = {
        "imsi": f.genDigits(15),
        "iccid": f.genDigits(22),
        "country": Date.now() % 2 === 0 ?
            undefined : ({
                "name": "France",
                "iso": "fr",
                "code": 33
            }),
        "serviceProvider": {
            "fromImsi": f.genUtf8Str(10),
            "fromNetwork": f.genUtf8Str(5),
        },
        "storage": {
            "number": Date.now() % 2 === 0 ?
                undefined :
                ({ "asStored": f.genDigits(10), "localFormat": `+${f.genDigits(9)}` }),
            "infos": {
                "contactNameMaxLength": ~~(Math.random() * 15),
                "numberMaxLength": ~~(Math.random() * 10),
                "storageLeft": ~~(Math.random() * 300)
            },
            "contacts": [],
            "digest": ""
        }
    };

    let index = 1;

    while (contactCount--) {

        index += ~~(Math.random() * 10) + 1;

        sim.storage.contacts.push({
            index,
            "name": {
                "asStored": f.genUtf8Str(10),
                "full": f.genUtf8Str(15)
            },
            "number": {
                "asStored": f.genDigits(10),
                "localFormat": f.genDigits(10)
            }
        });

    }

    sim.storage.digest = Dc.SimStorage.computeDigest(
        sim.storage.number?sim.storage.number.asStored:undefined,
        sim.storage.infos.storageLeft,
        sim.storage.contacts
    );

    console.assert(Dc.SimStorage.sanityCheck(sim.storage));

    return sim;

}

export const generateUa = (email: string = `${f.genHexStr(10)}@foo.com`): Contact.UaSim.Ua => ({
    "instance": `"<urn:uuid:${f.genHexStr(30)}>"`,
    "platform": Date.now() % 2 ? "android" : "iOS",
    "pushToken": f.genHexStr(60),
    "software": f.genHexStr(20),
    "userEmail": email
});