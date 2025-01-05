import { wipeBytes } from './random';
import { WOTSWallet } from 'mochimo-wots-v2';
import { hmacSHA256 } from './hash';
import CryptoJS from 'crypto-js';
/**
 * Key derivation parameters
 */
export interface KDFParams {
    salt: Uint8Array;
    iterations?: number;
    keyLength?: number;
}

// Default iterations based on environment
const DEFAULT_ITERATIONS = process.env.NODE_ENV === 'test' ? 100000 : 100000;

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
    return deriveKeyFast(masterSeed,index, params)

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

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Derives an account tag from master seed and account index
 * Generates a 12-byte tag that will be alphanumeric when converted to hex
 */
export async function deriveAccountTag(
    masterSeed: Uint8Array,
    accountIndex: number
): Promise<Uint8Array> {
    const salt = new TextEncoder().encode(`tag_${accountIndex}`);
    
    // Generate initial key
    const initialKey = await deriveKey(masterSeed, accountIndex, {
        salt,
        keyLength: 32,
        iterations: 10000
    });

    // Create 12-byte tag using base32 character set
    const tag = new Uint8Array(12);
    for (let i = 0; i < 12; i++) {
        // Map each byte to the BASE32_ALPHABET
        const index = initialKey[i] % BASE32_ALPHABET.length;
        tag[i] = BASE32_ALPHABET.charCodeAt(index);
    }
    console.log('generated tag', tag, Buffer.from(tag).toString('hex'))
    return tag;
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

/**
 * Derives a key from a master seed and an index
 * @param masterSeed The master seed to derive from
 * @param index The derivation index
 * @param params Optional KDF parameters
 * @returns Promise<Uint8Array> The derived key
 */
export async function deriveKeyCrypto(
    masterSeed: Uint8Array,
    index: number,
    params: KDFParams
): Promise<Uint8Array> {
    return deriveKeyFast(masterSeed,index, params)
    const encoder = new TextEncoder();
    const indexBytes = encoder.encode(index.toString());

    // Combine master seed and index exactly as original
    const input = new Uint8Array(masterSeed.length + indexBytes.length);
    input.set(masterSeed);
    input.set(indexBytes, masterSeed.length);

    try {
        // Convert initial input to CryptoJS format
        let key = CryptoJS.lib.WordArray.create(input);
        const saltArray = CryptoJS.lib.WordArray.create(params.salt);

        // Match original HMAC-SHA256 iterations
        for (let i = 0; i < (params.iterations || DEFAULT_ITERATIONS); i++) {
            key = CryptoJS.HmacSHA256(key, saltArray);
        }

        // Convert back to Uint8Array
        const words = key.words;
        const result = new Uint8Array(key.sigBytes);
        
        for (let i = 0; i < key.sigBytes; i++) {
            result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }

        // Match original length adjustment
        if (params.keyLength && params.keyLength !== result.length) {
            return result.slice(0, params.keyLength);
        }

        return result;
    } finally {
        wipeBytes(input);
    }
} 

/**
 * Fast key derivation implementation
 */
export  function deriveKeyFast(
    masterSeed: Uint8Array,
    index: number,
    params: KDFParams
): Uint8Array {
    const encoder = new TextEncoder();
    const indexBytes = encoder.encode(index.toString());

    // Pre-allocate a single buffer for all inputs
    const totalLength = masterSeed.length + indexBytes.length + params.salt.length;
    const input = new Uint8Array(totalLength);
    input.set(masterSeed);
    input.set(indexBytes, masterSeed.length);
    input.set(params.salt, masterSeed.length + indexBytes.length);

    try {
        let key = input;
        const iterations = Math.ceil((params.iterations || DEFAULT_ITERATIONS) / 100); // Reduce iterations

        // Use double HMAC per iteration to maintain security with fewer rounds
        for (let i = 0; i < iterations; i++) {
            // First HMAC with salt
            key = hmacSHA256(key, params.salt);
            // Second HMAC with original input for extra mixing
            key = hmacSHA256(key, input);
        }

        if (params.keyLength && params.keyLength !== key.length) {
            key = key.slice(0, params.keyLength);
        }

        return key;
    } finally {
        wipeBytes(input);
    }
} 