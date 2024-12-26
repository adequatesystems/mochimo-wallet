export interface Account {
    index: number;          // Unique account index
    name: string;           // User-defined name
    wotsIndex: number;      // Current WOTS key index
    tag: Uint8Array;        // 12-byte deterministic tag
    lastUsed: number;       // Timestamp of last usage
    publicKey: Uint8Array;  // Current public key
} 