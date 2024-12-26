import { describe, it, expect, beforeEach } from 'vitest';
import { LocalStorage } from '../../../src/storage/LocalStorage';
import { EncryptedData } from '../../../src/crypto/encryption';
import { AccountData } from '../../../src/types/account';

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
            const account: AccountData = {
                name: 'Test Account',
                index: 0,
                tag: 'test-tag',
                nextWotsIndex: 0
            };

            await storage.saveAccount(account);
            const loaded = await storage.loadAccounts();

            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(account);
        });

        it('should update existing account', async () => {
            const account: AccountData = {
                name: 'Test Account',
                index: 0,
                tag: 'test-tag',
                nextWotsIndex: 0
            };

            await storage.saveAccount(account);
            await storage.saveAccount({
                ...account,
                nextWotsIndex: 1
            });

            const loaded = await storage.loadAccounts();
            expect(loaded).toHaveLength(1);
            expect(loaded[0].nextWotsIndex).toBe(1);
        });

        it('should handle multiple accounts', async () => {
            const accounts: AccountData[] = [
                {
                    name: 'Account 1',
                    index: 0,
                    tag: 'tag-1',
                    nextWotsIndex: 0
                },
                {
                    name: 'Account 2',
                    index: 1,
                    tag: 'tag-2',
                    nextWotsIndex: 0
                }
            ];

            for (const account of accounts) {
                await storage.saveAccount(account);
            }

            const loaded = await storage.loadAccounts();
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
                nextWotsIndex: 0
            });

            // Clear it
            await storage.clear();

            // Verify it's gone
            expect(await storage.loadMasterSeed()).toBeNull();
            expect(await storage.loadAccounts()).toEqual([]);
        });
    });
}); 