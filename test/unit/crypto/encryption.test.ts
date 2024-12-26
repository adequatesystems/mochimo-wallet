import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../../../src/crypto/encryption';
import { generateSeed } from '../../../src/crypto/random';

describe('Encryption', () => {
    describe('encrypt/decrypt', () => {
        it('should encrypt and decrypt data correctly', async () => {
            const data = generateSeed();  // Generate random test data
            const password = 'test-password';

            // Encrypt the data
            const encrypted = await encrypt(data, password);
            
            // Verify encrypted data format
            expect(encrypted.data).toBeDefined();
            expect(encrypted.iv).toBeDefined();
            expect(encrypted.salt).toBeDefined();
            
            // Decrypt the data
            const decrypted = await decrypt(encrypted, password);
            
            // Verify decrypted data matches original
            expect(decrypted).toEqual(data);
        });

        it('should produce different ciphertexts for same data', async () => {
            const data = generateSeed();
            const password = 'test-password';

            const encrypted1 = await encrypt(data, password);
            const encrypted2 = await encrypt(data, password);

            // Should have different IVs and salts
            expect(encrypted1.iv).not.toEqual(encrypted2.iv);
            expect(encrypted1.salt).not.toEqual(encrypted2.salt);
            expect(encrypted1.data).not.toEqual(encrypted2.data);
        });

        it('should fail decryption with wrong password', async () => {
            const data = generateSeed();
            const password = 'correct-password';
            const wrongPassword = 'wrong-password';

            const encrypted = await encrypt(data, password);

            await expect(decrypt(encrypted, wrongPassword))
                .rejects.toThrow();
        });

        it('should handle empty data', async () => {
            const data = new Uint8Array(0);
            const password = 'test-password';

            const encrypted = await encrypt(data, password);
            const decrypted = await decrypt(encrypted, password);

            expect(decrypted).toEqual(data);
        });

        it('should handle various data sizes', async () => {
            const sizes = [1, 15, 16, 17, 31, 32, 33, 63, 64, 65];
            const password = 'test-password';

            for (const size of sizes) {
                const data = new Uint8Array(size);
                crypto.getRandomValues(data);  // Fill with random data

                const encrypted = await encrypt(data, password);
                const decrypted = await decrypt(encrypted, password);

                expect(decrypted).toEqual(data);
            }
        });

        it('should be secure in production mode', async () => {
            // Temporarily set NODE_ENV to production
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            
            const data = generateSeed();
            const password = 'test-password';
            const encrypted = await encrypt(data, password);
            const decrypted = await decrypt(encrypted, password);
            
            
            expect(decrypted).toEqual(data);

            // Restore NODE_ENV
            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('password strength', () => {
        it('should work with long passwords', async () => {
            const data = generateSeed();
            const longPassword = 'a'.repeat(1000);

            const encrypted = await encrypt(data, longPassword);
            const decrypted = await decrypt(encrypted, longPassword);

            expect(decrypted).toEqual(data);
        });

        it('should work with special characters in password', async () => {
            const data = generateSeed();
            const specialPassword = '!@#$%^&*()_+-=[]{}|;:,.<>?`~';

            const encrypted = await encrypt(data, specialPassword);
            const decrypted = await decrypt(encrypted, specialPassword);

            expect(decrypted).toEqual(data);
        });
    });
}); 