import { AppThunk } from '../store';
import { addAccount, bulkAddAccounts, updateAccount } from '../slices/accountSlice';
import { selectOrderedAccounts } from '../slices/accountSlice';
import { AccountType } from '../../types/account';
import { incrementHighestIndex } from '../slices/walletSlice';
import { WOTS } from 'mochimo-wots-v2';
import { DigestRandomGenerator } from '../../crypto/digestRandomGenerator';
import { WOTSEntry } from '../../crypto/mcmDecoder';
import { Account } from '../types/state';

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

// Action to update account's WOTS key
export const updateAccountWOTS = (
    accountId: string
): AppThunk => async (dispatch, getState) => {
    const state = getState();
    const account = state.accounts.accounts[accountId];

    if (!account) return;

    if (account.source === 'mcm' && account.seed) {
        // For imported accounts, use stored seed with next wotsIndex
        const { address } = generateNextWOTSKey(
            account.seed,
            account.tag!,
            account.wotsIndex
        );

        dispatch(updateAccount({
            id: accountId,
            updates: {
                address,
                wotsIndex: account.wotsIndex + 1
            }
        }));
    }
    // Handle HD wallet accounts separately...
};

// Modified import action
export const importMCMAccount = (
    name: string,
    address: string,
    seed: string,
    tag: string,
    wotsIndex: number
): AppThunk => async (dispatch, getState) => {
    const accounts = selectOrderedAccounts(getState());
    const id = getNextId(accounts);

    dispatch(addAccount({
        id,
        account: {
            name,
            type: 'imported',
            address,
            balance: '0',
            tag,
            seed,
            source: 'mcm',
            order: parseInt(id),
            wotsIndex
        }
    }));
};

export interface MCMAccountImport {
    name: string;
    address: string;
    seed: string;
    tag: string;
    wotsIndex: number;
}

export const bulkImportMCMAccounts = (
    accounts: MCMAccountImport[]
): AppThunk => async (dispatch, getState) => {
    const existingAccounts = selectOrderedAccounts(getState());
    const startId = getNextId(existingAccounts);
    const startOrder = parseInt(startId);

    const accountEntries: Record<string, Account> = Object.create(null);

    // Use sequential IDs/orders
    for (let i = 0; i < accounts.length; i++) {
        const account = accounts[i];
        const id = (startOrder + i).toString();
        accountEntries[id] = {
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
    }

    dispatch(bulkAddAccounts(accountEntries));
};

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