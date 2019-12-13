"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
var phone_number_1 = require("phone-number");
/** two contact are considered duplicated when they have the same number
 * regardless of the name of the contact */
function removeDuplicateContactInSimInternalStorage(dongle, dc) {
    return __awaiter(this, void 0, void 0, function () {
        var tasks, numberSet, _loop_1, numberSet_1, numberSet_1_1, number;
        var e_1, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    tasks = [];
                    numberSet = new Set(dongle.sim.storage.contacts
                        .map(function (_a) {
                        var number = _a.number;
                        return phone_number_1.phoneNumber.build(number, !!dongle.sim.country ?
                            dongle.sim.country.iso : undefined);
                    }));
                    _loop_1 = function (number) {
                        var e_2, _a;
                        var contacts = dongle.sim.storage.contacts
                            .filter(function (contact) { return phone_number_1.phoneNumber.areSame(number, contact.number); });
                        contacts.shift();
                        try {
                            for (var contacts_1 = (e_2 = void 0, __values(contacts)), contacts_1_1 = contacts_1.next(); !contacts_1_1.done; contacts_1_1 = contacts_1.next()) {
                                var index = contacts_1_1.value.index;
                                tasks[tasks.length] = dc.deleteContact(dongle.sim.imsi, index)
                                    .catch(function () { });
                            }
                        }
                        catch (e_2_1) { e_2 = { error: e_2_1 }; }
                        finally {
                            try {
                                if (contacts_1_1 && !contacts_1_1.done && (_a = contacts_1.return)) _a.call(contacts_1);
                            }
                            finally { if (e_2) throw e_2.error; }
                        }
                    };
                    try {
                        for (numberSet_1 = __values(numberSet), numberSet_1_1 = numberSet_1.next(); !numberSet_1_1.done; numberSet_1_1 = numberSet_1.next()) {
                            number = numberSet_1_1.value;
                            _loop_1(number);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (numberSet_1_1 && !numberSet_1_1.done && (_a = numberSet_1.return)) _a.call(numberSet_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return [4 /*yield*/, Promise.all(tasks)];
                case 1:
                    _b.sent();
                    return [2 /*return*/];
            }
        });
    });
}
exports.removeDuplicateContactInSimInternalStorage = removeDuplicateContactInSimInternalStorage;
