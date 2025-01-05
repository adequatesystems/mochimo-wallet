import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../mocks/MockStorage';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import type { AppStore, RootState } from '../../../../src/redux/store';
import type { Store, Dispatch, Action } from '@reduxjs/toolkit';
import type { AppDispatch } from '../../../../src/redux/store';

import {
    updateAccountAction,
    updateAccountWOTSAction,
    importMCMAccountAction,
    bulkImportMCMAccountsAction,
    renameAccountAction,
    deleteAccountAction,
    reorderAccountsAction
} from '../../../../src/redux/actions/accountActions';
import { createWalletAction, unlockWalletAction, createAccountAction } from '../../../../src/redux/actions/walletActions';

describe('Account Actions', () => {
    let store: AppStore;
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

    describe('updateAccountAction', () => {
        it('should update account fields', async () => {
            const account = await setupWalletWithAccount();
            const updates = {
                name: 'Updated Name',
                balance: '1000',
                wotsIndex: 1
            };

            await store.dispatch(updateAccountAction(account.tag, updates));

            // Check Redux state
            const state = store.getState();
            const updatedAccount = state.accounts.accounts[account.tag];
            expect(updatedAccount.name).toBe(updates.name);
            expect(updatedAccount.balance).toBe(updates.balance);
            expect(updatedAccount.wotsIndex).toBe(updates.wotsIndex);

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            const storedAccount = storedAccounts.find(a => a.tag === account.tag);
            expect(storedAccount).toMatchObject(updates);
        });

        it('should fail for non-existent account', async () => {
            await expect(
                store.dispatch(updateAccountAction('invalid-tag', { name: 'New Name' }))
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

        it('should handle invalid WOTS index', async () => {
            const mcmAccount = {
                name: 'MCM Account',
                address: '0'.repeat(64),
                seed: '1'.repeat(64),
                tag: 'a'.repeat(24),
                wotsIndex: -1 // Invalid index
            };

            await store.dispatch(importMCMAccountAction(
                mcmAccount.name,
                mcmAccount.address,
                mcmAccount.seed,
                mcmAccount.tag,
                mcmAccount.wotsIndex
            ));

            await expect(
                store.dispatch(updateAccountWOTSAction(mcmAccount.tag))
            ).rejects.toThrow('Invalid wots index');
        });

        it('should handle missing seed', async () => {
            const mcmAccount = {
                name: 'MCM Account',
                address: '0'.repeat(64),
                tag: 'a'.repeat(24),
                wotsIndex: 0,
                seed: '' // Empty seed
            };

            await store.dispatch(importMCMAccountAction(
                mcmAccount.name,
                mcmAccount.address,
                mcmAccount.seed,
                mcmAccount.tag,
                mcmAccount.wotsIndex
            ));

            await expect(
                store.dispatch(updateAccountWOTSAction(mcmAccount.tag))
            ).rejects.toThrow('Invalid account seed');
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

        it('should fail with invalid tag length', async () => {
            const invalidTag = '123'; // Too short
            
            await expect(
                store.dispatch(importMCMAccountAction(
                    'Test',
                    '0'.repeat(64),
                    '1'.repeat(64),
                    invalidTag,
                    0
                ))
            ).rejects.toThrow('Invalid tag length');
        });

        it('should fail with invalid address format', async () => {
            await expect(
                store.dispatch(importMCMAccountAction(
                    'Test',
                    'invalid-address',
                    '1'.repeat(64),
                    'a'.repeat(24),
                    0
                ))
            ).rejects.toThrow('Invalid address format');
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

        it('should handle empty account list', async () => {
            await setupWalletWithAccount();
            await store.dispatch(bulkImportMCMAccountsAction([]));
            
            const state = store.getState();
            expect(Object.keys(state.accounts.accounts).length).toBe(1); // Only base account
        });

        it('should handle duplicate tags', async () => {
            await setupWalletWithAccount();

            const mcmAccounts = [
                {
                    name: 'MCM 1',
                    address: '0'.repeat(64),
                    seed: '1'.repeat(64),
                    tag: 'same-tag'.repeat(4),
                    wotsIndex: 0
                },
                {
                    name: 'MCM 2',
                    address: '3'.repeat(64),
                    seed: '4'.repeat(64),
                    tag: 'same-tag'.repeat(4),
                    wotsIndex: 0
                }
            ];

            await expect(
                store.dispatch(bulkImportMCMAccountsAction(mcmAccounts))
            ).rejects.toThrow('Duplicate account tag');
        });
    });

    describe('deleteAccountAction', () => {
        it('should delete an account', async () => {
            // Setup two accounts so we can delete one
            const account1 = await setupWalletWithAccount('Account 1');
            const account2 = await store.dispatch(createAccountAction('Account 2'));
            
            await store.dispatch(deleteAccountAction(account2.tag));

            // Check Redux state
            const state = store.getState();
            expect(state.accounts.accounts[account2.tag]).toBeUndefined();
            expect(Object.keys(state.accounts.accounts).length).toBe(1);

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            expect(storedAccounts.length).toBe(1);
            expect(storedAccounts[0].tag).toBe(account1.tag);
        });

        it('should not allow deleting the last account', async () => {
            const account = await setupWalletWithAccount();
            
            await expect(
                store.dispatch(deleteAccountAction(account.tag))
            ).rejects.toThrow('Cannot delete last account');
        });

        it('should fail for non-existent account', async () => {
            await setupWalletWithAccount();
            
            await expect(
                store.dispatch(deleteAccountAction('invalid-tag'))
            ).rejects.toThrow('Account not found');
        });
    });

    describe('reorderAccountsAction', () => {
        it('should reorder accounts', async () => {
            // Setup multiple accounts
            const account1 = await setupWalletWithAccount('Account 1');
            const account2 = await store.dispatch(createAccountAction('Account 2'));
            const account3 = await store.dispatch(createAccountAction('Account 3'));

            const newOrder = {
                [account1.tag]: 2,
                [account2.tag]: 0,
                [account3.tag]: 1
            };

            await store.dispatch(reorderAccountsAction(newOrder));

            // Check Redux state
            const state = store.getState();
            expect(state.accounts.accounts[account1.tag].order).toBe(2);
            expect(state.accounts.accounts[account2.tag].order).toBe(0);
            expect(state.accounts.accounts[account3.tag].order).toBe(1);

            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            storedAccounts.forEach(account => {
                expect(account.order).toBe(newOrder[account.tag]);
            });
        });

        it('should fail if not all accounts are included', async () => {
            const account1 = await setupWalletWithAccount('Account 1');
            const account2 = await store.dispatch(createAccountAction('Account 2'));

            const incompleteOrder = {
                [account1.tag]: 0
                // account2 missing
            };

            await expect(
                store.dispatch(reorderAccountsAction(incompleteOrder))
            ).rejects.toThrow('New order must include all accounts');
        });

        it('should fail if order numbers are not unique', async () => {
            const account1 = await setupWalletWithAccount('Account 1');
            const account2 = await store.dispatch(createAccountAction('Account 2'));

            const duplicateOrder = {
                [account1.tag]: 0,
                [account2.tag]: 0  // Duplicate order number
            };

            await expect(
                store.dispatch(reorderAccountsAction(duplicateOrder))
            ).rejects.toThrow('Order numbers must be unique');
        });
    });
}); 