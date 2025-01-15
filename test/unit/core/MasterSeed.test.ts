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
}); 