import { vi, describe, it, beforeEach, afterEach, expect } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../../src/redux/slices/walletSlice';
import accountReducer from '../../src/redux/slices/accountSlice';
import networkReducer from '../../src/redux/slices/networkSlice';
import transactionReducer from '../../src/redux/slices/transactionSlice';
import { createWalletAction, lockWalletAction, unlockWalletAction, createAccountAction, importFromMcmFileAction, importAccountsFromMcmAction } from '../../src/redux/actions/walletActions';
import { renameAccountAction, reorderAccountsAction } from '../../src/redux/actions/accountActions';
import { SessionManager } from '../../src/redux/context/SessionContext';
import { NetworkProvider } from '../../src/redux/context/NetworkContext';
import { StorageProvider } from '../../src/redux/context/StorageContext';
import { MockStorage } from '../mocks/MockStorage';
import { AppStore } from '../../src/redux/store';
import fs from 'fs/promises';
import path from 'path';
import { MCMDecoder } from '../../src/crypto/mcmDecoder';

// Set longer timeout for all tests in this file
vi.setConfig({ testTimeout: 60000 }); // 60 seconds

describe('Wallet Integration', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    let testPassword = 'testPassword123';

    const mockNetworkService = {
        activateTag: vi.fn().mockResolvedValue({ status: 'success' }),
        resolveTag: vi.fn().mockImplementation(async () => ({
            addressConsensus: '0'.repeat(64),
            balanceConsensus: '1000000',
            status: 'success'
        })),
        pushTransaction: vi.fn(),
        getNetworkStatus: vi.fn().mockReturnValue('connected')
    };

    beforeEach(() => {
        // Setup mock storage
        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);

        // Setup mock network
        NetworkProvider.setNetwork(mockNetworkService);

        // Create store
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer,
                network: networkReducer,
                transaction: transactionReducer
            }
        });
        testPassword = 'testPassword123';

    });

    afterEach(() => {
        vi.clearAllMocks();
        mockStorage.clear();
    });

    describe('Wallet Lifecycle', () => {
        it('should handle complete wallet lifecycle with accounts', async () => {
            // 1. Create wallet
            await store.dispatch(createWalletAction({ password: testPassword }));
            
            // 2. Unlock wallet before creating accounts
            await store.dispatch(unlockWalletAction(testPassword));
            
            // 3. Create 5 accounts
            for (let i = 0; i < 5; i++) {
                await store.dispatch(createAccountAction(`Account ${i + 1}`));
            }

            // Verify accounts were created
            let state = store.getState();
            expect(Object.keys(state.accounts.accounts)).toHaveLength(5);
            expect(state.wallet.highestAccountIndex).toBe(4);

            // 4. Lock wallet
            await store.dispatch(lockWalletAction());
            state = store.getState();
            expect(state.wallet.locked).toBe(true);

            // 5. Create new store to simulate app restart
            store = configureStore({
                reducer: {
                    wallet: walletReducer,
                    accounts: accountReducer,
                    network: networkReducer,
                    transaction: transactionReducer
                }
            });

            // 6. Unlock and verify accounts are loaded
            await store.dispatch(unlockWalletAction(testPassword));
            state = store.getState();
            expect(Object.keys(state.accounts.accounts)).toHaveLength(5);
            expect(state.wallet.highestAccountIndex).toBe(4);
            expect(state.wallet.locked).toBe(false);

            // 7. Verify account details
            const accounts = Object.values(state.accounts.accounts);
            accounts.forEach((account, i) => {
                expect(account.name).toBe(`Account ${i + 1}`);
                expect(account.type).toBe('standard');
                expect(account.tag).toBeDefined();
                expect(account.faddress).toBeDefined();
                expect(account.seed).toBeDefined(); 
            });
        });

        it('should properly set wallet state after creation', async () => {
            await store.dispatch(createWalletAction({ password: testPassword }));
            
            const state = store.getState();
            expect(state.wallet).toEqual({
                hasWallet: true,
                initialized: true,
                locked: true, // Wallet is locked after creation
                error: null,
                network: 'mainnet',
                highestAccountIndex: -1,
                activeAccount: null
            });
        });

        it('should handle account renaming', async () => {
            // 1. Create and unlock wallet
            await store.dispatch(createWalletAction({ password: testPassword }));
            await store.dispatch(unlockWalletAction(testPassword));
            
            // Create 3 accounts
            for (let i = 0; i < 3; i++) {
                await store.dispatch(createAccountAction(`Account ${i + 1}`));
            }

            let state = store.getState();
            const accounts = Object.values(state.accounts.accounts);
            const accountsToRename = accounts.slice(0, 2); // Get first two accounts

            // 2. Rename accounts and verify
            for (const account of accountsToRename) {
                await store.dispatch(renameAccountAction(account.tag, `Renamed ${account.name}`));
            }

            // Verify renames
            state = store.getState();
            const renamedAccounts = Object.values(state.accounts.accounts);
            
            // First two should be renamed
            expect(renamedAccounts[0].name).toBe('Renamed Account 1');
            expect(renamedAccounts[1].name).toBe('Renamed Account 2');
            // Third should be unchanged
            expect(renamedAccounts[2].name).toBe('Account 3');

            // 3. Verify persistence through lock/unlock cycle
            await store.dispatch(lockWalletAction());
            await store.dispatch(unlockWalletAction(testPassword));

            state = store.getState();
            const persistedAccounts = Object.values(state.accounts.accounts);
            expect(persistedAccounts[0].name).toBe('Renamed Account 1');
            expect(persistedAccounts[1].name).toBe('Renamed Account 2');
            expect(persistedAccounts[2].name).toBe('Account 3');

            // 4. Try to rename non-existent account
            await expect(
                store.dispatch(renameAccountAction('non-existent-tag', 'Should Fail'))
            ).rejects.toThrow();
        });

        it('should handle account reordering', async () => {
            // 1. Create and unlock wallet
            await store.dispatch(createWalletAction({ password: testPassword }));
            await store.dispatch(unlockWalletAction(testPassword));
            
            // Create 3 accounts
            for (let i = 0; i < 3; i++) {
                await store.dispatch(createAccountAction(`Account ${i + 1}`));
            }

            let state = store.getState();
            const originalAccounts = Object.values(state.accounts.accounts);
            
            // Store original indexes and tags
            const originalOrder = originalAccounts.map(account => ({
                tag: account.tag,
                index: account.index,
                name: account.name,
                order: account.order
            }));

            // 2. Reorder accounts (move last account to first position)
            await store.dispatch(reorderAccountsAction({
                [originalOrder[2].tag]: 0,  // Last account to first
                [originalOrder[0].tag]: 1,  // First account to second
                [originalOrder[1].tag]: 2   // Middle account to last
            }));

            // 3. Verify new order but same indexes
            state = store.getState();
            const reorderedAccounts = Object.values(state.accounts.accounts)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // Sort by order property

            // Check new order
            expect(reorderedAccounts[0].tag).toBe(originalOrder[2].tag);
            expect(reorderedAccounts[1].tag).toBe(originalOrder[0].tag);
            expect(reorderedAccounts[2].tag).toBe(originalOrder[1].tag);

            // Verify indexes remained unchanged
            reorderedAccounts.forEach(account => {
                const original = originalOrder.find(a => a.tag === account.tag);
                expect(account.index).toBe(original?.index);
            });

            // 4. Verify persistence through lock/unlock
            await store.dispatch(lockWalletAction());
            await store.dispatch(unlockWalletAction(testPassword));

            state = store.getState();
            const persistedAccounts = Object.values(state.accounts.accounts)
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0)); // Sort by order property
            
            // Check order persisted
            expect(persistedAccounts[0].tag).toBe(originalOrder[2].tag);
            expect(persistedAccounts[1].tag).toBe(originalOrder[0].tag);
            expect(persistedAccounts[2].tag).toBe(originalOrder[1].tag);

            // 5. Try invalid reordering (missing account)
            await expect(
                store.dispatch(reorderAccountsAction({
                    [originalOrder[0].tag]: 1,
                    [originalOrder[1].tag]: 2
                    // Missing one account
                }))
            ).rejects.toThrow();
        });

        it('should import wallet from MCM file', async () => {
            const mcmPassword = 'kandokando'; // MCM file password
            
            // 1. Read MCM file from fixtures
            const mcmPath = path.join(__dirname, '../fixtures/test.mcm');
            const mcmData = await fs.readFile(mcmPath);
            const decoded = await MCMDecoder.decode(mcmData, mcmPassword);
            // 2. Import wallet using MCM password
            const result = await store.dispatch(importFromMcmFileAction({
                mcmData: decoded,
                password: mcmPassword
            })).unwrap();



            // 3. Verify wallet was imported
            let state = store.getState();
            expect(state.wallet.hasWallet).toBe(true);
            expect(state.wallet.initialized).toBe(true);
            expect(state.wallet.locked).toBe(false);

            // 4. Verify imported accounts
            const accounts = Object.values(state.accounts.accounts);
            expect(accounts).toHaveLength(3);

            // 5. Verify specific account details from the MCM
            const mainAccount = accounts.find(a => a.name === 'acc1');
            expect(mainAccount).toBeDefined();
            expect(mainAccount?.type).toBe('standard');
            expect(mainAccount?.tag).toBe('0180d3413d6f6c82047831da');

            // Log stored master seed before lock
            const storage = StorageProvider.getStorage();
            const storedSeed = await storage.loadMasterSeed();
            // console.log('Stored master seed before lock:', storedSeed);

            // 6. Test lock/unlock with same MCM password
            await store.dispatch(lockWalletAction());
            state = store.getState();
            expect(state.wallet.locked).toBe(true);

            // Log stored master seed before unlock
            const storedSeedBeforeUnlock = await storage.loadMasterSeed();
            // console.log('Stored master seed before unlock:', storedSeedBeforeUnlock);

            await store.dispatch(unlockWalletAction(mcmPassword));
            state = store.getState();
            expect(state.wallet.locked).toBe(false);

            // 7. Verify accounts persist after unlock
            const persistedAccounts = Object.values(state.accounts.accounts);
            expect(persistedAccounts).toHaveLength(3);
            expect(persistedAccounts.find(a => a.name === 'acc1')).toBeDefined();
        });

        it('should import filtered accounts from MCM file', async () => {
            const mcmPassword = 'kandokando';
            const mcmPath = path.join(__dirname, '../fixtures/test.mcm');
            const mcmData = await fs.readFile(mcmPath);
            const decoded = await MCMDecoder.decode(mcmData, mcmPassword);
            // console.log('Decoded MCM data len:', decoded.entries.length);
            // Test importing specific indices
            const indexResult = await store.dispatch(importFromMcmFileAction({
                mcmData: decoded,
                password: mcmPassword,
                accountFilter: (index, seed, name) => [0, 1].includes(index)
            })).unwrap()

            expect(indexResult.importedCount).toBe(2);
            let accounts = Object.values(store.getState().accounts.accounts);
            expect(accounts).toHaveLength(2);

            // Clear state for next test
            await store.dispatch(lockWalletAction());
            const storage = StorageProvider.getStorage();
            await storage.clear();

            // Test importing by name
            const nameResult = await store.dispatch(importFromMcmFileAction({
                mcmData: decoded,
                password: mcmPassword,
                accountFilter: (index, seed, name) => ['acc1', 'acc2'].includes(name)
            })).unwrap()

            expect(nameResult.importedCount).toBe(3);
            accounts = Object.values(store.getState().accounts.accounts);
            expect(accounts).toHaveLength(3);
            expect(accounts.find(a => a.name === 'acc1')).toBeDefined();
            expect(accounts.find(a => a.name === 'acc2')).toBeDefined();

            // Test error on no matches
            await expect(
                store.dispatch(importFromMcmFileAction({
                    mcmData: decoded,
                    password: mcmPassword,
                    accountFilter: (index, seed, name) => ['nonexistent'].includes(name)
                })).unwrap()
            ).rejects.toThrow('No accounts matched the filter criteria');
        });

        it('should import accounts from MCM file into existing wallet', async () => {
            // 1. First create a wallet with some accounts
            await store.dispatch(createWalletAction({ password: testPassword }));
            await store.dispatch(unlockWalletAction(testPassword));
            await store.dispatch(createAccountAction('Original Account 1'));
            await store.dispatch(createAccountAction('Original Account 2'));
            // Verify initial state
            let state = store.getState();
            expect(Object.keys(state.accounts.accounts)).toHaveLength(2);

            // 2. Import accounts from MCM
            const mcmPassword = 'kandokando';
            const mcmPath = path.join(__dirname, '../fixtures/test.mcm');
            const mcmData = await fs.readFile(mcmPath);
            const decoded = await MCMDecoder.decode(mcmData, mcmPassword);  
            // console.log('Decoded MCM data len:', decoded.entries.length);
            // Import specific accounts
            const result = await store.dispatch(importAccountsFromMcmAction({
                mcmData: decoded,
                source: 'mcm',
                accountFilter: (index, seed, name) => [0, 1].includes(index)
            })).unwrap()

            // 3. Verify imports
            expect(result.importedCount).toBe(2);
            state = store.getState();
            const accounts = Object.values(state.accounts.accounts);
            
            // Should have original + imported accounts
            expect(accounts).toHaveLength(4);
            
            // Verify original accounts still exist
            expect(accounts.find(a => a.name === 'Original Account 1')).toBeDefined();
            expect(accounts.find(a => a.name === 'Original Account 2')).toBeDefined();
            
            // Verify imported accounts
            expect(accounts.find(a => a.name === 'acc1')).toBeDefined();
            expect(accounts.find(a => a.name === 'acc2')).toBeDefined();

            expect(accounts.find(a => a.name === 'acc1')?.wotsIndex).toBe(-1);
            expect(accounts.find(a => a.name === 'acc2')?.wotsIndex).toBe(-1);
            // 4. Verify account orders are sequential
            const indices = accounts.map(a => a.order).sort((a, b) => (a ?? 0) - (b ?? 0));
            expect(indices).toEqual([0, 1, 2, 3]);

            // 5. Verify persistence through lock/unlock
            await store.dispatch(lockWalletAction());
            await store.dispatch(unlockWalletAction(testPassword));

            state = store.getState();
            const persistedAccounts = Object.values(state.accounts.accounts);
            expect(persistedAccounts).toHaveLength(4);
        });
    });
}); 