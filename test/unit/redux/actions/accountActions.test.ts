import { vi, describe, it, expect, beforeEach } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';

import { MasterSeed } from '../../../../src/core/MasterSeed';
import { SessionManager } from '../../../../src/redux/context/SessionContext';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { AppStore } from '../../../../src/redux/store';
import { Account } from '../../../../src/types';
import { MockStorage } from '../../../mocks/MockStorage';
import { renameAccountAction, updateAccountAction, reorderAccountsAction, deleteAccountAction } from '../../../../src/redux/actions/accountActions';
import { createWalletAction } from '../../../../src/redux/actions/walletActions';

import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
import { bulkAddAccounts } from '../../../../src/redux/slices/accountSlice';

describe('Account Actions', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    const testPassword = 'test-password';

    beforeEach(() => {
        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer,
                network: networkReducer,
                transaction: transactionReducer
            }
        });
    });

    async function setupWalletWithAccounts(numAccounts: number = 1): Promise<Account[]> {
        // 1. Create wallet and get master seed
        await store.dispatch(createWalletAction({ password: testPassword }));
        const masterSeed = await MasterSeed.create();
        const encrypted = await masterSeed.export(testPassword);
        await mockStorage.saveMasterSeed(encrypted);

        // 2. Set up session
        const session = SessionManager.getInstance();
        session.setMasterSeed(masterSeed);

        // 3. Create test accounts
        const accounts: Account[] = Array.from({ length: numAccounts }, (_, i) => ({
            name: `Test Account ${i + 1}`,
            type: 'standard',
            faddress: '0'.repeat(64),
            balance: '0',
            index: i,
            tag: `${i}`.padStart(24, '0'),
            source: 'mnemonic',
            wotsIndex: 0,
            seed: '1'.repeat(64),
            order: i
        }));

        // 4. Save accounts to storage
        await Promise.all([
            ...accounts.map(account => mockStorage.saveAccount(account, SessionManager.getInstance().getStorageKey())),
            mockStorage.saveHighestIndex(accounts.length - 1)
        ]);

        // 5. Update store state using proper action creator
        const accountsMap = accounts.reduce((acc, account) => {
            acc[account.tag] = account;
            return acc;
        }, {} as Record<string, Account>);

        store.dispatch(bulkAddAccounts(accountsMap));

        // 6. Set wallet state
        store.dispatch({ type: 'wallet/setHasWallet', payload: true });
        store.dispatch({ type: 'wallet/setInitialized', payload: true });
        store.dispatch({ type: 'wallet/setLocked', payload: false });
        store.dispatch({ type: 'wallet/setHighestIndex', payload: accounts.length - 1 });

        // Verify accounts were added
        const state = store.getState();
        if (!state.accounts.accounts[accounts[0].tag]) {
            console.error('Store state:', state);
            throw new Error('Failed to add accounts to store');
        }

        return accounts;
    }

    describe('renameAccountAction', () => {
        it('should rename an existing account', async () => {
            const [account] = await setupWalletWithAccounts();
            const newName = 'Renamed Account';

            await store.dispatch(renameAccountAction(account.tag, newName));

            const state = store.getState();
            expect(state.accounts.accounts[account.tag].name).toBe(newName);
        });

        it('should fail for non-existent account', async () => {
            await setupWalletWithAccounts();
            await expect(
                store.dispatch(renameAccountAction('nonexistent', 'New Name'))
            ).rejects.toThrow();
        });
    });

    describe('updateAccountAction', () => {
        it('should update account fields', async () => {
            const [account] = await setupWalletWithAccounts();
            const updates = {
                balance: '1000',
                wotsIndex: 1
            };

            await store.dispatch(updateAccountAction(account.tag, updates));

            const state = store.getState();
            expect(state.accounts.accounts[account.tag].balance).toBe('1000');
            expect(state.accounts.accounts[account.tag].wotsIndex).toBe(1);
        });

        it('should fail for non-existent account', async () => {
            await setupWalletWithAccounts();
            await expect(
                store.dispatch(updateAccountAction('nonexistent', { balance: '1000' }))
            ).rejects.toThrow();
        });
    });

    describe('reorderAccountsAction', () => {
        it('should reorder accounts', async () => {
            const accounts = await setupWalletWithAccounts(3);
            const newOrder = {
                [accounts[0].tag]: 2,
                [accounts[1].tag]: 0,
                [accounts[2].tag]: 1
            };

            await store.dispatch(reorderAccountsAction(newOrder));

            const state = store.getState();
            expect(state.accounts.accounts[accounts[0].tag].order).toBe(2);
            expect(state.accounts.accounts[accounts[1].tag].order).toBe(0);
            expect(state.accounts.accounts[accounts[2].tag].order).toBe(1);
        });

        it('should fail if not all accounts are included', async () => {
            const accounts = await setupWalletWithAccounts(3);
            const incompleteOrder = {
                [accounts[0].tag]: 0,
                [accounts[1].tag]: 1
            };

            await expect(
                store.dispatch(reorderAccountsAction(incompleteOrder))
            ).rejects.toThrow();
        });
    });

    describe('deleteAccountAction', () => {
        it('should delete an account', async () => {
            const accounts = await setupWalletWithAccounts(2);
            await store.dispatch(deleteAccountAction(accounts[1].tag));

            const state = store.getState();
            expect(state.accounts.accounts[accounts[1].tag]).toBeDefined();
            expect(state.accounts.accounts[accounts[1].tag].isDeleted).toBe(true);
            expect(Object.keys(state.accounts.accounts)).toHaveLength(2);
            await mockStorage.loadAccount(accounts[1].tag, SessionManager.getInstance().getStorageKey()).then(account => {
                expect(account?.isDeleted).toBe(true);
            });
        });

        it('should not allow deleting the last account', async () => {
            const [account] = await setupWalletWithAccounts();
            const result = await store.dispatch(deleteAccountAction(account.tag));
            expect(result.type).toBe('accounts/delete/rejected');
        });

        it('should fail for non-existent account', async () => {
            await setupWalletWithAccounts();
            const result = await store.dispatch(deleteAccountAction('nonexistent'));
            expect(result.type).toBe('accounts/delete/rejected');
        });
    });
}); 
