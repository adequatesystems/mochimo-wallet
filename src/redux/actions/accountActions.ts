import { AppThunk } from '../store';
import { addAccount, bulkAddAccounts, updateAccount, removeAccount, reorderAccounts } from '../slices/accountSlice';
import { setError } from '../slices/walletSlice';
import { StorageProvider } from '../context/StorageContext';
import { Account } from '../types/state';
import { generateNextWOTSKey } from '../utils/derivation';

// Update account
export const updateAccountAction = (
    id: string,
    updates: Partial<Account>
): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const account = await storage.loadAccount(id);
        
        if (!account) throw new Error('Account not found');
        
        const updatedAccount = { ...account, ...updates };
        await storage.saveAccount(updatedAccount);
        
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

        if (account.source === 'mcm' && account.seed) {
            const { address } = generateNextWOTSKey(
                account.seed,
                account.tag,
                account.wotsIndex
            );

            const updates = {
                address,
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
): AppThunk => async (dispatch, getState) => {
    try {
        const state = getState();
        const storage = StorageProvider.getStorage();

        const account: Account = {
            name,
            type: 'imported',
            address,
            balance: '0',
            tag,
            seed,
            source: 'mcm',
            wotsIndex,
            order: Object.keys(state.accounts.accounts).length
        };

        await storage.saveAccount(account);
        dispatch(addAccount({ id: tag, account }));
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
        const state = getState();
        const storage = StorageProvider.getStorage();
        const startOrder = Object.keys(state.accounts.accounts).length;

        const accountEntries: Record<string, Account> = {};

        await Promise.all(accounts.map(async (account, i) => {
            const id = account.tag;
            const newAccount: Account = {
                name: account.name,
                type: 'imported',
                address: account.address,
                balance: '0',
                tag: account.tag,
                seed: account.seed,
                source: 'mcm',
                order: startOrder + i,
                wotsIndex: account.wotsIndex
            };

            await storage.saveAccount(newAccount);
            accountEntries[id] = newAccount;
        }));

        dispatch(bulkAddAccounts(accountEntries));
    } catch (error) {
        dispatch(setError('Failed to import accounts'));
        throw error;
    }
};

// Delete account
export const deleteAccountAction = (
    accountId: string
): AppThunk => async (dispatch, getState) => {
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
        
        // Remove from storage
        await storage.deleteAccount(accountId);
        
        // Update Redux state
        dispatch(removeAccount(accountId));

    } catch (error) {
        dispatch(setError('Failed to delete account'));
        throw error;
    }
};

// Reorder accounts
export const reorderAccountsAction = (
    newOrder: { [accountId: string]: number }
): AppThunk => async (dispatch, getState) => {
    try {
        const state = getState();
        const accounts = state.accounts.accounts;
        
        // Validate the new order
        const currentIds = new Set(Object.keys(accounts));
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
                storage.saveAccount({ ...accounts[id], order })
            )
        );
        
        // Update Redux state
        dispatch(reorderAccounts(newOrder));

    } catch (error) {
        dispatch(setError('Failed to reorder accounts'));
        throw error;
    }
}; 