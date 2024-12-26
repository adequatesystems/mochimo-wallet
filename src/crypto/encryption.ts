export async function encrypt(data: Uint8Array, password: string): Promise<{
    encrypted: string;
    iv: string;
    salt: string;
}> {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const key = await deriveKey(password, salt);
    
    const encrypted = await crypto.subtle.encrypt(
        {
            name: 'AES-GCM',
            iv
        },
        key,
        data
    );

    return {
        encrypted: Buffer.from(encrypted).toString('base64'),
        iv: Buffer.from(iv).toString('base64'),
        salt: Buffer.from(salt).toString('base64')
    };
}

export async function decrypt(
    encrypted: string,
    password: string,
    iv: string,
    salt: string
): Promise<Uint8Array> {
    const key = await deriveKey(password, Buffer.from(salt, 'base64'));
    
    const decrypted = await crypto.subtle.decrypt(
        {
            name: 'AES-GCM',
            iv: Buffer.from(iv, 'base64')
        },
        key,
        Buffer.from(encrypted, 'base64')
    );

    return new Uint8Array(decrypted);
}

async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
    const encoder = new TextEncoder();
    const passwordBuffer = encoder.encode(password);

    const baseKey = await crypto.subtle.importKey(
        'raw',
        passwordBuffer,
        'PBKDF2',
        false,
        ['deriveKey']
    );

    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt,
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
} 