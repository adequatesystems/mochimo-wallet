/**
 * Web Crypto API wrapper for cryptographic operations
 */

const ALGORITHM = 'AES-CBC';
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const IV_LENGTH = 16;
const ITERATIONS = process.env.NODE_ENV === 'test' ? 10 : 100000;

export interface EncryptedData {
    data: string;      // Base64 encrypted data
    iv: string;        // Base64 IV
    salt: string;      // Base64 salt
    tag?: string;      // Base64 auth tag (included in data for AES-GCM)
}

/**
 * Derives an encryption key from a password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    // Convert password to key material
    const encoder = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        encoder.encode(password),
        'PBKDF2',
        false,
        ['deriveKey']
    );

    // Derive the key using PBKDF2
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: ITERATIONS,
            hash: 'SHA-256'
        },
        keyMaterial,
        {
            name: ALGORITHM,
            length: KEY_LENGTH
        },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypts data using AES-CBC
 */
export async function encrypt(data: Uint8Array, password: string): Promise<EncryptedData> {
    // Generate random salt and IV
    const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
    const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

    // Convert data to base64 first (like CryptoJS)
    const base64Data = data.length > 0 ? Buffer.from(data).toString('base64') : '';
    const dataToEncrypt = new TextEncoder().encode(base64Data);

    // Derive key from password
    const key = await deriveKey(password, salt);

    // Encrypt the data
    const encrypted = await crypto.subtle.encrypt(
        {
            name: ALGORITHM,
            iv
        },
        key,
        dataToEncrypt
    );

    // Convert to base64
    return {
        data: btoa(String.fromCharCode(...new Uint8Array(encrypted))),
        iv: btoa(String.fromCharCode(...iv)),
        salt: btoa(String.fromCharCode(...salt))
    };
}

/**
 * Decrypts AES-CBC encrypted data
 */
export async function decrypt(encrypted: EncryptedData, password: string): Promise<Uint8Array> {
    try {
        // Convert base64 to Uint8Array
        const encryptedData = Uint8Array.from(atob(encrypted.data), c => c.charCodeAt(0));
        const iv = Uint8Array.from(atob(encrypted.iv), c => c.charCodeAt(0));
        const salt = Uint8Array.from(atob(encrypted.salt), c => c.charCodeAt(0));

        // Derive key from password
        const key = await deriveKey(password, salt);

        // Decrypt the data
        const decrypted = await crypto.subtle.decrypt(
            {
                name: ALGORITHM,
                iv
            },
            key,
            encryptedData
        );

        // Convert from base64 back to bytes
        const base64Data = new TextDecoder().decode(decrypted);
        return new Uint8Array(Buffer.from(base64Data, 'base64'));
    } catch (error) {
        throw new Error('Failed to decrypt - invalid password');
    }
}

/**
 * Generates a random key
 */
export function generateRandomKey(length: number = 32): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Derives a deterministic key from a master key and index
 */
export async function deriveSubkey(masterKey: Uint8Array, index: number): Promise<Uint8Array> {
    const encoder = new TextEncoder();
    const indexBytes = encoder.encode(index.toString());
    
    // Import master key
    const key = await crypto.subtle.importKey(
        'raw',
        masterKey,
        {
            name: 'HMAC',
            hash: 'SHA-256'
        },
        false,
        ['sign']
    );

    // Generate subkey using HMAC
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        indexBytes
    );

    return new Uint8Array(signature);
}