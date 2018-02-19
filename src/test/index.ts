require("rejection-tracker").main(__dirname, "..", "..");

import { testDbAsterisk }  from "./dbAsterisk";
import { testDbSemasim } from "./db";

(async () => {

    await testDbAsterisk();

    await testDbSemasim();

    console.log("ALL TESTS PASSED !");

    process.exit(0);

})();