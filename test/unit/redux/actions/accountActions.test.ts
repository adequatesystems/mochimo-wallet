import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../mocks/MockStorage';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import {
    updateAccountAction,
    updateAccountWOTSAction,
    importMCMAccountAction,
    bulkImportMCMAccountsAction,
    renameAccountAction
} from '../../../../src/redux/actions/accountActions';
import { createWalletAction, unlockWalletAction, createAccountAction } from '../../../../src/redux/actions/walletActions';

describe('Account Actions', () => {
    let store: any;
    let mockStorage: MockStorage;
    const testPassword = 'testpassword';

    beforeEach(() => {
        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);
        
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer
            }
        });
    });

    // Helper function to setup wallet with an account
    async function setupWalletWithAccount(accountName = 'Test Account') {
        await store.dispatch(createWalletAction(testPassword));
        await store.dispatch(unlockWalletAction(testPassword));
        return await store.dispatch(createAccountAction(accountName));
    }

    describe('renameAccountAction', () => {
        it('should rename an existing account', async () => {
            const account = await setupWalletWithAccount();
            const newName = 'Renamed Account';

            await store.dispatch(renameAccountAction(account.tag, newName));

            // Check Redux state
            const state = store.getState();
            expect(state.accounts.accounts[account.tag].name).toBe(newName);

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            const storedAccount = storedAccounts.find(a => a.tag === account.tag);
            expect(storedAccount?.name).toBe(newName);
        });

        it('should fail for non-existent account', async () => {
            await setupWalletWithAccount();
            
            await expect(
                store.dispatch(renameAccountAction('invalid-tag', 'New Name'))
            ).rejects.toThrow('Account not found');
        });
    });

    describe('updateAccountWOTSAction', () => {
        it('should update WOTS key for MCM account', async () => {
            await setupWalletWithAccount(); // Setup wallet first

            // Import MCM account first
            const mcmAccount = {
                name: 'MCM Account',
                address: '0'.repeat(64),
                seed: '1'.repeat(64),
                tag: 'a'.repeat(24),
                wotsIndex: 0
            };

            await store.dispatch(importMCMAccountAction(
                mcmAccount.name,
                mcmAccount.address,
                mcmAccount.seed,
                mcmAccount.tag,
                mcmAccount.wotsIndex
            ));

            // Update WOTS key
            await store.dispatch(updateAccountWOTSAction(mcmAccount.tag));

            // Check state
            const state = store.getState();
            const updatedAccount = state.accounts.accounts[mcmAccount.tag];
            expect(updatedAccount.wotsIndex).toBe(1);
            expect(updatedAccount.address).not.toBe(mcmAccount.address);

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            const storedAccount = storedAccounts.find(a => a.tag === mcmAccount.tag);
            expect(storedAccount?.wotsIndex).toBe(1);
            expect(storedAccount?.address).toBe(updatedAccount.address);
        });

        it('should not update non-MCM accounts', async () => {
            const account = await setupWalletWithAccount();
            const originalAddress = account.address;

            await store.dispatch(updateAccountWOTSAction(account.tag));

            const state = store.getState();
            expect(state.accounts.accounts[account.tag].address).toBe(originalAddress);
        });
    });

    describe('importMCMAccountAction', () => {
        it('should import single MCM account', async () => {
            await setupWalletWithAccount(); // Setup wallet first

            const mcmAccount = {
                name: 'MCM Account',
                address: '0'.repeat(64),
                seed: '1'.repeat(64),
                tag: '2'.repeat(24),
                wotsIndex: 0
            };

            await store.dispatch(importMCMAccountAction(
                mcmAccount.name,
                mcmAccount.address,
                mcmAccount.seed,
                mcmAccount.tag,
                mcmAccount.wotsIndex
            ));

            // Check state
            const state = store.getState();
            const importedAccount = state.accounts.accounts[mcmAccount.tag];
            expect(importedAccount).toBeTruthy();
            expect(importedAccount.type).toBe('imported');
            expect(importedAccount.source).toBe('mcm');
            expect(importedAccount.seed).toBe(mcmAccount.seed);

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            const storedAccount = storedAccounts.find(a => a.tag === mcmAccount.tag);
            expect(storedAccount).toBeTruthy();
            expect(storedAccount?.seed).toBe(mcmAccount.seed);
        });
    });

    describe('bulkImportMCMAccountsAction', () => {
        it('should import multiple MCM accounts', async () => {
            await setupWalletWithAccount(); // Setup wallet first

            const mcmAccounts = [
                {
                    name: 'MCM 1',
                    address: '0'.repeat(64),
                    seed: '1'.repeat(64),
                    tag: '2'.repeat(24),
                    wotsIndex: 0
                },
                {
                    name: 'MCM 2',
                    address: '3'.repeat(64),
                    seed: '4'.repeat(64),
                    tag: '5'.repeat(24),
                    wotsIndex: 0
                }
            ];

            await store.dispatch(bulkImportMCMAccountsAction(mcmAccounts));

            // Check state
            const state = store.getState();
            mcmAccounts.forEach(mcm => {
                const importedAccount = state.accounts.accounts[mcm.tag];
                expect(importedAccount).toBeTruthy();
                expect(importedAccount.type).toBe('imported');
                expect(importedAccount.source).toBe('mcm');
                expect(importedAccount.seed).toBe(mcm.seed);
            });

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            mcmAccounts.forEach(mcm => {
                const stored = storedAccounts.find(a => a.tag === mcm.tag);
                expect(stored).toBeTruthy();
                expect(stored?.seed).toBe(mcm.seed);
            });
        });

        it('should maintain correct order for imported accounts', async () => {
            const baseAccount = await setupWalletWithAccount(); // Setup wallet first

            const mcmAccounts = Array(3).fill(0).map((_, i) => ({
                name: `MCM ${i}`,
                address: i.toString().repeat(64),
                seed: i.toString().repeat(64),
                tag: i.toString().repeat(24),
                wotsIndex: 0
            }));

            await store.dispatch(bulkImportMCMAccountsAction(mcmAccounts));

            const state = store.getState();
            const accounts = Object.values(state.accounts.accounts)
                .sort((a, b) => (a.order || 0) - (b.order || 0));
            
            // First account should be the base account
            expect(accounts[0].tag).toBe(baseAccount.tag);
            
            // Check that imported accounts have sequential orders
            mcmAccounts.forEach((_, i) => {
                expect(accounts[i + 1].order).toBe(i + 1);
            });
        });
    });
}); 