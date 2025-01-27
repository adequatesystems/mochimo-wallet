import { AppThunk, AsyncThunkConfig } from '../store';

import { setError } from '../slices/walletSlice';
import { StorageProvider } from '../context/StorageContext';
import { Account } from '../../types/account';
import { Derivation } from '../utils/derivation';
import { updateAccount, reorderAccounts, removeAccount, bulkAddAccounts, setSelectedAccount } from '../slices/accountSlice';
import { SessionManager } from '../context/SessionContext';
import { createAsyncThunk } from '@reduxjs/toolkit';


// Update account
export const updateAccountAction = (
    id: string,
    updates: Partial<Account>
): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const account = await storage.loadAccount(id, SessionManager.getInstance().getStorageKey());

        if (!account) throw new Error('Account not found');

        const updatedAccount = { ...account, ...updates };
        await storage.saveAccount(updatedAccount, SessionManager.getInstance().getStorageKey());

        dispatch(updateAccount({ id, updates }));
    } catch (error) {
        dispatch(setError('Failed to update account'));
        throw error;
    }
};

// Rename account
export const renameAccountAction = (
    id: string,
    name: string
): AppThunk => async (dispatch) => {
    return dispatch(updateAccountAction(id, { name }));
};

// Update WOTS key
export const updateAccountWOTSAction = (
    accountId: string
): AppThunk => async (dispatch, getState) => {
    try {
        const state = getState();
        const account = state.accounts.accounts[accountId];

        if (!account) throw new Error('Account not found');
        if (!account.seed) throw new Error('Invalid account seed');
        if (account.wotsIndex < 0) throw new Error('Invalid wots index');

        if (account.source === 'mcm' && account.seed) {
            const { address } = Derivation.deriveWotsSeedAndAddress(
                Buffer.from(account.seed, 'hex'),
                account.wotsIndex,
                account.tag
            );

            const updates = {
                address: Buffer.from(address).toString('hex'),
                wotsIndex: account.wotsIndex + 1
            };

            await dispatch(updateAccountAction(accountId, updates));
        }
    } catch (error) {
        dispatch(setError('Failed to update WOTS key'));
        throw error;
    }
};

// Import MCM account
export const importMCMAccountAction = (
    name: string,
    address: string,
    seed: string,
    tag: string,
    wotsIndex: number
): AppThunk<Account> => async (dispatch, getState) => {
    try {
        // Validate tag length
        if (tag.length !== 24) {
            throw new Error('Invalid tag length');
        }

        // Validate address format (64 hex chars)
        if (!/^[0-9a-fA-F]{64}$/.test(address)) {
            throw new Error('Invalid address format');
        }

        const state = getState();
        const storage = StorageProvider.getStorage();

        const account: Account = {
            name,
            type: 'imported',
            faddress: address,
            balance: '0',
            tag,
            seed,
            source: 'mcm',
            wotsIndex,
            order: Object.keys(state.accounts.accounts).length
        };

        await storage.saveAccount(account, SessionManager.getInstance().getStorageKey());
        dispatch(bulkAddAccounts({ [tag]: account }));
        return account;
    } catch (error) {
        dispatch(setError('Failed to import account'));
        throw error;
    }
};

// Bulk import MCM accounts
export const bulkImportMCMAccountsAction = (
    accounts: Array<{
        name: string;
        address: string;
        seed: string;
        tag: string;
        wotsIndex: number;
    }>
): AppThunk => async (dispatch, getState) => {
    try {
        // Check for duplicate tags
        const tags = accounts.map(a => a.tag);
        if (new Set(tags).size !== tags.length) {
            throw new Error('Duplicate account tag');
        }

        const state = getState();
        const storage = StorageProvider.getStorage();
        const startOrder = Object.keys(state.accounts.accounts).length;

        const accountEntries: Record<string, Account> = {};

        await Promise.all(accounts.map(async (account, i) => {
            const id = account.tag;
            const newAccount: Account = {
                name: account.name,
                type: 'imported',
                faddress: account.address,
                balance: '0',
                tag: account.tag,
                seed: account.seed,
                source: 'mcm',
                order: startOrder + i,
                wotsIndex: account.wotsIndex
            };

            accountEntries[id] = newAccount;
        }));

        for(let account of Object.values(accountEntries)) {
            await storage.saveAccount(account, SessionManager.getInstance().getStorageKey());
        }

        dispatch(bulkAddAccounts(accountEntries));
    } catch (error) {
        dispatch(setError('Failed to import accounts'));
        throw error;
    }
};

// Delete account

export const deleteAccountAction = createAsyncThunk<
    void,  // Return type
    string,              // Argument type (accountId)
    AsyncThunkConfig     // Configuration including state and dispatch types
>(
    'accounts/delete',
    async (accountId: string, { dispatch, getState }) => {
        
        try {
        const state = getState();
        const account = state.accounts.accounts[accountId];

        if (!account) {
            throw new Error('Account not found');
        }

        // Don't allow deleting the last account
        const accountCount = Object.keys(state.accounts.accounts).length;
        if (accountCount <= 1) {
            throw new Error('Cannot delete last account');
        }

        const storage = StorageProvider.getStorage();

        //update the account to be deleted
        await dispatch(updateAccountAction(accountId, { isDeleted: true }));


        // If deleting selected account, clear selection from storage
        if (state.accounts.selectedAccount === accountId) {
            await storage.saveActiveAccount('');
        }

        if (accountId === state.accounts.selectedAccount) dispatch(setSelectedAccount(null));

    } catch (error) {
        dispatch(setError('Failed to delete account'));
        throw error;
    }
});

// Reorder accounts
export const reorderAccountsAction = (
    newOrder: { [accountId: string]: number }
): AppThunk => async (dispatch, getState) => {
    try {
        const state = getState();
        const accounts = state.accounts.accounts;

        // Validate the new order
        const currentIds = new Set(Object.keys(accounts).filter(id => !accounts[id].isDeleted));
        const newIds = new Set(Object.keys(newOrder));

        // Check if all accounts are included
        if (currentIds.size !== newIds.size ||
            ![...currentIds].every(id => newIds.has(id))) {
            throw new Error('New order must include all accounts');
        }

        // Check if order numbers are unique and sequential
        const orderValues = Object.values(newOrder);
        const uniqueOrders = new Set(orderValues);
        if (uniqueOrders.size !== orderValues.length) {
            throw new Error('Order numbers must be unique');
        }

        const storage = StorageProvider.getStorage();

        // Update storage
        await Promise.all(
            Object.entries(newOrder).map(([id, order]) =>
                storage.saveAccount({ ...accounts[id], order }, SessionManager.getInstance().getStorageKey())
            )
        );

        // Update Redux state
        dispatch(reorderAccounts(newOrder));

    } catch (error) {
        dispatch(setError('Failed to reorder accounts'));
        throw error;
    }
}; 