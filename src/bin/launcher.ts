#!/usr/bin/env node

require("rejection-tracker").main(__dirname, "..", "..");

import { DongleController as Dc } from "chan-dongle-extended-client";
import * as db from "../lib/db";

import * as _debug from "debug";
let debug = _debug("_launcher");

(async function callee() {

    try{

        await Dc.getInstance().initialization;

        await db.asterisk.initializeEvt();

        import("../lib/main");

    }catch(error){

        debug("dongle-extended not initialized yet, scheduling retry...");

        await new Promise(resolve=>setTimeout(resolve, 5000));

        callee();

    }

})();