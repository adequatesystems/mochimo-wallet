import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useAccounts } from '../../../../src/redux/hooks/useAccounts';
import { useWallet } from '../../../../src/redux/hooks/useWallet';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import type { PropsWithChildren } from 'react';
import React from 'react';

describe('useAccounts', () => {
    let store: ReturnType<typeof configureStore>;
    
    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer
            }
        });
    });

    const wrapper = ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should create and manage accounts', async () => {
        const { result: walletResult } = renderHook(() => useWallet(), { wrapper });
        const { result } = renderHook(() => useAccounts(), { wrapper });

        // Setup wallet first
        let mnemonic: string;
        await act(async () => {
            mnemonic = await walletResult.current.createWallet('password123');
        });
        
        await act(async () => {
            await walletResult.current.unlockWallet('password123');
        });

        expect(walletResult.current.hasWallet).toBe(true);
        expect(walletResult.current.isLocked).toBe(false);

        // Create account
        let account;
        await act(async () => {
            account = await result.current.createAccount('Test Account');
        });

        expect(Object.keys(result.current.accounts).length).toBe(1);
        expect(result.current.accounts[account.tag].name).toBe('Test Account');

        // Update account
        await act(async () => {
            await result.current.updateAccount(account.tag, { name: 'Updated Name' });
        });

        expect(result.current.accounts[account.tag].name).toBe('Updated Name');

        // Create second account and delete first
        let account2;
        await act(async () => {
            account2 = await result.current.createAccount('Second Account');
        });

        await act(async () => {
            await result.current.deleteAccount(account.tag);
        });

        expect(Object.keys(result.current.accounts).length).toBe(1);
        expect(result.current.accounts[account.tag]).toBeUndefined();
        expect(result.current.accounts[account2.tag]).toBeDefined();
    });

    it('should handle errors', async () => {
        const { result } = renderHook(() => useAccounts(), { wrapper });
        
        await act(async () => {
            await expect(
                result.current.deleteAccount('non-existent')
            ).rejects.toThrow();
        });
    });
}); 