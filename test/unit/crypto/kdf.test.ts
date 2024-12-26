import { describe, it, expect } from 'vitest';
import { WOTSWallet } from 'mochimo-wots-v2';
import { deriveKey, deriveAccountSeed, deriveWotsSeed, deriveAccountTag, createWOTSWallet } from '../../../src/crypto/kdf';
import { generateSeed } from '../../../src/crypto/random';

describe('Key Derivation Functions', () => {
    it('should have access to WOTSWallet', () => {
        expect(WOTSWallet).toBeDefined();
        expect(typeof WOTSWallet.create).toBe('function');
    });

    describe('deriveKey', () => {
        it('should derive consistent keys', async () => {
            const masterSeed = generateSeed();
            const salt = new TextEncoder().encode('test');
            
            const key1 = await deriveKey(masterSeed, 0, { salt, iterations: 1 });
            const key2 = await deriveKey(masterSeed, 0, { salt, iterations: 1 });
            
            expect(key1).toEqual(key2);
        });

        it('should derive different keys for different indices', async () => {
            const masterSeed = generateSeed();
            const salt = new TextEncoder().encode('test');
            
            const key1 = await deriveKey(masterSeed, 0, { salt, iterations: 1 });
            const key2 = await deriveKey(masterSeed, 1, { salt, iterations: 1 });
            
            expect(key1).not.toEqual(key2);
        });
    });

    describe('deriveAccountSeed', () => {
        it('should derive consistent account seeds', async () => {
            const masterSeed = generateSeed();
            const seed1 = await deriveAccountSeed(masterSeed, 0);
            const seed2 = await deriveAccountSeed(masterSeed, 0);
            
            expect(seed1).toEqual(seed2);
            expect(seed1.length).toBe(32);
        });
    });

    describe('deriveWotsSeed', () => {
        it('should derive consistent WOTS seeds', async () => {
            const accountSeed = generateSeed();
            const seed1 = await deriveWotsSeed(accountSeed, 0);
            const seed2 = await deriveWotsSeed(accountSeed, 0);
            
            expect(seed1).toEqual(seed2);
            expect(seed1.length).toBe(32);
        });
    });

    describe('createWOTSWallet', () => {
        it('should create valid WOTS wallet', async () => {
            const masterSeed = generateSeed();
            const wallet = await createWOTSWallet(masterSeed, 0, 0);
            
            // Test that we get a valid WOTS wallet
            expect(wallet.getAddress()).toBeDefined();
            expect(wallet.getTag()).toBeDefined();
            expect(wallet.hasSecret()).toBe(true);
        });

        it('should create different wallets for different WOTS indices', async () => {
            const masterSeed = generateSeed();
            const wallet1 = await createWOTSWallet(masterSeed, 0, 0);
            const wallet2 = await createWOTSWallet(masterSeed, 0, 1);
            
            // Different WOTS indices should produce different addresses
            expect(wallet1.getAddress()).not.toEqual(wallet2.getAddress());
        });

        it('should create different wallets for different account indices', async () => {
            const masterSeed = generateSeed();
            const wallet1 = await createWOTSWallet(masterSeed, 0, 0);
            const wallet2 = await createWOTSWallet(masterSeed, 1, 0);
            
            // Different account indices should produce different addresses
            expect(wallet1.getAddress()).not.toEqual(wallet2.getAddress());
        });
    });
}); 