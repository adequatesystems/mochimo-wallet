import { wipeBytes } from './random';
import { WOTSWallet } from 'mochimo-wots-v2';
import { hmacSHA256 } from './hash';

/**
 * Key derivation parameters
 */
export interface KDFParams {
    salt: Uint8Array;
    iterations?: number;
    keyLength?: number;
}

// Default iterations based on environment
const DEFAULT_ITERATIONS = process.env.NODE_ENV === 'test' ? 1 : 100000;

/**
 * Derives a key from a master seed and an index
 * @param masterSeed The master seed to derive from
 * @param index The derivation index
 * @param params Optional KDF parameters
 * @returns Promise<Uint8Array> The derived key
 */
export async function deriveKey(
    masterSeed: Uint8Array,
    index: number,
    params: KDFParams
): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const indexBytes = encoder.encode(index.toString());
    
    // Combine master seed and index
    const input = new Uint8Array(masterSeed.length + indexBytes.length);
    input.set(masterSeed);
    input.set(indexBytes, masterSeed.length);

    try {
        let key = input;
        
        // Perform PBKDF2-like key derivation using HMAC-SHA256
        for (let i = 0; i < (params.iterations || DEFAULT_ITERATIONS); i++) {
            key = hmacSHA256(key, params.salt);
        }
        
        // If requested key length is different from hash output, adjust
        if (params.keyLength && params.keyLength !== key.length) {
            key = key.slice(0, params.keyLength);
        }
        
        return key;
    } finally {
        wipeBytes(input);
    }
}

/**
 * Derives a WOTS secret key from master seed and account index
 * @param masterSeed The master seed
 * @param accountIndex The account index
 * @returns Promise<Uint8Array> The derived WOTS secret key (32 bytes)
 */
export async function deriveAccountSeed(
    masterSeed: Uint8Array,
    accountIndex: number
): Promise<Uint8Array> {
    const salt = new TextEncoder().encode(`account_${accountIndex}`);
    return deriveKey(masterSeed, accountIndex, {
        salt,
        keyLength: 32  // WOTS secret must be 32 bytes
    });
}
/**
 * Derives a WOTS seed from an account seed and a WOTS index
 * @param accountSeed The account seed
 * @param wotsIndex The WOTS index
 * @returns Promise<Uint8Array> The derived WOTS seed (32 bytes)
 */
export async function deriveWotsSeed(
    accountSeed: Uint8Array,
    wotsIndex: number
): Promise<Uint8Array> {
    const salt = new TextEncoder().encode(`wots_${wotsIndex}`);
    return deriveKey(accountSeed, wotsIndex, {
        salt,
        keyLength: 32  // WOTS secret must be 32 bytes
    });
}

/**
 * Derives an account tag from master seed and account index
 * @param masterSeed The master seed
 * @param accountIndex The account index
 * @returns Promise<Uint8Array> The derived account tag (12 bytes)
 */
export async function deriveAccountTag(
    masterSeed: Uint8Array,
    accountIndex: number
): Promise<Uint8Array> {
    const salt = new TextEncoder().encode(`tag_${accountIndex}`);
    const tagKey = await deriveKey(masterSeed, accountIndex, {
        salt,
        keyLength: 12,  // Tags are 12 bytes
        iterations: 10000  // Fewer iterations for tags
    });
    return tagKey;
}

/**
 * Creates a WOTS wallet for a given account index
 * @param masterSeed The master seed
 * @param accountIndex The account index
 * @param name Optional wallet name
 * @returns Promise<WOTSWallet> The created WOTS wallet
 */
export async function createWOTSWallet(
    masterSeed: Uint8Array,
    accountIndex: number,
    wotsIndex: number,
    name: string = `Account ${accountIndex} - WOTS ${wotsIndex}`
): Promise<WOTSWallet> {
    const seed = await deriveAccountSeed(masterSeed, accountIndex);
    const tag = await deriveAccountTag(masterSeed, accountIndex);
    const wotsSeed = await deriveWotsSeed(seed, wotsIndex);

    
    try {
        return WOTSWallet.create(name, wotsSeed, tag);
    } finally {
        // Clean up the secret after wallet creation
        wipeBytes(seed);
    }
} 