import { describe, it, expect, beforeEach } from 'vitest';
import * as webCrypto from '../../../src/crypto/webCrypto';

describe('WebCrypto Implementation', () => {
    const testPassword = 'test-password';
    const testData = new Uint8Array([1, 2, 3, 4, 5]);

    // Helper to compare Uint8Arrays
    function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
        if (a.length !== b.length) return false;
        return a.every((val, i) => val === b[i]);
    }

    describe('Encryption/Decryption', () => {
        it('should encrypt and decrypt data correctly', async () => {
            const encrypted = await webCrypto.encrypt(testData, testPassword);
            const decrypted = await webCrypto.decrypt(encrypted, testPassword);
            
            expect(arraysEqual(decrypted, testData)).toBe(true);
        });

        it('should handle empty data', async () => {
            const emptyData = new Uint8Array(0);
            const encrypted = await webCrypto.encrypt(emptyData, testPassword);
            const decrypted = await webCrypto.decrypt(encrypted, testPassword);
            
            expect(arraysEqual(decrypted, emptyData)).toBe(true);
        });

        it('should throw on invalid password', async () => {
            const encrypted = await webCrypto.encrypt(testData, testPassword);
            await expect(webCrypto.decrypt(encrypted, 'wrong-password'))
                .rejects.toThrow('Failed to decrypt - invalid password');
        });
    });

    describe('PBKDF2 iterations', () => {
        afterEach(() => {
            webCrypto.setPbkdf2Iterations(undefined);
        });

        it('should be 100000 regardless of NODE_ENV', () => {
            // NODE_ENV is 'test' under vitest; the old code would have returned 10.
            expect(process.env.NODE_ENV).toBe('test');
            expect(webCrypto.getPbkdf2Iterations()).toBe(100000);
        });

        it('should never drop below the 100000 hard floor even if overridden lower', () => {
            webCrypto.setPbkdf2Iterations(10);
            expect(webCrypto.getPbkdf2Iterations()).toBe(100000);
        });
    });

    describe('Key Generation', () => {
        it('should generate random keys of specified length', () => {
            const key1 = webCrypto.generateRandomKey(32);
            const key2 = webCrypto.generateRandomKey(32);
            
            expect(key1.length).toBe(32);
            expect(key2.length).toBe(32);
            expect(arraysEqual(key1, key2)).toBe(false); // Should be random
        });

        it('should derive consistent subkeys', async () => {
            const masterKey = webCrypto.generateRandomKey(32);
            
            // Same input should yield same output
            const subkey1 = await webCrypto.deriveSubkey(masterKey, 1);
            const subkey2 = await webCrypto.deriveSubkey(masterKey, 1);
            expect(arraysEqual(subkey1, subkey2)).toBe(true);
            
            // Different indices should yield different keys
            const subkey3 = await webCrypto.deriveSubkey(masterKey, 2);
            expect(arraysEqual(subkey1, subkey3)).toBe(false);
        });
    });

    describe('Encrypted Data Format', () => {
        it('should produce valid base64 strings', async () => {
            const encrypted = await webCrypto.encrypt(testData, testPassword);
            
            // Check that all components are valid base64
            const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
            expect(base64Regex.test(encrypted.data)).toBe(true);
            expect(base64Regex.test(encrypted.iv)).toBe(true);
            expect(base64Regex.test(encrypted.salt)).toBe(true);
        });

        it('should maintain consistent encrypted data structure', async () => {
            const encrypted = await webCrypto.encrypt(testData, testPassword);
            
            expect(encrypted).toHaveProperty('data');
            expect(encrypted).toHaveProperty('iv');
            expect(encrypted).toHaveProperty('salt');
            
            // IV should be consistent length (16 bytes for CBC mode)
            expect(atob(encrypted.iv).length).toBe(16);
            
            // Salt should be consistent length (16 bytes)
            expect(atob(encrypted.salt).length).toBe(16);
        });
    });
}); 