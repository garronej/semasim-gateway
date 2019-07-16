process.once("unhandledRejection", error => { throw error; });

import { testDbAsterisk }  from "./dbAsterisk";
import { testDbSemasim } from "./dbSemasim";
import * as bundledData from "./bundledData";

(async () => {

    bundledData.testSerialization();

    await testDbAsterisk();

    await testDbSemasim();

    console.log("ALL TESTS PASSED !");

    process.exit(0);

})();