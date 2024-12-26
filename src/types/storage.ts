export interface WalletStorage {
    encryptedMasterSeed: {
        data: string;      // Base64 encrypted seed
        iv: string;        // Initialization vector
        salt: string;      // Salt for key derivation
    };
    accounts: {
        [index: number]: {
            name: string;
            wotsIndex: number;
            tag: string;     // Base64 encoded tag
            lastUsed: number;
        };
    };
    currentAccount: number;
    version: string;     // Schema version
}

export interface WalletExport {
    timestamp: number;
    version: string;
    encrypted: {
        data: string;
        iv: string;
        salt: string;
    };
    accounts: Array<{
        index: number;
        name: string;
        wotsIndex: number;
        tag: string;
    }>;
} 