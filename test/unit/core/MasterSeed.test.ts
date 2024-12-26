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
            await expect(masterSeed.deriveAccountSeed(0))
                .rejects.toThrow('Master seed is locked');
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

    describe('createWOTSWallet', () => {
        it('should create valid WOTS wallets', async () => {
            const wallet = await masterSeed.createWOTSWallet(0, 0);
            expect(wallet.getAddress()).toBeDefined();
            expect(wallet.hasSecret()).toBe(true);
        });

        it('should create different wallets for different indices', async () => {
            const wallet1 = await masterSeed.createWOTSWallet(0, 0);
            const wallet2 = await masterSeed.createWOTSWallet(0, 1);
            expect(wallet1.getAddress()).not.toEqual(wallet2.getAddress());
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