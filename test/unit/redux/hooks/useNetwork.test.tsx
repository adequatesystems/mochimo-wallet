import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNetwork } from '../../../../src/redux/hooks/useNetwork';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import { NetworkProvider } from '../../../../src/redux/context/NetworkContext';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { vi } from 'vitest';

describe('useNetwork', () => {
    let store: ReturnType<typeof configureStore>;
    
    const mockNetworkService = {
        activateTag: vi.fn().mockResolvedValue({ status: 'success' }),
        resolveTag: vi.fn(),
        pushTransaction: vi.fn(),
        getNetworkStatus: vi.fn().mockReturnValue('connected')
    };

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Create test account
        const testAccount = {
            name: 'Test Account',
            tag: '0'.repeat(64),
            type: 'standard' as const,
            faddress: '0'.repeat(64),
            balance: '1000000',
            index: 0,
            source: 'mnemonic' as const,
            wotsIndex: 0,
            seed: '0'.repeat(64)
        };
        
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer,
                accounts: accountReducer
            },
            preloadedState: {
                wallet: {
                    initialized: true,
                    locked: false,
                    hasWallet: true,
                    network: 'mainnet',
                    error: null,
                    highestAccountIndex: 0,
                    activeAccount: testAccount.tag
                },
                accounts: {
                    accounts: {
                        [testAccount.tag]: testAccount
                    },
                    selectedAccount: testAccount.tag,
                    loading: false,
                    error: null
                },
                network: {
                    status: 'connected',
                    error: null,
                    isLoading: false
                }
            }
        });

        // Setup network service
        NetworkProvider.setNetwork(mockNetworkService);
    });

    const wrapper = ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should handle tag activation', async () => {
        const { result } = renderHook(() => useNetwork(), { wrapper });

        await act(async () => {
            await result.current.activateTag();
        });

        expect(mockNetworkService.activateTag).toHaveBeenCalled();
        expect(result.current.isLoading).toBe(false);
    });

    it('should handle activation errors', async () => {
        // Remove active account to trigger error
        store.dispatch({ type: 'accounts/setSelectedAccount', payload: null });

        const { result } = renderHook(() => useNetwork(), { wrapper });

        await act(async () => {
            await expect(result.current.activateTag())
                .rejects.toThrow('No account selected');
        });

        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    });
}); 