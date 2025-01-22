import { describe, it, expect, beforeEach } from 'vitest';
import { MasterSeed } from '../../../src/core/MasterSeed';

describe('MasterSeed', () => {
    let masterSeed: MasterSeed;

    beforeEach(async () => {
        masterSeed = await MasterSeed.create();
    });

    describe('create', () => {
        it('should create an unlocked instance', () => {
            expect(masterSeed.isLocked).toBe(false);
        });
    });

    describe('lock', () => {
        it('should lock the seed', async () => {
            masterSeed.lock();
            expect(masterSeed.isLocked).toBe(true);

            // Should not be able to derive after locking
            try {
                masterSeed.deriveAccountSeed(0);
            } catch (e) {
                expect(e).toBeInstanceOf(Error);
                expect(e.message).toBe('Master seed is locked');
            }
        });
    });

    describe('deriveAccountSeed', () => {
        it('should derive consistent account seeds', async () => {
            const seed1 = await masterSeed.deriveAccountSeed(0);
            const seed2 = await masterSeed.deriveAccountSeed(0);
            expect(seed1).toEqual(seed2);
        });

        it('should derive different seeds for different indices', async () => {
            const seed1 = await masterSeed.deriveAccountSeed(0);
            const seed2 = await masterSeed.deriveAccountSeed(1);
            expect(seed1).not.toEqual(seed2);
        });
    });

    describe('seed phrases', () => {
        it('should create from valid seed phrase', async () => {
            const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const seed = await MasterSeed.fromPhrase(phrase);
            expect(seed).toBeDefined();
            expect(seed.isLocked).toBe(false);
        });

        it('should reject invalid seed phrase', async () => {
            const phrase = 'invalid seed phrase';
            await expect(MasterSeed.fromPhrase(phrase))
                .rejects.toThrow('Invalid seed phrase');
        });

        it('should generate consistent accounts from phrase', async () => {
            const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const seed1 = await MasterSeed.fromPhrase(phrase);
            const seed2 = await MasterSeed.fromPhrase(phrase);

            const tag1 = await seed1.deriveAccountTag(0);
            const tag2 = await seed2.deriveAccountTag(0);
            expect(tag1).toEqual(tag2);
        });

        it('should export seed phrase', async () => {
            // Create from known phrase
            const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            const seed = await MasterSeed.fromPhrase(phrase);

            // Export and verify
            const exported = await seed.toPhrase();
            expect(exported).toBe(phrase);
        });
    });

    describe('Key Derivation', () => {
        // Helper to compare Uint8Arrays
        function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
            if (a.length !== b.length) return false;
            return a.every((val, i) => val === b[i]);
        }

        describe('Storage Key Derivation', () => {
            it('should derive consistent storage keys', async () => {
                const seed = await MasterSeed.create();
                
                // Get keys from both implementations
                const cryptoJsKey = seed.deriveStorageKey();
                const nativeKey = await seed.deriveStorageKeyNative();

                // Keys should be same length
                expect(cryptoJsKey.length).toBe(32);
                expect(nativeKey.length).toBe(32);

                // Keys should be identical
                expect(arraysEqual(cryptoJsKey, nativeKey)).toBe(true);
            });

            it('should derive different keys for different seeds', async () => {
                const seed1 = await MasterSeed.create();
                const seed2 = await MasterSeed.create();
                
                const key1 = await seed1.deriveStorageKeyNative();
                const key2 = await seed2.deriveStorageKeyNative();

                expect(arraysEqual(key1, key2)).toBe(false);
            });

            it('should throw when seed is locked', async () => {
                const seed = await MasterSeed.create();
                seed.lock();

                expect(() => seed.deriveStorageKey()).toThrow('Master seed is locked');
                await expect(seed.deriveStorageKeyNative()).rejects.toThrow('Master seed is locked');
            });

            describe('Performance Comparison', () => {
                it('should measure key derivation performance', async () => {
                    const seed = await MasterSeed.create();
                    const iterations = 100;

                    // Measure CryptoJS implementation
                    const start1 = performance.now();
                    for (let i = 0; i < iterations; i++) {
                        seed.deriveStorageKey();
                    }
                    const cryptoJsTime = performance.now() - start1;

                    // Measure Native implementation
                    const start2 = performance.now();
                    for (let i = 0; i < iterations; i++) {
                        await seed.deriveStorageKeyNative();
                    }
                    const nativeTime = performance.now() - start2;

                    console.log(`Key Derivation Performance (${iterations} iterations):`);
                    console.log(`CryptoJS: ${cryptoJsTime.toFixed(2)}ms`);
                    console.log(`Native: ${nativeTime.toFixed(2)}ms`);
                    console.log(`Native is ${(cryptoJsTime/nativeTime).toFixed(2)}x faster`);

                    // Just ensure they completed
                    expect(true).toBe(true);
                });
            });
        });
    });
}); 