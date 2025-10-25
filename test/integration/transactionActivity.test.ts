import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkProvider } from '../../src/redux/context/NetworkContext';
import { StorageProvider } from '../../src/redux/context/StorageContext';
import { useAccounts } from '../../src/redux/hooks/useAccounts';
import { useAccountActivity, useActivity } from '../../src/redux/hooks/useActivity';
import accountReducer from '../../src/redux/slices/accountSlice';
import transactionReducer from '../../src/redux/slices/transactionSlice';
import walletReducer from '../../src/redux/slices/walletSlice';
import { AppStore } from '../../src/redux/store';
import { PaginatedTransactionResponse, WalletTransaction } from '../../src/types/network';
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

describe('Transaction Activity Integration', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    let mockNetworkService: any;
    let testPassword = 'testPassword123';

    // Test accounts
    const account1 = {
        name: 'Account 1',
        tag: '0'.repeat(40),
        type: 'standard' as const,
        faddress: '0'.repeat(64),
        balance: '1000000',
        index: 0,
        source: 'mnemonic' as const,
        wotsIndex: 0,
        seed: '0'.repeat(64)
    };

    const account2 = {
        name: 'Account 2', 
        tag: '1'.repeat(40),
        type: 'standard' as const,
        faddress: '1'.repeat(64),
        balance: '2000000',
        index: 1,
        source: 'mnemonic' as const,
        wotsIndex: 1,
        seed: '1'.repeat(64)
    };

    beforeEach(async () => {
        // Setup mock storage
        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);

        // Create mock network service with realistic transaction data
        mockNetworkService = {
            fetchRecentActivity: vi.fn(),
            fetchConfirmedTransactions: vi.fn(),
            fetchMempoolTransactions: vi.fn(),
            pushTransaction: vi.fn().mockResolvedValue({ success: true, txid: 'test-tx-123' }),
            resolveTag: vi.fn().mockImplementation(async (tag: string) => ({
                addressConsensus: tag === account1.tag ? account1.faddress : account2.faddress,
                balanceConsensus: tag === account1.tag ? account1.balance : account2.balance,
                status: 'success'
            }))
        };

        // Setup network service
        NetworkProvider.setNetwork(mockNetworkService);

        // Create store
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
                    highestAccountIndex: 1
                },
                accounts: {
                    accounts: {
                        [account1.tag]: account1,
                        [account2.tag]: account2
                    },
                    selectedAccount: account1.tag,
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

    const wrapper = ({ children }: { children: React.ReactNode }) => 
        React.createElement(Provider, { store }, children);

    describe('Transaction Activity Flow', () => {
        it('should fetch and display transaction activity for selected account', async () => {
            // Mock transaction data for account 1
            const mockTransactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 1000,
                    address: account2.faddress,
                    txid: 'tx-receive-1',
                    blockNumber: 12345,
                    pending: false,
                    memo: 'Test receive'
                },
                {
                    type: 'send',
                    amount: '50000',
                    timestamp: Date.now() - 2000,
                    address: account2.faddress,
                    txid: 'tx-send-1',
                    blockNumber: 12344,
                    pending: false,
                    fee: '1000',
                    memo: 'Test send'
                }
            ];

            const mockResponse: PaginatedTransactionResponse = {
                transactions: mockTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 2
            };

            mockNetworkService.fetchRecentActivity.mockResolvedValue(mockResponse);

            const { result } = renderHook(() => useActivity(), { wrapper });

            // Fetch activity
            await act(async () => {
                await result.current.fetchActivity({ limit: 20, offset: 0 });
            });

            // Verify state changes
            expect(result.current.transactions).toHaveLength(2);
            expect(result.current.totalCount).toBe(2);
            expect(result.current.hasMore).toBe(false);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();

            // Verify transaction types
            expect(result.current.sendTransactions).toHaveLength(1);
            expect(result.current.receiveTransactions).toHaveLength(1);
            expect(result.current.sendTransactions[0].type).toBe('send');
            expect(result.current.receiveTransactions[0].type).toBe('receive');

            // Verify network service was called correctly
            expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(
                account1,
                { limit: 20, offset: 0 }
            );
        });

        it('should handle pagination correctly', async () => {
            const initialTransactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: '1000',
                    timestamp: Date.now() - 1000,
                    address: account2.faddress,
                    txid: 'tx-1',
                    blockNumber: 12345,
                    pending: false
                }
            ];

            const moreTransactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '2000',
                    timestamp: Date.now() - 2000,
                    address: account1.faddress,
                    txid: 'tx-2',
                    blockNumber: 12344,
                    pending: false
                }
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

            expect(result.current.transactions).toHaveLength(1);
            expect(result.current.hasMore).toBe(true);

            // Load more data
            await act(async () => {
                await result.current.loadMore({ limit: 1 });
            });

            expect(result.current.transactions).toHaveLength(2);
            expect(result.current.hasMore).toBe(false);
        });

        it('should handle account switching with different transaction data', async () => {
            // Mock different transaction data for each account
            const account1Transactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 1000,
                    address: account2.faddress,
                    txid: 'acc1-receive-1',
                    blockNumber: 12345,
                    pending: false
                }
            ];

            const account2Transactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: '50000',
                    timestamp: Date.now() - 2000,
                    address: account1.faddress,
                    txid: 'acc2-send-1',
                    blockNumber: 12344,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity
                .mockResolvedValueOnce({
                    transactions: account1Transactions,
                    totalCount: 1,
                    hasMore: false,
                    nextOffset: 1
                })
                .mockResolvedValueOnce({
                    transactions: account2Transactions,
                    totalCount: 1,
                    hasMore: false,
                    nextOffset: 1
                });

            const { result: activityResult } = renderHook(() => useActivity(), { wrapper });
            const { result: accountsResult } = renderHook(() => useAccounts(), { wrapper });

            // Start with account 1
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.transactions[0].txid).toBe('acc1-receive-1');
            expect(activityResult.current.receiveTransactions).toHaveLength(1);

            // Switch to account 2
            await act(async () => {
                await accountsResult.current.setSelectedAccount(account2.tag);
            });

            // Fetch activity for account 2
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.transactions[0].txid).toBe('acc2-send-1');
            expect(activityResult.current.sendTransactions).toHaveLength(1);
        });

        it('should handle both incoming and outgoing transactions for different accounts', async () => {
            // Mock comprehensive transaction data
            const allTransactions: WalletTransaction[] = [
                // Account 1 transactions
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 1000,
                    address: account2.faddress,
                    txid: 'acc1-receive-1',
                    blockNumber: 12345,
                    pending: false,
                    memo: 'From Account 2'
                },
                {
                    type: 'send',
                    amount: '50000',
                    timestamp: Date.now() - 2000,
                    address: account2.faddress,
                    txid: 'acc1-send-1',
                    blockNumber: 12344,
                    pending: false,
                    fee: '1000',
                    memo: 'To Account 2'
                },
                // Account 2 transactions
                {
                    type: 'receive',
                    amount: '75000',
                    timestamp: Date.now() - 3000,
                    address: account1.faddress,
                    txid: 'acc2-receive-1',
                    blockNumber: 12343,
                    pending: false,
                    memo: 'From Account 1'
                },
                {
                    type: 'send',
                    amount: '25000',
                    timestamp: Date.now() - 4000,
                    address: account1.faddress,
                    txid: 'acc2-send-1',
                    blockNumber: 12342,
                    pending: false,
                    fee: '500',
                    memo: 'To Account 1'
                }
            ];

            // Test account 1 activity
            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: allTransactions.filter(tx => 
                    tx.txid.includes('acc1') || 
                    (tx.type === 'receive' && tx.address === account1.faddress) ||
                    (tx.type === 'send' && tx.address === account1.faddress)
                ),
                totalCount: 4,
                hasMore: false,
                nextOffset: 4
            });

            const { result: activityResult } = renderHook(() => useActivity(), { wrapper });

            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            // Verify we have both send and receive transactions
            expect(activityResult.current.transactions.length).toBeGreaterThan(0);
            expect(activityResult.current.sendTransactions.length).toBeGreaterThan(0);
            expect(activityResult.current.receiveTransactions.length).toBeGreaterThan(0);

            // Verify transaction stats
            expect(activityResult.current.stats.totalTransactions).toBeGreaterThan(0);
            expect(activityResult.current.stats.sendCount).toBeGreaterThan(0);
            expect(activityResult.current.stats.receiveCount).toBeGreaterThan(0);
        });

        it('should handle account-specific activity caching', async () => {
            const account1Transactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 1000,
                    address: account2.faddress,
                    txid: 'acc1-tx-1',
                    blockNumber: 12345,
                    pending: false
                }
            ];

            const account2Transactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: '50000',
                    timestamp: Date.now() - 2000,
                    address: account1.faddress,
                    txid: 'acc2-tx-1',
                    blockNumber: 12344,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity
                .mockResolvedValueOnce({
                    transactions: account1Transactions,
                    totalCount: 1,
                    hasMore: false,
                    nextOffset: 1
                })
                .mockResolvedValueOnce({
                    transactions: account2Transactions,
                    totalCount: 1,
                    hasMore: false,
                    nextOffset: 1
                });

            const { result: account1Activity } = renderHook(() => useAccountActivity(account1), { wrapper });
            const { result: account2Activity } = renderHook(() => useAccountActivity(account2), { wrapper });

            // Fetch activity for both accounts
            await act(async () => {
                await account1Activity.current.fetchAccountActivity({ limit: 20, offset: 0 });
            });

            await act(async () => {
                await account2Activity.current.fetchAccountActivity({ limit: 20, offset: 0 });
            });

            // Verify each account has its own cached data
            expect(account1Activity.current.transactions).toHaveLength(1);
            expect(account1Activity.current.transactions[0].txid).toBe('acc1-tx-1');
            expect(account1Activity.current.transactions[0].type).toBe('receive');

            expect(account2Activity.current.transactions).toHaveLength(1);
            expect(account2Activity.current.transactions[0].txid).toBe('acc2-tx-1');
            expect(account2Activity.current.transactions[0].type).toBe('send');

            // Verify network service was called for both accounts
            expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledTimes(2);
            expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(account1, { limit: 20, offset: 0 });
            expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(account2, { limit: 20, offset: 0 });
        });

        it('should handle error states gracefully', async () => {
            // Mock network error
            mockNetworkService.fetchRecentActivity.mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useActivity(), { wrapper });

            await act(async () => {
                try {
                    await result.current.fetchActivity({ limit: 20, offset: 0 });
                } catch (error) {
                    // Expected to throw
                }
            });

            // Verify error state
            expect(result.current.error).toBeTruthy();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.transactions).toHaveLength(0);
        });

        it('should handle pending transactions correctly', async () => {
            const mockTransactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: '1000',
                    timestamp: Date.now(),
                    address: account2.faddress,
                    txid: 'pending-tx-1',
                    pending: true,
                    fee: '100'
                },
                {
                    type: 'receive',
                    amount: '2000',
                    timestamp: Date.now() - 1000,
                    address: account1.faddress,
                    txid: 'confirmed-tx-1',
                    blockNumber: 12345,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: mockTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 2
            });

            const { result } = renderHook(() => useActivity(), { wrapper });

            await act(async () => {
                await result.current.fetchActivity({ limit: 20, offset: 0 });
            });

            // Verify pending vs confirmed transactions
            expect(result.current.pendingTransactions).toHaveLength(1);
            expect(result.current.confirmedTransactions).toHaveLength(1);
            expect(result.current.pendingTransactions[0].txid).toBe('pending-tx-1');
            expect(result.current.confirmedTransactions[0].txid).toBe('confirmed-tx-1');
        });
    });
});
