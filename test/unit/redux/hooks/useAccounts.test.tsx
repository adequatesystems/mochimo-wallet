import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAccounts } from '../../../../src/redux/hooks/useAccounts';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { NetworkProvider } from '../../../../src/redux/context/NetworkContext';
import { MockStorage } from '../../../mocks/MockStorage';
import { createWalletAction } from '../../../../src/redux/actions/walletActions';
import { createAccountAction } from '../../../../src/redux/actions/walletActions';
import { renameAccountAction, reorderAccountsAction } from '../../../../src/redux/actions/accountActions';
import React from 'react';

describe('useAccounts', () => {
    const mockStorage = new MockStorage();
    const testPassword = 'test-password';

    const mockNetworkService = {
        activateTag: vi.fn().mockResolvedValue({ status: 'success' }),
        resolveTag: vi.fn().mockImplementation(async () => ({
            addressConsensus: '0'.repeat(64),
            balanceConsensus: '1000000',
            status: 'success'
        })),
        pushTransaction: vi.fn(),
        getNetworkStatus: vi.fn().mockReturnValue('connected')
    };

    beforeEach(() => {
        StorageProvider.setStorage(mockStorage);
        NetworkProvider.setNetwork(mockNetworkService);
        vi.clearAllMocks();
    });

    const setupStore = async () => {
        const store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer,
                network: networkReducer,
                transaction: transactionReducer
            },
            preloadedState: {
                wallet: {
                    hasWallet: true,
                    initialized: true,
                    locked: false,
                    error: null,
                    network: 'mainnet',
                    highestAccountIndex: -1,
                    activeAccount: null
                },
                accounts: {
                    accounts: {}
                }
            }
        });

        // Create wallet first
        await store.dispatch(createWalletAction({ password: testPassword }));

        return store;
    };

    it('should create and manage accounts', async () => {
        const store = await setupStore();

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useAccounts(), { wrapper });

        // Create account
        await act(async () => {
            await result.current.createAccount('Test Account 1');
        });

        // Verify account was created
        expect(result.current.accounts).toHaveLength(1);
        expect(result.current.accounts[0].name).toBe('Test Account 1');

        // Rename account
        const accountId = result.current.accounts[0].tag;
        await act(async () => {
            await result.current.renameAccount(accountId, 'Renamed Account');
        });

        // Verify rename
        expect(result.current.accounts[0].name).toBe('Renamed Account');

        // Create another account and test reordering
        await act(async () => {
            await result.current.createAccount('Test Account 2');
        });

        const accounts = result.current.accounts;
        await act(async () => {
            await result.current.reorderAccounts({
                [accounts[0].tag]: 1,
                [accounts[1].tag]: 0
            });
        });

        // Verify reordering
        expect(result.current.accounts[0].name).toBe('Test Account 2');
        expect(result.current.accounts[1].name).toBe('Renamed Account');
    });

    it('should handle errors gracefully', async () => {
        const store = await setupStore();

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useAccounts(), { wrapper });

        // Test error on non-existent account
        await act(async () => {
            await expect(
                result.current.renameAccount('nonexistent', 'New Name')
            ).rejects.toThrow();
        });

        // Test error on invalid reorder
        await act(async () => {
            await result.current.createAccount('Test Account');
            await expect(
                result.current.reorderAccounts({ 'nonexistent': 0 })
            ).rejects.toThrow();
        });
    });
}); 
