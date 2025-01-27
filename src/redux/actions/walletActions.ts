import { createAsyncThunk } from '@reduxjs/toolkit';
import { WotsAddress } from 'mochimo-wots';
import { MasterSeed } from '../../core/MasterSeed';
import { Account } from '../../types/account';
import { SessionManager } from '../context/SessionContext';
import { StorageProvider } from '../context/StorageContext';
import { addAccount, bulkAddAccounts, setSelectedAccount } from '../slices/accountSlice';
import {
    setError,
    setHasWallet,
    setHighestIndex,
    setInitialized,
    setLocked,
} from '../slices/walletSlice';
import { AppThunk, RootState } from '../store';
import { ImportAccountsOptions, ImportOptions, WalletExportedJSON } from '../types/state';
import { decryptAccount, encryptAccount, EncryptedAccount } from '@/crypto/accountEncryption';



// Create new wallet
export const createWalletAction = createAsyncThunk(
    'wallet/create',
    async ({ password, mnemonic }: { password: string; mnemonic?: string }, { dispatch, rejectWithValue }) => {
        try {
            let masterSeed: MasterSeed;
            let generatedMnemonic: string | undefined;

            if (mnemonic) {
                masterSeed = await MasterSeed.fromPhrase(mnemonic);
            } else {
                masterSeed = await MasterSeed.create();
                generatedMnemonic = await masterSeed.toPhrase();
            }

            const storage = StorageProvider.getStorage();
            const encrypted = await masterSeed.export(password);
            await storage.saveMasterSeed(encrypted);

            // Set wallet state
            dispatch(setHasWallet(true));
            dispatch(setInitialized(true));
            dispatch(setLocked(true));

            return { mnemonic: generatedMnemonic };
        } catch (error) {
            console.error('Failed to create wallet:', error);
            dispatch(setError('Failed to create wallet'));
            return rejectWithValue('Failed to create wallet');
        }
    }
);


// Unlock wallet
export const unlockWalletAction = (key: string, type: 'password' | 'seed' | 'jwk' | 'mnemonic' = 'password'): AppThunk<{ jwk: JsonWebKey | null; storageKey: Uint8Array | null }> => async (dispatch) => {
    try {
        let jwk: JsonWebKey | null = null;
        let sk: Uint8Array | null = null;
        const storage = StorageProvider.getStorage();
        if (type === 'seed') {
            await SessionManager.getInstance().unlockWithSeed(key);
        } else if (type === 'jwk') {
            const parsedKey = JSON.parse(key);
            await SessionManager.getInstance().unlockWithDerivedKey(parsedKey, storage);
        } else if (type === 'mnemonic') {
            await SessionManager.getInstance().unlockWithMnemonic(key);
        } else {
            const result = await SessionManager.getInstance().unlock(key, storage);
            jwk = result.jwk;
            sk = result.storageKey;
        }

        const storageKey = SessionManager.getInstance().getStorageKey();
        // Load accounts and highest index
        const [accounts, highestIndex, activeAccount] = await Promise.all([
            storage.loadAccounts(storageKey),
            storage.loadHighestIndex(),
            storage.loadActiveAccount()
        ]);

        const accountsObject = accounts.reduce((acc, account) => {
            if (account.tag) {
                acc[account.tag] = account;
            }
            return acc;
        }, {} as Record<string, Account>);
        dispatch(bulkAddAccounts(accountsObject));
        dispatch(setHighestIndex(highestIndex));
        dispatch(setSelectedAccount(activeAccount));
        dispatch(setLocked(false));
        dispatch(setHasWallet(true));
        dispatch(setInitialized(true));
        return { jwk: jwk, storageKey: storageKey };
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
        const masterSeed = session.getMasterSeed();

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
            wotsIndex: -1, //first wots address is created using account seed
            seed: Buffer.from(w.seed).toString('hex'),
            order: Object.keys(state.accounts.accounts).length // Use index as initial order
        };

        const storageKey = session.getStorageKey();

        await Promise.all([
            storage.saveAccount(account, storageKey),
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
export const exportWalletJSONAction = (password: string): AppThunk<WalletExportedJSON> => async (dispatch, getState) => {
    try {
        const state = getState();

        // Add initialization check
        if (!state.wallet.initialized || !state.wallet.hasWallet) {
            throw new Error('Wallet not initialized');
        }

        const session = SessionManager.getInstance();
        const ms = await session.getMasterSeed();
        if (!ms) {
            throw new Error('Wallet is locked');
        }
        const storageKey = session.getStorageKey();
        const loadAccounts = await StorageProvider.getStorage().loadAccounts(storageKey);
        const encryptedAccounts: Record<string, EncryptedAccount> = {};
        for (const account of (loadAccounts)) {
            encryptedAccounts[account.tag] = await encryptAccount(account, storageKey);
        }
        console.log('encryptedAccounts', encryptedAccounts);
        return {
            version: '1.0.0',
            timestamp: Date.now(),
            encrypted: await ms.export(password),
            accounts: encryptedAccounts,
        };
    } catch (error) {
        dispatch(setError('Failed to export wallet'));
        throw error;
    }
};



export const loadWalletJSONAction = (
    walletJSON: WalletExportedJSON,
    password: string
): AppThunk<void> => async (dispatch) => {
    try {
        const storage = StorageProvider.getStorage();
        const session = SessionManager.getInstance();

        //determine before clearing if the master seed can be decrypted with the password
        const msEncrypted = walletJSON.encrypted;
        if (!msEncrypted) {
            throw new Error('Invalid wallet JSON');
        }

        const ms = await MasterSeed.import(msEncrypted, password);
        if (!ms) {
            throw new Error('Invalid password');
        }
        // Clear existing storage
        await storage.clear();

        // Save encrypted master seed
        await storage.saveMasterSeed(walletJSON.encrypted);

        // Unlock the wallet with new master seed
        await session.unlock(password, storage);

        // Save accounts to storage and get highest index
        let highestIndex = -1;
        const storageKey = session.getStorageKey();
        //try to decrypt the accounts using storage key
        const accounts = await Promise.all(
            Object.values(walletJSON.accounts).map(async (account) => {
                const decrypted = await decryptAccount(account, storageKey);
                return decrypted;
            })
        );
        const accsState = accounts.reduce((acc, account) => {
            acc[account.tag] = account;
            return acc;
        }, {} as Record<string, Account>);

        //save one by one to avoid race condition
        for(let account of Object.values(accsState)) {
            await storage.saveAccount(account, storageKey);
            if (account.index !== undefined && account.index > highestIndex) {
                highestIndex = account.index;
            }
        }
        // Save highest index
        await storage.saveHighestIndex(highestIndex);

        // Update Redux state
        dispatch(bulkAddAccounts(accsState));
        dispatch(setHighestIndex(highestIndex));
        dispatch(setHasWallet(true));
        dispatch(setLocked(false));
        dispatch(setInitialized(true));

    } catch (error) {
        dispatch(setError('Failed to load wallet from JSON'));
        throw error;
    }
};

export const lockWalletAction = (): AppThunk => async (dispatch) => {
    try {
        const session = SessionManager.getInstance();
        await session.lock();
        dispatch(setLocked(true));
    } catch (error) {
        dispatch(setError('Failed to lock wallet'));
    }
};

export const setSelectedAccountAction = (
    accountId: string | null
): AppThunk<void> => async (dispatch, getState) => {
    try {
        const storage = StorageProvider.getStorage();
        const state = getState();
        const accounts = state.accounts.accounts;
        if (accountId && accounts[accountId]) {
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
    async ({ mcmData, password, accountFilter }: ImportOptions, { dispatch }) => {
        try {
            dispatch(setError(null));

            // 1. Clear existing state/storage
            const storage = StorageProvider.getStorage();
            await storage.clear();

            // 2. Get MCM data
            const { entries, privateHeader } = mcmData;
            const detSeed = privateHeader['deterministic seed hex'];

            // 3. Create master seed and set up wallet
            const masterSeed = new MasterSeed(Buffer.from(detSeed, 'hex'));
            const encrypted = await masterSeed.export(password);
            await storage.saveMasterSeed(encrypted);

            // 4. Set up wallet state BEFORE importing accounts
            dispatch(setHasWallet(true));
            dispatch(setInitialized(true));
            dispatch(setLocked(false));

            // 5. Set session state
            const session = SessionManager.getInstance();
            session.setMasterSeed(masterSeed);

            // 6. Now import accounts
            const results = await dispatch(importAccountsFromMcmAction({
                mcmData,
                accountFilter,
                source: 'mnemonic'
            })).unwrap();

            return {
                entries: entries,
                totalEntries: entries.length,
                importedCount: results.importedCount
            };
        } catch (error) {
            console.error('Import error:', error);
            dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
            throw error;
        }
    }
);





export const importAccountsFromMcmAction = createAsyncThunk(
    'wallet/importAccounts',
    async ({ mcmData, accountFilter, source }: ImportAccountsOptions, { dispatch, getState }) => {
        try {
            dispatch(setError(null));

            // 1. Verify we have an unlocked wallet
            const state = getState() as RootState;
            if (!state.wallet.hasWallet || state.wallet.locked) {
                throw new Error('Wallet must be unlocked to import accounts');
            }

            // 2. Decode MCM file
            const { entries } = mcmData;

            // 3. Filter accounts based on options
            let filteredEntries = entries;
            if (accountFilter) {
                filteredEntries = entries.filter((entry, index) => {
                    if (accountFilter(index, Buffer.from(entry.secret, 'hex'), entry.name)) return true;
                    return false;
                });
            }

            if (filteredEntries.length === 0) {
                throw new Error('No accounts matched the filter criteria');
            }

            // 4. Get storage and current highest index
            const storage = StorageProvider.getStorage();
            const session = SessionManager.getInstance();
            const storageKey = session.getStorageKey();
            const currentHighestIndex = state.wallet.highestAccountIndex;
            // 5. Create and save new accounts
            const accounts: Account[] = filteredEntries.map((entry, index) => {
                const address = new Uint8Array(Buffer.from(entry.address, 'hex').subarray(0, 2144));
                const addrHash = WotsAddress.addrFromWots(address)!
                const tag = Buffer.from(addrHash?.subarray(0, 20)).toString('hex')
                return {
                    name: entry.name || `Imported Account ${index + 1}`,
                    type: source === 'mnemonic' ? 'standard' : 'imported',
                    faddress: entry.address,
                    balance: '0',
                    index: source === 'mnemonic' ? currentHighestIndex + 1 + index : undefined, // Continue from current highest
                    tag: tag,
                    source: source,
                    wotsIndex: -1,
                    seed: entry.secret,
                    order: Object.keys(state.accounts.accounts).length + index // Add to end
                }
            });

            // 6. Save accounts
            for(let account of accounts) {
                await storage.saveAccount(account, storageKey);
            }
            await storage.saveHighestIndex(currentHighestIndex + accounts.length);

            // 7. Update account state
            dispatch(setHighestIndex(currentHighestIndex + accounts.length));
            dispatch(bulkAddAccounts(
                accounts.reduce((acc, account) => {
                    acc[account.tag] = account;
                    return acc;
                }, {} as Record<string, Account>)
            ));

            return {
                importedAccounts: accounts,
                totalAvailable: entries.length,
                importedCount: accounts.length
            };
        } catch (error) {
            console.error('Import accounts error:', error);
            dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
            throw error;
        }
    }
); 