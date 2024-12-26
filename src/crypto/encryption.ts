import { AES, enc, lib, PBKDF2, mode, pad } from 'crypto-js';

// Use fewer iterations in test environment
const DEFAULT_ITERATIONS = process.env.NODE_ENV === 'test' ? 1 : 100000;

export interface EncryptedData {
    data: string;      // Base64 encrypted data
    iv: string;        // Base64 IV
    salt: string;      // Base64 salt
}

/**
 * Derives an encryption key from a password
 */
async function deriveKey(password: string, salt: lib.WordArray, iterations = DEFAULT_ITERATIONS): Promise<lib.WordArray> {
    return PBKDF2(password, salt, {
        keySize: 256 / 32,  // AES-256
        iterations
    });
}

/**
 * Encrypts data with a password
 */
export async function encrypt(data: Uint8Array, password: string): Promise<EncryptedData> {
    // Handle empty data as special case
    if (data.length === 0) {
        const salt = lib.WordArray.random(16);
        const iv = lib.WordArray.random(16);
        return {
            data: '',  // Empty string for empty data
            iv: iv.toString(enc.Base64),
            salt: salt.toString(enc.Base64)
        };
    }

    // Generate random salt and IV
    const salt = lib.WordArray.random(16);
    const iv = lib.WordArray.random(16);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Convert data to WordArray
    const words: number[] = [];
    for (let i = 0; i < data.length; i += 4) {
        words.push(
            (data[i] << 24) |
            ((data[i + 1] || 0) << 16) |
            ((data[i + 2] || 0) << 8) |
            (data[i + 3] || 0)
        );
    }
    const dataWords = lib.WordArray.create(words, data.length);
    
    // Encrypt
    const encrypted = AES.encrypt(dataWords, key, {
        iv,
        mode: mode.CBC,
        padding: pad.Pkcs7
    });
    
    return {
        data: encrypted.toString(),
        iv: iv.toString(enc.Base64),
        salt: salt.toString(enc.Base64)
    };
}

/**
 * Decrypts data with a password
 */
export async function decrypt(encrypted: EncryptedData, password: string): Promise<Uint8Array> {
    // Handle empty data as special case
    if (encrypted.data === '') {
        return new Uint8Array(0);
    }

    // Parse Base64 values
    const salt = enc.Base64.parse(encrypted.salt);
    const iv = enc.Base64.parse(encrypted.iv);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    try {
        // Decrypt
        const decrypted = AES.decrypt(encrypted.data, key, {
            iv,
            mode: mode.CBC,
            padding: pad.Pkcs7
        });
        
        // If decryption fails or padding is invalid, sigBytes will be 0
        if (decrypted.sigBytes <= 0) {
            throw new Error('Decryption failed - invalid password or corrupted data');
        }

        // Convert WordArray to Uint8Array
        const words = decrypted.words;
        const sigBytes = decrypted.sigBytes;
        const result = new Uint8Array(sigBytes);
        
        for (let i = 0; i < sigBytes; i++) {
            result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        }
        
        return result;
    } catch (error) {
        throw new Error('Decryption failed - invalid password or corrupted data');
    }
} 