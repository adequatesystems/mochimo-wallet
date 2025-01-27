import { vi, describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { createWalletAction, lockWalletAction, unlockWalletAction, exportWalletJSONAction, loadWalletJSONAction } from '../../../../src/redux/actions/walletActions';
import { SessionManager } from '../../../../src/redux/context/SessionContext';
import { MasterSeed } from '../../../../src/core/MasterSeed';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { MockStorage } from '../../../mocks/MockStorage';
import { AppStore } from '../../../../src/redux/store';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
import { Account } from '../../../../src/types';

describe('Wallet Actions', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    const testPassword = 'test-password';

    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer,
                transaction: transactionReducer,
                accounts: accountReducer   
            },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        });

        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);
        SessionManager.getInstance()
        mockStorage.clear();
    });

    it('should create a wallet successfully', async () => {
        const mockMasterSeed = await MasterSeed.create();
        vi.spyOn(MasterSeed, 'create').mockResolvedValue(mockMasterSeed);

        const result = await store.dispatch(createWalletAction({ password: 'password' }));
        expect(result.type).toBe('wallet/create/fulfilled');

        const state = store.getState().wallet;
        expect(state.hasWallet).toBe(true);
        expect(state.initialized).toBe(true);
        expect(state.locked).toBe(true);
        expect(state.error).toBeNull();
    });

    it('should handle creation errors', async () => {
        const error = new Error('Creation failed');
        vi.spyOn(MasterSeed, 'create').mockRejectedValueOnce(error);

        await store.dispatch(createWalletAction({ password: 'password' }));
        const state = store.getState().wallet;
        expect(state.error).toBe('Failed to create wallet');
    });

    it('should unlock wallet successfully', async () => {
        //create wallet
        await store.dispatch(createWalletAction({ password: 'password' }));
        //should not throw error
        
        await store.dispatch(unlockWalletAction('password'));

        const state = store.getState().wallet;
        expect(state.locked).toBe(false);
        expect(state.error).toBeNull();
    });

    it('should handle lock errors', async () => {
        vi.spyOn(SessionManager.getInstance(), 'lock').mockRejectedValue(new Error('Lock failed'));
        await store.dispatch(lockWalletAction());
        const state = store.getState().wallet;
        expect(state.error).toBe('Failed to lock wallet');
    });

    describe('wallet JSON export/import', () => {
        it('should export and import wallet JSON correctly', async () => {
            // Create and unlock wallet first
            await store.dispatch(createWalletAction({ password: testPassword }));
            const session = SessionManager.getInstance();
            await session.unlock(testPassword, mockStorage);

            // Create some test accounts
            const accounts: Account[] = [
                {
                    name: 'Test Account 1',
                    type: 'standard',
                    balance: '0',
                    tag: '0000000001',
                    index: 0,
                    wotsIndex: -1,
                    seed: '1234567890',
                    faddress: '0000000001'
                },
                {
                    name: 'Test Account 2',
                    type: 'standard',
                    balance: '0',
                    tag: '0000000002',
                    index: 1,
                    wotsIndex: -1,
                    seed: '0987654321',
                    faddress: '0000000002'
                }
            ];

            // Add accounts to store
            for (const account of accounts) {
                await mockStorage.saveAccount(account, session.getStorageKey());
            }

            // Export wallet to JSON
            const exportedJSON = await store.dispatch(exportWalletJSONAction(testPassword));
            expect(exportedJSON).toBeDefined();
            expect(exportedJSON.version).toBe('1.0.0');
            expect(exportedJSON.accounts).toBeDefined();
            expect(exportedJSON.encrypted).toBeDefined();

            // Clear storage and state
            await mockStorage.clear();
            store = configureStore({
                reducer: {
                    wallet: walletReducer,
                    accounts: accountReducer,
                    network: networkReducer,
                    transaction: transactionReducer
                }
            });

            // Import wallet from JSON
            await store.dispatch(loadWalletJSONAction(exportedJSON, testPassword));

            // Verify imported state
            const state = store.getState();
            expect(state.wallet.hasWallet).toBe(true);
            expect(state.wallet.locked).toBe(false);
            expect(state.wallet.initialized).toBe(true);

            // Verify accounts were imported correctly
            const importedAccounts = state.accounts.accounts;
            expect(Object.keys(importedAccounts).length).toBe(accounts.length);

            // Verify account details
            for (const account of accounts) {
                const importedAccount = importedAccounts[account.tag];
                expect(importedAccount).toBeDefined();
                expect(importedAccount.name).toBe(account.name);
                expect(importedAccount.seed).toBe(account.seed);
                expect(importedAccount.tag).toBe(account.tag);
            }

            // Verify storage
            const storedAccounts = await mockStorage.loadAccounts(session.getStorageKey());
            expect(storedAccounts.length).toBe(accounts.length);
        });

        it('should handle export errors', async () => {
            // Test export without initialized wallet
            await expect(async () => {
                await store.dispatch(exportWalletJSONAction(testPassword));
            }).rejects.toThrow('Wallet not initialized');

            const state = store.getState();
            expect(state.wallet.error).toBe('Failed to export wallet');
        });

        it('should handle import errors', async () => {
            const invalidJSON = {
                version: '1.0.0',
                timestamp: Date.now(),
                encrypted: { data: 'invalid', iv: 'invalid', salt: 'invalid' },
                accounts: {},
                storageKey: new Uint8Array(32)
            };

            await expect(
                store.dispatch(loadWalletJSONAction(invalidJSON, testPassword))
            ).rejects.toThrow();

            const state = store.getState();
            expect(state.wallet.error).toBe('Failed to load wallet from JSON');
        });
    });
}); 