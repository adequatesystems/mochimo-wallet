import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorage } from '../../../src/storage/LocalStorage';
import { EncryptedData } from '../../../src/crypto/webCrypto';
import { Account } from '../../../src/types/account';
const storageKey = new Uint8Array(10).fill(1);
describe('LocalStorage', () => {
    let storage: LocalStorage;
    
    beforeEach(() => {
        localStorage.clear();
        storage = new LocalStorage('test_');
    });

    describe('master seed', () => {
        it('should save and load master seed', async () => {
            const testData: EncryptedData = {
                data: 'encrypted',
                iv: 'test-iv',
                salt: 'test-salt'
            };

            await storage.saveMasterSeed(testData);
            const loaded = await storage.loadMasterSeed();

            expect(loaded).toEqual(testData);
        });

        it('should return null when no master seed exists', async () => {
            const loaded = await storage.loadMasterSeed();
            expect(loaded).toBeNull();
        });
    });

    describe('accounts', () => {
        it('should save and load accounts', async () => {
            const account: Account = {
                name: 'Test Account',
                index: 0,
                tag: 'test-tag',
                type: 'standard',
                balance: '0',
                seed: 'test-seed',
                faddress: 'test-address',
                wotsIndex: 0
            };

            await storage.saveAccount(account, storageKey);
            const loaded = await storage.loadAccounts(storageKey);

            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(account);
        });

        it('should update existing account', async () => {
            const account: Account = {
                name: 'Test Account',
                index: 0,
                tag: 'test-tag',
                type: 'standard',
                balance: '0',
                seed: 'test-seed',
                faddress: 'test-address',
                wotsIndex: 0
            };

            await storage.saveAccount(account, storageKey);
            await storage.saveAccount({
                ...account,
                wotsIndex: 1
            }, storageKey);

            const loaded = await storage.loadAccounts(storageKey);
            expect(loaded).toHaveLength(1);
            expect(loaded[0].wotsIndex).toBe(1);
        });

        it('should handle multiple accounts', async () => {
            const accounts: Account[] = [
                {
                    name: 'Account 1',
                    index: 0,
                    tag: 'tag-1',
                    type: 'standard',
                    balance: '0',
                    seed: 'test-seed',
                    faddress: 'test-address',
                    wotsIndex: 0
                },
                {
                    name: 'Account 2',
                    index: 1,
                    tag: 'tag-2',
                    type: 'standard',
                    balance: '0',
                    seed: 'test-seed',
                    faddress: 'test-address',
                    wotsIndex: 0
                }
            ];

            for (const account of accounts) {
                await storage.saveAccount(account, storageKey);
            }

            const loaded = await storage.loadAccounts(storageKey);
            expect(loaded).toHaveLength(2);
            expect(loaded).toEqual(accounts);
        });
    });

    describe('clear', () => {
        it('should clear all data', async () => {
            // Save some data
            await storage.saveMasterSeed({
                data: 'encrypted',
                iv: 'test-iv',
                salt: 'test-salt'
            });
            await storage.saveAccount({
                name: 'Test',
                index: 0,
                tag: 'test',
                type: 'standard',
                balance: '0',
                seed: 'test-seed',
                faddress: 'test-address',
                wotsIndex: 0
            }, storageKey);

            // Clear it
            await storage.clear();

            // Verify it's gone
            expect(await storage.loadMasterSeed()).toBeNull();
            expect(await storage.loadAccounts(storageKey)).toEqual([]);
        });
    });
}); 