import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { refreshAndCleanupActivityAction } from '../../src/redux/actions/transactionActions';
import { NetworkProvider } from '../../src/redux/context/NetworkContext';
import { StorageProvider } from '../../src/redux/context/StorageContext';
import { useAccountActivity, useTransactionMonitor } from '../../src/redux/hooks/useActivity';
import accountReducer from '../../src/redux/slices/accountSlice';
import networkReducer from '../../src/redux/slices/networkSlice';
import providersReducer from '../../src/redux/slices/providerSlice';
import transactionReducer from '../../src/redux/slices/transactionSlice';
import walletReducer from '../../src/redux/slices/walletSlice';
import { AppStore } from '../../src/redux/store';
import { WalletTransaction } from '../../src/types/network';
import { MockStorage } from '../mocks/MockStorage';

// Set longer timeout for integration tests
vi.setConfig({ testTimeout: 30000 }); // 30 seconds

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

describe('Transaction Polling Integration', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    let mockNetworkService: any;
    let testPassword = 'testPassword123';

    // Test account
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

    beforeEach(async () => {
        // Setup mock storage
        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);

        // Create mock network service
        mockNetworkService = {
            fetchRecentActivity: vi.fn(),
            fetchConfirmedTransactions: vi.fn(),
            fetchMempoolTransactions: vi.fn(),
            pushTransaction: vi.fn().mockResolvedValue({ success: true, txid: 'test-tx-123' }),
            resolveTag: vi.fn().mockImplementation(async (tag: string) => ({
                addressConsensus: testAccount.faddress,
                balanceConsensus: testAccount.balance,
                status: 'success'
            }))
        };

        // Setup network service
        NetworkProvider.setNetwork(mockNetworkService);

        // Create store
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer,
                transaction: transactionReducer,
                accounts: accountReducer,
                providers: providersReducer
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
                network: {
                    isConnected: true,
                    blockHeight: 1000,
                    isLoading: false,
                    error: null
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
                },
                providers: {
                    mesh: {
                        providers: [],
                        activeId: null
                    },
                    proxy: {
                        providers: [],
                        activeId: null
                    }
                }
            }
        });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => 
        React.createElement(Provider, { store }, children);

    describe('Transaction Polling Flow', () => {
        it('should start and stop monitoring correctly', async () => {
            const { result } = renderHook(() => useTransactionMonitor(100), { wrapper });

            expect(result.current.isMonitoring).toBe(false);

            act(() => {
                result.current.startMonitoring();
            });

            expect(result.current.isMonitoring).toBe(true);

            act(() => {
                result.current.stopMonitoring();
            });

            expect(result.current.isMonitoring).toBe(false);
        });

        it('should call refreshAndCleanup when monitoring', async () => {
            const mockTransactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    txid: 'tx1',
                    amount: '1000000',
                    timestamp: Date.now(),
                    pending: false,
                    address: '0x1234',
                    blockNumber: 1000
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: mockTransactions,
                totalCount: 1,
                hasMore: false,
                nextOffset: 0
            });

            const { result } = renderHook(() => useTransactionMonitor(100), { wrapper });

            act(() => {
                result.current.startMonitoring();
            });

            await waitFor(() => {
                expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalled();
            }, { timeout: 2000 });
        });

        it('should clean up confirmed pending transactions', async () => {
            // Add pending transactions to the store
            act(() => {
                store.dispatch({
                    type: 'transaction/addPendingTransaction',
                    payload: 'tx-pending-1'
                });
                store.dispatch({
                    type: 'transaction/addPendingTransaction',
                    payload: 'tx-pending-2'
                });
            });

            expect(store.getState().transaction.pendingTransactions).toHaveLength(2);

            // Mock response where only one transaction is confirmed
            const mockTransactions: WalletTransaction[] = [
                {
                    type: 'send',
                    txid: 'tx-pending-1',
                    amount: '1000000',
                    timestamp: Date.now(),
                    pending: false, // Confirmed
                    address: '0x1234',
                    blockNumber: 1001
                },
                {
                    type: 'send',
                    txid: 'tx-pending-2',
                    amount: '2000000',
                    timestamp: Date.now(),
                    pending: true, // Still pending
                    address: '0x5678'
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: mockTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 0
            });

            // Test the action directly
            await act(async () => {
                await store.dispatch(refreshAndCleanupActivityAction());
            });

            const finalState = store.getState();
            expect(finalState.transaction.pendingTransactions).toHaveLength(1);
            expect(finalState.transaction.pendingTransactions).toContain('tx-pending-2');
            expect(finalState.transaction.pendingTransactions).not.toContain('tx-pending-1');
        });

        it('should handle network errors gracefully', async () => {
            // Add a pending transaction
            act(() => {
                store.dispatch({
                    type: 'transaction/addPendingTransaction',
                    payload: 'tx-pending-error'
                });
            });

            // Mock network error
            mockNetworkService.fetchRecentActivity.mockRejectedValue(new Error('Network error'));

            const { result: monitorResult } = renderHook(() => useTransactionMonitor(100), { wrapper });

            act(() => {
                monitorResult.current.startMonitoring();
            });

            // Wait for the error to occur
            await waitFor(() => {
                expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalled();
            }, { timeout: 2000 });

            // Monitoring should still be active despite the error
            expect(monitorResult.current.isMonitoring).toBe(true);

            // Pending transaction should still be there
            const state = store.getState();
            expect(state.transaction.pendingTransactions).toContain('tx-pending-error');
        });

        it('should clear all pending transactions when none are found', async () => {
            // Add a pending transaction
            act(() => {
                store.dispatch({
                    type: 'transaction/addPendingTransaction',
                    payload: 'tx-pending-clear'
                });
            });

            // Mock response with no transactions
            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: [],
                totalCount: 0,
                hasMore: false,
                nextOffset: 0
            });

            // Test the action directly
            await act(async () => {
                await store.dispatch(refreshAndCleanupActivityAction());
            });

            const finalState = store.getState();
            expect(finalState.transaction.pendingTransactions).toHaveLength(0);
        });

        it('should work with useAccountActivity hook', async () => {
            // Mock initial activity data
            const mockTransactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    txid: 'tx-1',
                    amount: '1000000',
                    timestamp: Date.now(),
                    pending: false,
                    address: '0x1234',
                    blockNumber: 1000
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: mockTransactions,
                totalCount: 1,
                hasMore: false,
                nextOffset: 0
            });

            const { result: activityResult } = renderHook(() => useAccountActivity(testAccount), { wrapper });

            // Fetch initial data
            await act(async () => {
                await activityResult.current.fetchAccountActivity();
            });

            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.pendingTransactions).toHaveLength(0);

            // Add a pending transaction
            act(() => {
                store.dispatch({
                    type: 'transaction/addPendingTransaction',
                    payload: 'tx-pending-activity'
                });
            });

            // Mock response with the pending transaction
            const updatedTransactions: WalletTransaction[] = [
                ...mockTransactions,
                {
                    type: 'send',
                    txid: 'tx-pending-activity',
                    amount: '2000000',
                    timestamp: Date.now(),
                    pending: true,
                    address: '0x5678'
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: updatedTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 0
            });

            // Test the action directly
            await act(async () => {
                await store.dispatch(refreshAndCleanupActivityAction());
            });

            // Check that the pending transaction is still there (since it's still pending)
            const finalState = store.getState();
            expect(finalState.transaction.pendingTransactions).toHaveLength(1);
            expect(finalState.transaction.pendingTransactions).toContain('tx-pending-activity');
        });
    });
});
