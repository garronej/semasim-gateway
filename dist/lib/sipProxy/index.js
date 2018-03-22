"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const backendSocket = require("./backendSocket");
exports.backendSocket = backendSocket;
const contactsRegistrationMonitor_1 = require("./contactsRegistrationMonitor");
exports.evtContactRegistration = contactsRegistrationMonitor_1.evtContactRegistration;
exports.getContacts = contactsRegistrationMonitor_1.getContacts;
exports.discardContactsRegisteredToSim = contactsRegistrationMonitor_1.discardContactsRegisteredToSim;
const messages_1 = require("./messages");
exports.messagesDialplanContext = messages_1.dialplanContext;
exports.sendMessage = messages_1.sendMessage;
exports.evtMessage = messages_1.evtMessage;
const launch_1 = require("./launch");
exports.launch = launch_1.launch;
