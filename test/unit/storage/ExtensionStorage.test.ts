import { describe, it, expect, beforeEach } from 'vitest';
import { ExtensionStorage } from '../../../src/storage/ExtensionStorage';
import { EncryptedData } from '../../../src/crypto/webCrypto';
import { Account } from '../../../src/types';
import { vi } from 'vitest';

// Mock storage area implementation
class MockStorageArea {
    private store: { [key: string]: any } = {};

    async get(key?: string): Promise<{ [key: string]: any }> {
        if (!key) {
            return { ...this.store };
        }
        return {
            [key]: this.store[key]
        };
    }

    async set(items: { [key: string]: any }): Promise<void> {
        Object.assign(this.store, items);
    }

    async remove(keys: string | string[]): Promise<void> {
        const keysToRemove = Array.isArray(keys) ? keys : [keys];
        keysToRemove.forEach(key => {
            delete this.store[key];
        });
    }

    // Helper method for tests to clear all data
    clear() {
        this.store = {};
    }
}

// Setup global chrome/browser objects with mock storage
const mockStorageArea = new MockStorageArea();
global.chrome = {
    storage: {
        local: mockStorageArea
    }
} as any;
const storageKey = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);

vi.mock('../../../src/crypto/accountEncryption', () => ({
    encryptAccount: vi.fn().mockImplementation(() => Promise.resolve({
        iv: 'test-iv',
        data: 'encrypted-account-data',
        salt: 'test-salt'
    })),
    decryptAccount: vi.fn().mockImplementation(() => Promise.resolve({
        name: 'Test Account',
        tag: 'test-tag',
        type: 'standard',
        balance: '0',
        wotsIndex: 0,
        seed: 'test-seed',
        faddress: 'test-address'
    }))
}));

describe('ExtensionStorage', () => {
    let storage: ExtensionStorage;

    beforeEach(() => {
        mockStorageArea.clear();
        storage = new ExtensionStorage('test');
    });

    describe('master seed', () => {
        const mockEncryptedData: EncryptedData = {
            iv: 'test-iv',
            data: 'encrypted-data',
            salt: 'test-salt'
        };

        it('should save and load master seed', async () => {
            await storage.saveMasterSeed(mockEncryptedData);

            const loaded = await storage.loadMasterSeed();
            expect(loaded).toEqual(mockEncryptedData);
        });

        it('should return null when no master seed exists', async () => {
            const result = await storage.loadMasterSeed();
            expect(result).toBeNull();
        });
    });

    describe('accounts', () => {
        const mockAccount: Account = {
            name: 'Test Account',
            tag: 'test-tag',
            type: 'standard',
            balance: '0',
            wotsIndex: 0,
            seed: 'test-seed',
            faddress: 'test-address'
        };

        it('should save and load accounts', async () => {
            await storage.saveAccount(mockAccount, storageKey);

            // Get the stored data directly from mock storage
            const storedData = await mockStorageArea.get('test_accounts');
            expect(storedData).toBeDefined();
            expect(storedData['test_accounts']).toBeDefined();
            expect(storedData['test_accounts']).toHaveProperty('test-tag');
            
            // Verify stored encrypted account structure
            const encryptedAccount = storedData['test_accounts']['test-tag'];
            expect(encryptedAccount).toBeDefined();
            expect(encryptedAccount).toEqual({
                tag: 'test-tag',
                encryptedData: {
                    data: expect.any(String),
                    iv: expect.any(String),
                    salt: expect.any(String)
                }
            });

            const loaded = await storage.loadAccounts(storageKey);
            expect(loaded).toBeDefined();
            expect(loaded).toHaveLength(1);
            expect(loaded[0]).toEqual(mockAccount);
        });

        it('should handle undefined storage key', async () => {
            //@ts-ignore
            await expect(storage.saveAccount(mockAccount, undefined))
                .rejects.toThrow();
        });

        it('should handle undefined account', async () => {
            await expect(storage.saveAccount(undefined as any, storageKey))
                .rejects.toThrow();
        });

        it('should return empty array when no accounts exist', async () => {
            const loaded = await storage.loadAccounts(storageKey);
            expect(loaded).toBeDefined();
            expect(loaded).toHaveLength(0);
        });
    });

    describe('clear', () => {
        it('should clear all data', async () => {
            // Setup some test data
            await storage.saveMasterSeed({
                iv: 'test-iv',
                data: 'master-seed-data',
                salt: 'test-salt'
            });
            await storage.saveAccount( {
                name: 'Test',
                tag: 'test-tag',
                type: 'standard',
                balance: '0',
                wotsIndex: 0,
                seed: 'test-seed',
                faddress: 'test-address'
            }, storageKey);

            // Add some unrelated data
            await mockStorageArea.set({
                'other_key': 'should-not-be-removed'
            });

            await storage.clear();

            // Verify only our prefixed data was removed
            const remaining = await mockStorageArea.get();
            expect(remaining).not.toHaveProperty('test_masterSeed');
            expect(remaining).not.toHaveProperty('test_accounts');
            expect(remaining).toHaveProperty('other_key');
        });
    });
}); 