import { AppThunk } from '../store';
import { addAccount, bulkAddAccounts, updateAccount } from '../slices/accountSlice';
import { selectOrderedAccounts } from '../slices/accountSlice';
import { AccountType } from '../../types/account';
import {  setError } from '../slices/walletSlice';
import { WOTS } from 'mochimo-wots-v2';
import { DigestRandomGenerator } from '../../crypto/digestRandomGenerator';
import { WOTSEntry } from '../../crypto/mcmDecoder';
import { Account } from '../types/state';
import { StorageProvider } from '../context/StorageContext';

// Helper to get next ID based on max order
function getNextId(accounts: Account[]): string {
    const maxOrder = accounts.length > 0 
        ? Math.max(...accounts.map(acc => acc.order ?? 0))
        : -1;
    return (maxOrder + 1).toString();
}



// Helper to generate next WOTS key for imported account
function generateNextWOTSKey(seed: string, tag: string, wotsIndex: number) {
    const seedBytes = Buffer.from(seed, 'hex');
    const tagBytes = Buffer.from(tag, 'hex');
    
    // Pre-allocate random bytes
    const prng = new DigestRandomGenerator();
    prng.addSeedMaterial(seedBytes);
    
    // Pre-allocate buffer for random bytes
    const randomBuffer = prng.nextBytes(32 * 256);
    let offset = 0;

    const address = WOTS.generateRandomAddress_(tagBytes, seedBytes, (bytes) => {
        bytes.set(randomBuffer.subarray(offset, offset + bytes.length));
        offset += bytes.length;
    });

    return { address: Buffer.from(address).toString('hex') };
}
export const renameAccountAction = (
    id: string,
    name: string
): AppThunk => async (dispatch) => {
    const storage = StorageProvider.getStorage();
    const accounts = await storage.loadAccounts();
    const account = accounts.find((acc) => acc.tag === id);
    if (!account) throw new Error('Account not found');
    const updatedAccount = { ...account, name };
    await storage.saveAccount(updatedAccount);
    dispatch(updateAccount({ id, updates: { name } }));
}

// Update account
export const updateAccountAction = (
    id: string,
    updates: Partial<Account>
): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const accounts = await storage.loadAccounts();
        const account = accounts.find((acc) => acc.tag === id);

        if (!account) throw new Error('Account not found');
        
        const updatedAccount = { ...account, ...updates };
        await storage.saveAccount(updatedAccount);
        
        dispatch(updateAccount({ id, updates }));
    } catch (error) {
        dispatch(setError('Failed to update account'));
        throw error;
    }
};

// Update WOTS key
export const updateAccountWOTSAction = (
    accountId: string
): AppThunk => async (dispatch, getState) => {
    try {
        const state = getState();
        const account = state.accounts.accounts[accountId];
        const storage = StorageProvider.getStorage();

        if (!account) return;

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

            await storage.saveAccount({ ...account, ...updates });
            dispatch(updateAccount({ id: accountId, updates }));
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
        const storage = StorageProvider.getStorage();
        const accounts = selectOrderedAccounts(getState());
        const id = getNextId(accounts);

        const account: Account = {
            name,
            type: 'imported',
            address,
            balance: '0',
            tag,
            seed,
            source: 'mcm',
            order: parseInt(id),
            wotsIndex
        };

        await storage.saveAccount(account);
        dispatch(addAccount({ id, account }));
    } catch (error) {
        dispatch(setError('Failed to import account'));
        throw error;
    }
};

// Bulk import MCM accounts
export const bulkImportMCMAccountsAction = (
    accounts: MCMAccountImport[]
): AppThunk => async (dispatch, getState) => {
    try {
        const storage = StorageProvider.getStorage();
        const existingAccounts = selectOrderedAccounts(getState());
        const startId = getNextId(existingAccounts);
        const startOrder = parseInt(startId);

        const accountEntries: Record<string, Account> = {};

        // Create and save accounts
        await Promise.all(accounts.map(async (account, i) => {
            const id = (startOrder + i).toString();
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

export interface MCMAccountImport {
    name: string;
    address: string;
    seed: string;
    tag: string;
    wotsIndex: number;
}

// Helper to convert MCM entries to importable accounts
export const convertMCMEntries = (entries: WOTSEntry[]): MCMAccountImport[] => {
    return entries.map(entry => ({
        name: entry.name,
        address: entry.address,
        seed: entry.secret,
        tag: entry.address.slice(-24), // Last 24 bytes of address
        wotsIndex: -1 // -1 means the account was just imported and next wots index will be 0. current wots index will not be used to generate the wots seed and public key
    }));
}; 