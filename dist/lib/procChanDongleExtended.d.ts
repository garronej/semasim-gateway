export declare function beforeExit(): Promise<void>;
export declare namespace beforeExit {
    let impl: () => Promise<void>;
}
/**
 * Return a promise that resolve went chan-dongle-extended client is initialized
 * (can access getInstance() )
 */
export declare function spawnChanDongleExtended(): Promise<void>;
