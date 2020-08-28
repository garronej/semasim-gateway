"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendWakeUpPushNotifications = exports.seeIfSipContactIsReachableElseSendWakeUpPushNotification = exports.notifyOngoingCall = exports.notifyDongleOffline = exports.notifyLockedDongle = exports.notifyCellSignalStrengthChange = exports.notifyGsmConnectivityChange = exports.notifySimOnline = void 0;
var notifySimOnline;
(function (notifySimOnline) {
    notifySimOnline.methodName = "notifySimOnline";
})(notifySimOnline = exports.notifySimOnline || (exports.notifySimOnline = {}));
var notifyGsmConnectivityChange;
(function (notifyGsmConnectivityChange) {
    notifyGsmConnectivityChange.methodName = "notifyGsmConnectivityChange";
})(notifyGsmConnectivityChange = exports.notifyGsmConnectivityChange || (exports.notifyGsmConnectivityChange = {}));
var notifyCellSignalStrengthChange;
(function (notifyCellSignalStrengthChange) {
    notifyCellSignalStrengthChange.methodName = "notifyCellSignalStrengthChange";
})(notifyCellSignalStrengthChange = exports.notifyCellSignalStrengthChange || (exports.notifyCellSignalStrengthChange = {}));
var notifyLockedDongle;
(function (notifyLockedDongle) {
    notifyLockedDongle.methodName = "notifyLockedDongle";
})(notifyLockedDongle = exports.notifyLockedDongle || (exports.notifyLockedDongle = {}));
var notifyDongleOffline;
(function (notifyDongleOffline) {
    notifyDongleOffline.methodName = "notifyDongleOffline";
})(notifyDongleOffline = exports.notifyDongleOffline || (exports.notifyDongleOffline = {}));
var notifyOngoingCall;
(function (notifyOngoingCall) {
    notifyOngoingCall.methodName = "notifyOngoingCall";
})(notifyOngoingCall = exports.notifyOngoingCall || (exports.notifyOngoingCall = {}));
var seeIfSipContactIsReachableElseSendWakeUpPushNotification;
(function (seeIfSipContactIsReachableElseSendWakeUpPushNotification) {
    seeIfSipContactIsReachableElseSendWakeUpPushNotification.methodName = "seeIfSipContactIsReachableElseSendWakeUpPushNotification";
})(seeIfSipContactIsReachableElseSendWakeUpPushNotification = exports.seeIfSipContactIsReachableElseSendWakeUpPushNotification || (exports.seeIfSipContactIsReachableElseSendWakeUpPushNotification = {}));
var sendWakeUpPushNotifications;
(function (sendWakeUpPushNotifications) {
    sendWakeUpPushNotifications.methodName = "sendWakeUpPushNotifications";
})(sendWakeUpPushNotifications = exports.sendWakeUpPushNotifications || (exports.sendWakeUpPushNotifications = {}));
