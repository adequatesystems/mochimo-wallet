import { describe, it, expect, beforeEach } from 'vitest';
import { MockStorage } from '../../../mocks/MockStorage';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import {
    createWalletAction,
    unlockWalletAction,
    createAccountAction,
    exportWalletJSONAction,
    loadWalletJSONAction,
    lockWalletAction,
    setSelectedAccountAction
} from '../../../../src/redux/actions/walletActions';

describe('Wallet Actions', () => {
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

    // Helper function to setup an unlocked wallet
    async function setupUnlockedWallet() {
        await store.dispatch(createWalletAction(testPassword));
        await store.dispatch(unlockWalletAction(testPassword));
    }

    describe('createWalletAction', () => {
        it('should create a new wallet and return mnemonic', async () => {
            const seedPhrase = await store.dispatch(createWalletAction(testPassword));

            const state = store.getState();
            expect(state.wallet.hasWallet).toBe(true);
            expect(state.wallet.initialized).toBe(true);
            
            // Check storage
            const masterSeed = await mockStorage.loadMasterSeed();
            expect(masterSeed).toBeTruthy();

            // Verify seed phrase
            expect(seedPhrase).toBeTruthy();
            expect(typeof seedPhrase).toBe('string');
            expect(seedPhrase.split(' ').length).toBe(24); // BIP39 24-word mnemonic
        });

        it('should fail with invalid password', async () => {
            await expect(async () => {
                await store.dispatch(createWalletAction(''));
            }).rejects.toThrow('Password is required');
        });

        it('should accept custom mnemonic', async () => {
            const testMnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';
            
            const returnedMnemonic = await store.dispatch(
                createWalletAction(testPassword, testMnemonic)
            );

            expect(returnedMnemonic).toBe(testMnemonic);
            
            const state = store.getState();
            expect(state.wallet.hasWallet).toBe(true);
            expect(state.wallet.initialized).toBe(true);
        });
    });

    describe('unlockWalletAction', () => {
        it('should unlock an existing wallet and load accounts', async () => {
            // First create a wallet and unlock it
            await setupUnlockedWallet();
            
            // Create an account
            await store.dispatch(createAccountAction('Test Account'));
            
            // Lock it
            await store.dispatch(lockWalletAction());
            
            // Try to unlock
            await store.dispatch(unlockWalletAction(testPassword));
            
            const state = store.getState();
            expect(state.wallet.locked).toBe(false);
            expect(Object.keys(state.accounts.accounts).length).toBe(1);
            expect(state.wallet.highestAccountIndex).toBe(0);
        });

        it('should fail with wrong password', async () => {
            await store.dispatch(createWalletAction(testPassword));
            
            await expect(
                store.dispatch(unlockWalletAction('wrongpassword'))
            ).rejects.toThrow();
        });
    });

    describe('createAccountAction', () => {
        beforeEach(async () => {
            await setupUnlockedWallet();
        });

        it('should create a new account with custom name', async () => {
            const result = await store.dispatch(createAccountAction('Test Account'));
            
            const state = store.getState();
            const account = state.accounts.accounts[result.tag];
            
            expect(account.name).toBe('Test Account');
            expect(account.type).toBe('standard');
            expect(account.address).toBeTruthy();
            expect(account.wotsIndex).toBe(0);
            expect(account.seed).toBeTruthy();
            expect(account.order).toBe(0);
            
            // Check storage
            const storedAccounts = await mockStorage.loadAccounts();
            expect(storedAccounts.length).toBe(1);
            expect(storedAccounts[0].tag).toBe(result.tag);
        });

        it('should create account with default name if none provided', async () => {
            const result = await store.dispatch(createAccountAction());
            
            const state = store.getState();
            expect(state.accounts.accounts[result.tag].name).toBe('Account 1');
        });

        it('should increment highest index', async () => {
            await store.dispatch(createAccountAction('Account 1'));
            await store.dispatch(createAccountAction('Account 2'));
            
            const state = store.getState();
            expect(state.wallet.highestAccountIndex).toBe(1);
            
            // Check storage
            const highestIndex = await mockStorage.loadHighestIndex();
            expect(highestIndex).toBe(1);
        });
    });

    describe('exportWalletJSONAction', () => {
        beforeEach(async () => {
            await setupUnlockedWallet();
        });

        it('should export wallet with accounts', async () => {
            await store.dispatch(createAccountAction('Test Account'));
            
            const exported = await store.dispatch(exportWalletJSONAction(testPassword));
            
            expect(exported.version).toBe('1.0.0');
            expect(exported.encrypted).toBeTruthy();
            expect(Object.keys(exported.accounts).length).toBe(1);
        });

        it('should fail if wallet is locked', async () => {
            await store.dispatch(lockWalletAction());
            
            await expect(
                store.dispatch(exportWalletJSONAction(testPassword))
            ).rejects.toThrow('Wallet is locked');
        });
    });

    describe('setSelectedAccountAction', () => {
        it('should set and persist selected account', async () => {
            await setupUnlockedWallet();
            const account = await store.dispatch(createAccountAction('Test Account'));
            
            await store.dispatch(setSelectedAccountAction(account.tag));
            
            const state = store.getState();
            expect(state.accounts.selectedAccount).toBe(account.tag);
            
            // Check storage
            const storedActiveAccount = await mockStorage.loadActiveAccount();
            expect(storedActiveAccount).toBe(account.tag);
        });
    });

    describe('lockWalletAction', () => {
        it('should lock wallet and clear session', async () => {
            await setupUnlockedWallet();
            await store.dispatch(lockWalletAction());
            
            const state = store.getState();
            expect(state.wallet.locked).toBe(true);
            
            // Try to create account (should fail because wallet is locked)
            await expect(
                store.dispatch(createAccountAction('Test'))
            ).rejects.toThrow();
        });
    });
}); 