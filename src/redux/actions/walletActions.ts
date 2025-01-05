import { AppThunk } from '../store';
import {
    setInitialized,
    setLocked,
    setHasWallet,
    setError,
    setHighestIndex,

} from '../slices/walletSlice';
import { addAccount, bulkAddAccounts, setSelectedAccount } from '../slices/accountSlice';
import { HDWallet } from '../../core/HDWallet';
import { StorageProvider } from '../context/StorageContext';
import { MasterSeed } from '../../core/MasterSeed';
import { SessionManager } from '../context/SessionContext';
import { Account } from '../types/state';
import { WOTS } from 'mochimo-wots-v2';


// Create new wallet
export const createWalletAction = (
    password: string,
    mnemonic?: string
): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        await HDWallet.create(password, mnemonic, { storage });

        dispatch(setHasWallet(true));
        dispatch(setLocked(false));
        dispatch(setInitialized(true));

        return mnemonic;
    } catch (error) {
        dispatch(setError(error instanceof Error ? error.message : 'Failed to create wallet'));
        throw error;
    }
};

// Load wallet
export const loadWalletAction = (password: string): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const wallet = await HDWallet.load(password, storage);
        const activeAccount = await storage.loadActiveAccount();
        dispatch(setHasWallet(wallet.getAccounts().length > 0));
        dispatch(setLocked(true));
        dispatch(setSelectedAccount(activeAccount));
        dispatch(setInitialized(true));
    } catch (error) {
        dispatch(setError('Failed to load wallet'));
    }
};

// Unlock wallet
export const unlockWalletAction = (password: string): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const session = SessionManager.getInstance();

        await session.unlock(password, storage);

        // Load accounts and highest index
        const [accounts, highestIndex] = await Promise.all([
            storage.loadAccounts(),
            storage.loadHighestIndex()
        ]);

        const accountsObject = accounts.reduce((acc, account) => {
            if (account.tag) {
                acc[account.tag] = account;
            }
            return acc;
        }, {} as Record<string, Account>);

        dispatch(bulkAddAccounts(accountsObject));
        dispatch(setHighestIndex(highestIndex));
        dispatch(setLocked(false));
    } catch (error) {
        dispatch(setError('Invalid password'));
        throw error;
    }
};

// Create account
export const createAccountAction = (name?: string): AppThunk => async (dispatch, getState) => {
    try {
        const storage = StorageProvider.getStorage();
        const session = SessionManager.getInstance();
        const masterSeed = await session.getMasterSeed();

        // Get next account index from state
        const state = getState();
        const accountIndex = state.wallet.highestAccountIndex + 1;

        // Generate account tag
        const tagBytes = await masterSeed.deriveAccountTag(accountIndex);
        const tagString = Buffer.from(tagBytes).toString('hex');


        //generate the wots address
        const accountSeed = await masterSeed.deriveAccountSeed(accountIndex);
        const wotsSeed = MasterSeed.deriveSeed(accountSeed, accountIndex);

        const address = WOTS.generateRandomAddress_(tagBytes, wotsSeed.secret, (bytes) => {
            if (wotsSeed.prng) {
                const len = bytes.length;
                const randomBytes = wotsSeed.prng.nextBytes(len);
                bytes.set(randomBytes);
            }
        });

        const account: Account = {
            name: name || 'Account ' + (accountIndex + 1),
            type: 'standard' as const,
            address: Buffer.from(address).toString('hex'),
            balance: '0',
            index: accountIndex,
            tag: tagString,
            source: 'mnemonic' as const,
            wotsIndex: 0,
            seed: Buffer.from(accountSeed).toString('hex'),
            order: Object.keys(state.accounts.accounts).length // Use index as initial order
        };

        console.log(account);

        await Promise.all([
            storage.saveAccount(account),
            storage.saveHighestIndex(accountIndex)
        ]);

        dispatch(addAccount({ id: account.tag, account }));
        dispatch(setHighestIndex(accountIndex));
        return account;

    } catch (error) {
        dispatch(setError('Failed to create account'));
        throw error;
    }
};

// Export wallet
export const exportWalletJSONAction = (password: string): AppThunk => async (dispatch, getState) => {
    try {
        const state = getState();
        const session = SessionManager.getInstance();
        const ms = await session.getMasterSeed();
        if (!ms) {
            throw new Error('Wallet is locked');
        }
        const accounts = state.accounts.accounts;
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            encrypted: await ms.export(password),
            accounts: accounts
        };
    } catch (error) {
        dispatch(setError('Failed to export wallet'));
        throw error;
    }
};

export const lockWalletAction = (): AppThunk => async (dispatch) => {
    const session = SessionManager.getInstance();
    session.lock();
    dispatch(setLocked(true));
};

export const setSelectedAccountAction = (
    accountId: string | null
): AppThunk => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();

        if (accountId) {
            // Save to storage
            await storage.saveActiveAccount(accountId);
        }

        // Update Redux state
        dispatch(setSelectedAccount(accountId));
    } catch (error) {
        dispatch(setError('Failed to set active account'));
        throw error;
    }
}; 