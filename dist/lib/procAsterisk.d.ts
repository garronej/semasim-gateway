export declare function beforeExit(): Promise<void>;
export declare namespace beforeExit {
    let impl: () => Promise<void>;
}
/** Return a promise that resolve when Asterisk is fully booted */
export declare function spawnAsterisk(): Promise<void>;
