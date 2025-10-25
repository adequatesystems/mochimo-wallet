import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkProvider } from '../../../../src/redux/context/NetworkContext';
import { useAccountActivity, useActivity } from '../../../../src/redux/hooks/useActivity';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
import walletReducer from '../../../../src/redux/slices/walletSlice';

// Mock the problematic modules
vi.mock('mochimo-wots', async () => {
    return {
        WOTSWallet: {
            create: vi.fn().mockReturnValue({
                getAddress: vi.fn().mockReturnValue('0'.repeat(64)),
                getSecret: vi.fn().mockReturnValue('1'.repeat(64))
            })
        }
    };
});

vi.mock('mochimo-mesh-api-client', () => ({
    MochimoApiClient: vi.fn().mockImplementation(() => ({
        searchTransactionsByAddress: vi.fn(),
        getMempoolTransactions: vi.fn(),
        getMempoolTransaction: vi.fn()
    }))
}));

describe('useActivity (pagination)', () => {
    let store: ReturnType<typeof configureStore>;
    let mockNetworkService: any;

    beforeEach(() => {
        // Create mock network service
        mockNetworkService = {
            fetchRecentActivity: vi.fn(),
            fetchConfirmedTransactions: vi.fn(),
            fetchMempoolTransactions: vi.fn()
        };

        // Setup network service
        NetworkProvider.setNetwork(mockNetworkService);

        // Create test account (tags should be 20 bytes = 40 hex chars)
        const testAccount = {
            name: 'Test Account',
            tag: '0'.repeat(40),
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
                accounts: accountReducer,
                transaction: transactionReducer
            },
            preloadedState: {
                wallet: {
                    initialized: true,
                    locked: false,
                    hasWallet: true,
                    network: 'mainnet',
                    error: null,
                    highestAccountIndex: 0
                },
                accounts: {
                    accounts: {
                        [testAccount.tag]: testAccount
                    },
                    selectedAccount: testAccount.tag,
                    loading: false,
                    error: null
                },
                transaction: {
                    isLoading: false,
                    error: null,
                    pendingTransactions: [],
                    activity: {
                        isLoading: false,
                        error: null,
                        transactions: [],
                        totalCount: 0,
                        hasMore: false,
                        currentOffset: 0,
                        lastFetchOptions: null
                    },
                    accountActivity: {}
                }
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should return initial activity state', () => {
        const { result } = renderHook(() => useActivity(), { wrapper });

        expect(result.current.transactions).toEqual([]);
        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.hasMore).toBe(false);
        expect(result.current.totalCount).toBe(0);
    });

    it('should handle fetching activity', async () => {
        const mockTransactions = [
            { type: 'receive', amount: '123', timestamp: Date.now(), address: '0xabc', txid: 'tx1', pending: false }
        ];

        mockNetworkService.fetchRecentActivity.mockResolvedValue({
            transactions: mockTransactions,
            totalCount: 1,
            hasMore: false,
            nextOffset: 0
        });

        const { result } = renderHook(() => useActivity(), { wrapper });

        await act(async () => {
            await result.current.fetchActivity({ limit: 20, offset: 0 });
        });

        expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(
            expect.objectContaining({ tag: '0'.repeat(40) }),
            { limit: 20, offset: 0 }
        );
        expect(result.current.transactions).toEqual(mockTransactions);
        expect(result.current.totalCount).toBe(1);
        expect(result.current.hasMore).toBe(false);
    });

    it('should handle loading more activity', async () => {
        const initialTransactions = [
            { type: 'send', amount: '1', timestamp: Date.now(), address: '0x1', txid: 'tx1', pending: false }
        ];
        const moreTransactions = [
            { type: 'receive', amount: '2', timestamp: Date.now(), address: '0x2', txid: 'tx2', pending: false }
        ];

        mockNetworkService.fetchRecentActivity
            .mockResolvedValueOnce({
                transactions: initialTransactions,
                totalCount: 2,
                hasMore: true,
                nextOffset: 1
            })
            .mockResolvedValueOnce({
                transactions: moreTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 2
            });

        const { result } = renderHook(() => useActivity(), { wrapper });

        // Load initial data
        await act(async () => {
            await result.current.fetchActivity({ limit: 1, offset: 0 });
        });

        expect(result.current.transactions).toEqual(initialTransactions);
        expect(result.current.hasMore).toBe(true);

        // Load more data
        await act(async () => {
            await result.current.loadMore({ limit: 1 });
        });

        expect(result.current.transactions).toEqual([...initialTransactions, ...moreTransactions]);
        expect(result.current.hasMore).toBe(false);
    });

    it('should handle account-specific activity', async () => {
        const mockTransactions = [
            { type: 'receive', amount: '100', timestamp: Date.now(), address: '0xabc', txid: 'tx1', pending: false }
        ];

        mockNetworkService.fetchRecentActivity.mockResolvedValue({
            transactions: mockTransactions,
            totalCount: 1,
            hasMore: false,
            nextOffset: 0
        });

        const testAccount = {
            name: 'Test Account',
            tag: '0'.repeat(40),
            type: 'standard' as const,
            faddress: '0'.repeat(64),
            balance: '1000000',
            index: 0,
            source: 'mnemonic' as const,
            wotsIndex: 0,
            seed: '0'.repeat(64)
        };

        const { result } = renderHook(() => useAccountActivity(testAccount), { wrapper });

        await act(async () => {
            await result.current.fetchAccountActivity({ limit: 20, offset: 0 });
        });

        expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(
            testAccount,
            { limit: 20, offset: 0 }
        );
        expect(result.current.transactions).toEqual(mockTransactions);
    });
});


