import { launch as launchAsterisk } from "./asterisk";
import { launch as launchSemasim } from "./semasim";

export async function launch(): Promise<void>{
    await Promise.all([ 
        launchAsterisk(), 
        launchSemasim() 
    ]);
}