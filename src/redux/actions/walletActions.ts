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
import { SessionManager } from '../context/SessionContext';
import { Account } from '../../types/account';
import { EncryptedData } from '../../crypto/encryption';
import { MasterSeed } from '../../core/MasterSeed';
import { AppThunk } from '../store';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { MCMDecoder } from '@/crypto/mcmDecoder';



// Create new wallet
export const createWalletAction = createAsyncThunk(
    'wallet/create',
    async ({ password, mnemonic }: { password: string; mnemonic?: string }, { dispatch }) => {
        try {
            dispatch(setError(null));
            let masterSeed: MasterSeed;
            if (mnemonic) {
                masterSeed = await MasterSeed.fromPhrase(mnemonic);
            } else {
                masterSeed = await MasterSeed.create();
            }

            // Encrypt and store if storage is provided
            const storage = StorageProvider.getStorage();
            if (storage) {
                const encrypted = await masterSeed.export(password);
                await storage.saveMasterSeed(encrypted);
            }

            // Initialize session
            const session = SessionManager.getInstance();
            await session.unlock(password, storage);

            // Set wallet states in correct order
            dispatch(setHasWallet(true));
            dispatch(setInitialized(true));
            dispatch(setLocked(false));

        } catch (error) {
            dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
            throw error;
        }
    }
);

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
export const createAccountAction = (name?: string): AppThunk<Account> => async (dispatch, getState) => {
    try {
        const storage = StorageProvider.getStorage();
        const session = SessionManager.getInstance();
        const masterSeed = await session.getMasterSeed();

        // Get next account index from state
        const state = getState();
        const accountIndex = state.wallet.highestAccountIndex + 1;

        // Generate account tag

        const w = masterSeed.deriveAccount(accountIndex);

        const account: Account = {
            name: name || 'Account ' + (accountIndex + 1),
            type: 'standard' as const,
            faddress: Buffer.from(w.address).toString('hex'),
            balance: '0',
            index: accountIndex,
            tag: w.tag,
            source: 'mnemonic' as const,
            wotsIndex: 0,
            seed: Buffer.from(w.seed).toString('hex'),
            order: Object.keys(state.accounts.accounts).length // Use index as initial order
        };



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
export const exportWalletJSONAction = (password: string): AppThunk<WalletJSON> => async (dispatch, getState) => {
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

interface WalletJSON {
    version: string;
    timestamp: number;
    encrypted: EncryptedData;
    accounts: Record<string, Account>;
}

export const loadWalletJSONAction = (
    walletJSON: WalletJSON,
    password: string
): AppThunk<void> => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const session = SessionManager.getInstance();

        // Clear existing storage
        await storage.clear();

        // Save encrypted master seed
        await storage.saveMasterSeed(walletJSON.encrypted);

        // Unlock the wallet with new master seed
        await session.unlock(password, storage);

        // Save accounts to storage and get highest index
        let highestIndex = -1;
        await Promise.all(
            Object.values(walletJSON.accounts).map(async (account) => {
                await storage.saveAccount(account);
                if (account.index !== undefined && account.index > highestIndex) {
                    highestIndex = account.index;
                }
            })
        );

        // Save highest index
        await storage.saveHighestIndex(highestIndex);

        // Update Redux state
        dispatch(bulkAddAccounts(walletJSON.accounts));
        dispatch(setHighestIndex(highestIndex));
        dispatch(setHasWallet(true));
        dispatch(setLocked(false));
        dispatch(setInitialized(true));

    } catch (error) {
        dispatch(setError('Failed to load wallet from JSON'));
        throw error;
    }
};

export const lockWalletAction = (): AppThunk<void> => async (dispatch) => {
    const session = SessionManager.getInstance();
    session.lock();
    dispatch(setLocked(true));
};

export const setSelectedAccountAction = (
    accountId: string | null
): AppThunk<void> => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();

        if (accountId) {
            // Update Redux state
            dispatch(setSelectedAccount(accountId));
            // Save to storage
            await storage.saveActiveAccount(accountId);
        }

    } catch (error) {
        dispatch(setError('Failed to set active account'));
        throw error;
    }
};

export const importFromMcmFileAction = createAsyncThunk(
    'wallet/importFromMcm',
    async ({ mcmData, password }: { mcmData: ArrayBuffer; password: string }, { dispatch }) => {
        try {
            dispatch(setError(null));

            // 1. Clear any existing state/storage
            const storage = StorageProvider.getStorage();
            await storage.clear();

            // 2. Decode MCM file
            const { entries, privateHeader } = await MCMDecoder.decode(mcmData, password);
            const detSeed = privateHeader['deterministic seed hex'];

            // 3. Create master seed and initialize session
            const masterSeed = new MasterSeed(Buffer.from(detSeed, 'hex')); 
            const session = SessionManager.getInstance();
            
            // 4. Save encrypted master seed to storage using the same password
            const encrypted = await masterSeed.export(password);
            await storage.saveMasterSeed(encrypted);

            // 5. Set session state directly to avoid re-encryption
            session.setMasterSeed(masterSeed);

            // 6. Update wallet state
            dispatch(setHasWallet(true));
            dispatch(setInitialized(true));
            dispatch(setLocked(false));

            // 7. Create and save accounts
            const accounts = entries.map((entry, index) => ({
                name: entry.name || `Account ${index + 1}`,
                type: 'standard' as const,
                faddress: entry.address,
                balance: '0',
                index: index,
                tag: entry.address.slice(-24),
                source: 'mnemonic' as const,
                wotsIndex: 0,
                seed: entry.secret,
                order: index
            }));

            // 8. Save accounts
            await Promise.all([
                ...accounts.map(account => storage.saveAccount(account)),
                storage.saveHighestIndex(accounts.length - 1)
            ]);

            // 9. Update account state
            dispatch(setHighestIndex(accounts.length - 1));
            dispatch(bulkAddAccounts(
                accounts.reduce((acc, account) => {
                    acc[account.tag] = account;
                    return acc;
                }, {} as Record<string, Account>)
            ));

            return { masterSeed, entries };
        } catch (error) {
            console.error('Import error:', error);
            dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
            throw error;
        }
    }
); 