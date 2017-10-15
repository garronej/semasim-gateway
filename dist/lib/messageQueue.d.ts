import { Contact } from "./sipContact";
export declare function sendMessagesOfDongle(endpoint: Contact.UaEndpoint.EndpointRef): void;
export declare function notifyNewSipMessagesToSend(fromEndpoint: Contact.UaEndpoint.EndpointRef): void;
export declare function sendMessagesOfContact(contact: Contact): void;
