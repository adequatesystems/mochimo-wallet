import { AES, enc, lib, PBKDF2, mode, pad } from 'crypto-js';

// Use fewer iterations in test environment
const DEFAULT_ITERATIONS = process.env.NODE_ENV === 'test' ? 10 : 100000;

export interface EncryptedData {
    data: string;      // Base64 encrypted data
    iv: string;        // Base64 IV
    salt: string;      // Base64 salt
}

/**
 * Derives an encryption key from a password
 */
async function deriveKey(password: string, salt: lib.WordArray): Promise<lib.WordArray> {
    return PBKDF2(password, salt, {
        keySize: 256 / 32,  // AES-256
        iterations: DEFAULT_ITERATIONS
    });
}

/**
 * Encrypts data with a password
 */
export async function encrypt(data: Uint8Array, password: string): Promise<EncryptedData> {
    // Generate random salt and IV
    const salt = lib.WordArray.random(16);
    const iv = lib.WordArray.random(16);
    
    // Derive key from password
    const key = await deriveKey(password, salt);
    
    // Convert data to base64 (empty array becomes empty string)
    const base64Data = data.length > 0 ? Buffer.from(data).toString('base64') : '';
    
    // Encrypt (empty string becomes empty ciphertext)
    const encrypted = base64Data 
        ? AES.encrypt(base64Data, key, {
            iv,
            mode: mode.CBC,
            padding: pad.Pkcs7
        }).toString()
        : '';
    
    return {
        data: encrypted,
        iv: iv.toString(enc.Base64),
        salt: salt.toString(enc.Base64)
    };
}

/**
 * Decrypts data with a password
 */
export async function decrypt(encrypted: EncryptedData, password: string): Promise<Uint8Array> {
    // Handle empty data
    if (!encrypted.data) {
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

        // Convert to string and validate base64
        const base64 = decrypted.toString(enc.Utf8);
        if (!base64) {
            throw new Error('Invalid decryption');
        }

        // Convert back to Uint8Array
        return new Uint8Array(Buffer.from(base64, 'base64'));
    } catch (error) {
        throw new Error('Failed to decrypt - invalid password');
    }
} 