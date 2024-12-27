import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExtensionStorage } from '../../../src/storage/ExtensionStorage';
import type { StorageAPI } from '../../../src/types/storage';

// Create mock storage area with proper types
const createMockStorageArea = () => ({
    get: vi.fn<any, Promise<any>>(),
    set: vi.fn<any, Promise<void>>(),
    remove: vi.fn<any, Promise<void>>()
});

// Mock storage API with required structure
const mockStorage: StorageAPI = {
    sync: createMockStorageArea(),
    local: createMockStorageArea(),
    onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn()
    }
};

// Setup mocks
(global as any).browser = { storage: mockStorage };
(global as any).chrome = { storage: mockStorage };

describe('ExtensionStorage', () => {
    let storage: ExtensionStorage;
    
    beforeEach(() => {
        vi.clearAllMocks();
        storage = new ExtensionStorage('test_');
    });

    describe('master seed', () => {
        it('should save and load master seed', async () => {
            const testData = {
                data: 'encrypted',
                iv: 'test-iv',
                salt: 'test-salt'
            };

            // Mock storage.get response
            const mockGet = mockStorage.sync.get as jest.MockedFunction<typeof mockStorage.sync.get>;
            mockGet.mockResolvedValue({
                'test_master_seed': testData
            });

            await storage.saveMasterSeed(testData);
            const loaded = await storage.loadMasterSeed();

            expect(mockStorage.sync.set).toHaveBeenCalledWith({
                'test_master_seed': testData
            });
            expect(loaded).toEqual(testData);
        });

        it('should return null when no master seed exists', async () => {
            const mockGet = mockStorage.sync.get as jest.MockedFunction<typeof mockStorage.sync.get>;
            mockGet.mockResolvedValue({});
            
            const loaded = await storage.loadMasterSeed();
            expect(loaded).toBeNull();
        });
    });

    describe('accounts', () => {
        it('should save and load accounts', async () => {
            const account = {
                name: 'Test Account',
                index: 0,
                tag: 'test-tag',
                wotsIndex: 0
            };

            const mockGet = mockStorage.sync.get as jest.MockedFunction<typeof mockStorage.sync.get>;
            
            // Mock initial empty state
            mockGet.mockResolvedValueOnce({
                'test_accounts': []
            });

            // Mock storage after save
            mockGet.mockResolvedValueOnce({
                'test_accounts': [account]
            });

            await storage.saveAccount(account);
            const loaded = await storage.loadAccounts();

            expect(mockStorage.sync.set).toHaveBeenCalledWith({
                'test_accounts': [account]
            });
            expect(loaded).toEqual([account]);
        });
    });

    describe('clear', () => {
        it('should clear all data', async () => {
            await storage.clear();

            expect(mockStorage.sync.remove).toHaveBeenCalledWith([
                'test_master_seed',
                'test_accounts',
                'test_active_account'
            ]);
        });
    });
}); 