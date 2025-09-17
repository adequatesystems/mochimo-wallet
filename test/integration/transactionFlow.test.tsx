import { configureStore } from '@reduxjs/toolkit';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkProvider } from '../../src/redux/context/NetworkContext';
import { StorageProvider } from '../../src/redux/context/StorageContext';
import { useAccounts } from '../../src/redux/hooks/useAccounts';
import { useAccountActivity, useActivity } from '../../src/redux/hooks/useActivity';
import { useTransaction } from '../../src/redux/hooks/useTransaction';
import accountReducer from '../../src/redux/slices/accountSlice';
import transactionReducer, { addPendingTransaction, removePendingTransaction } from '../../src/redux/slices/transactionSlice';
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

describe('Transaction Flow Integration', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    let mockNetworkService: any;
    let testPassword = 'testPassword123';

    // Test accounts
    const senderAccount = {
        name: 'Sender Account',
        tag: '0'.repeat(40),
        type: 'standard' as const,
        faddress: '0'.repeat(64),
        balance: '1000000',
        index: 0,
        source: 'mnemonic' as const,
        wotsIndex: 0,
        seed: '0'.repeat(64)
    };

    const receiverAccount = {
        name: 'Receiver Account', 
        tag: '1'.repeat(40),
        type: 'standard' as const,
        faddress: '1'.repeat(64),
        balance: '500000',
        index: 1,
        source: 'mnemonic' as const,
        wotsIndex: 1,
        seed: '1'.repeat(64)
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
            pushTransaction: vi.fn().mockResolvedValue({ 
                success: true, 
                txid: 'test-tx-' + Date.now(),
                status: 'pending'
            }),
            resolveTag: vi.fn().mockImplementation(async (tag: string) => ({
                addressConsensus: tag === senderAccount.tag ? senderAccount.faddress : receiverAccount.faddress,
                balanceConsensus: tag === senderAccount.tag ? senderAccount.balance : receiverAccount.balance,
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
                        [senderAccount.tag]: senderAccount,
                        [receiverAccount.tag]: receiverAccount
                    },
                    selectedAccount: senderAccount.tag,
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

    describe('Complete Transaction Flow', () => {
        it('should handle complete transaction flow: send -> pending -> confirmed', async () => {
            const { result: transactionResult } = renderHook(() => useTransaction(), { wrapper });
            const { result: activityResult } = renderHook(() => useActivity(), { wrapper });
            const { result: accountsResult } = renderHook(() => useAccounts(), { wrapper });

            // Mock initial transaction data
            const initialTransactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 10000,
                    address: senderAccount.faddress,
                    txid: 'initial-tx-1',
                    blockNumber: 12340,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: initialTransactions,
                totalCount: 1,
                hasMore: false,
                nextOffset: 1
            });

            // Load initial activity
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.pendingTransactions).toHaveLength(0);

            // Simulate sending a transaction
            const sendAmount = '50000';
            const sendTxId = 'send-tx-' + Date.now();
            
            // Add to pending transactions
            await act(async () => {
                store.dispatch(addPendingTransaction(sendTxId));
            });

            // Verify pending transaction is added
            expect(store.getState().transaction.pendingTransactions).toContain(sendTxId);

            // Mock updated activity with pending transaction
            const updatedTransactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: sendAmount,
                    timestamp: Date.now(),
                    address: receiverAccount.faddress,
                    txid: sendTxId,
                    pending: true,
                    fee: '1000'
                },
                ...initialTransactions
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: updatedTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 2
            });

            // Refresh activity to see pending transaction
            await act(async () => {
                await activityResult.current.refresh({ limit: 20, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(2);
            expect(activityResult.current.pendingTransactions).toHaveLength(1);
            expect(activityResult.current.pendingTransactions[0].txid).toBe(sendTxId);
            expect(activityResult.current.pendingTransactions[0].type).toBe('send');

            // Simulate transaction confirmation
            const confirmedTransactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: sendAmount,
                    timestamp: Date.now() - 1000,
                    address: receiverAccount.faddress,
                    txid: sendTxId,
                    blockNumber: 12345,
                    pending: false,
                    fee: '1000'
                },
                ...initialTransactions
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValue({
                transactions: confirmedTransactions,
                totalCount: 2,
                hasMore: false,
                nextOffset: 2
            });

            // Remove from pending and refresh
            await act(async () => {
                store.dispatch(removePendingTransaction(sendTxId));
            });

            await act(async () => {
                await activityResult.current.refresh({ limit: 20, offset: 0 });
            });

            // Verify transaction is now confirmed
            expect(store.getState().transaction.pendingTransactions).not.toContain(sendTxId);
            expect(activityResult.current.pendingTransactions).toHaveLength(0);
            expect(activityResult.current.confirmedTransactions).toHaveLength(2);
            expect(activityResult.current.confirmedTransactions[0].txid).toBe(sendTxId);
            expect(activityResult.current.confirmedTransactions[0].pending).toBe(false);
        });

        it('should handle cross-account transaction visibility', async () => {
            const { result: senderActivity } = renderHook(() => useAccountActivity(senderAccount), { wrapper });
            const { result: receiverActivity } = renderHook(() => useAccountActivity(receiverAccount), { wrapper });

            // Mock transaction data showing cross-account transaction
            const crossAccountTx: WalletTransaction = {
                type: 'send',
                amount: '25000',
                timestamp: Date.now() - 1000,
                address: receiverAccount.faddress,
                txid: 'cross-account-tx-1',
                blockNumber: 12345,
                pending: false,
                fee: '500'
            };

            // Mock sender's view (outgoing transaction)
            mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
                transactions: [crossAccountTx],
                totalCount: 1,
                hasMore: false,
                nextOffset: 1
            });

            // Mock receiver's view (incoming transaction)
            const receiverTx: WalletTransaction = {
                ...crossAccountTx,
                type: 'receive',
                address: senderAccount.faddress
            };

            mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
                transactions: [receiverTx],
                totalCount: 1,
                hasMore: false,
                nextOffset: 1
            });

            // Fetch activity for both accounts
            await act(async () => {
                await senderActivity.current.fetchAccountActivity({ limit: 20, offset: 0 });
            });

            await act(async () => {
                await receiverActivity.current.fetchAccountActivity({ limit: 20, offset: 0 });
            });

            // Verify sender sees outgoing transaction
            expect(senderActivity.current.transactions).toHaveLength(1);
            expect(senderActivity.current.transactions[0].type).toBe('send');
            expect(senderActivity.current.transactions[0].txid).toBe('cross-account-tx-1');
            expect(senderActivity.current.sendTransactions).toHaveLength(1);

            // Verify receiver sees incoming transaction
            expect(receiverActivity.current.transactions).toHaveLength(1);
            expect(receiverActivity.current.transactions[0].type).toBe('receive');
            expect(receiverActivity.current.transactions[0].txid).toBe('cross-account-tx-1');
            expect(receiverActivity.current.receiveTransactions).toHaveLength(1);

            // Verify transaction stats are correct for each account
            expect(senderActivity.current.stats.sendCount).toBe(1);
            expect(senderActivity.current.stats.receiveCount).toBe(0);
            expect(receiverActivity.current.stats.sendCount).toBe(0);
            expect(receiverActivity.current.stats.receiveCount).toBe(1);
        });

        it('should handle account switching during transaction processing', async () => {
            const { result: activityResult } = renderHook(() => useActivity(), { wrapper });
            const { result: accountsResult } = renderHook(() => useAccounts(), { wrapper });

            // Start with sender account
            expect(accountsResult.current.selectedAccount).toBe(senderAccount.tag);

            // Mock sender's transactions
            const senderTransactions: WalletTransaction[] = [
                {
                    type: 'send',
                    amount: '30000',
                    timestamp: Date.now() - 1000,
                    address: receiverAccount.faddress,
                    txid: 'sender-tx-1',
                    blockNumber: 12345,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
                transactions: senderTransactions,
                totalCount: 1,
                hasMore: false,
                nextOffset: 1
            });

            // Fetch activity for sender
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.transactions[0].type).toBe('send');

            // Switch to receiver account
            await act(async () => {
                await accountsResult.current.setSelectedAccount(receiverAccount.tag);
            });

            expect(accountsResult.current.selectedAccount).toBe(receiverAccount.tag);

            // Mock receiver's transactions
            const receiverTransactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '30000',
                    timestamp: Date.now() - 1000,
                    address: senderAccount.faddress,
                    txid: 'sender-tx-1', // Same transaction, different perspective
                    blockNumber: 12345,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
                transactions: receiverTransactions,
                totalCount: 1,
                hasMore: false,
                nextOffset: 1
            });

            // Fetch activity for receiver
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.transactions[0].type).toBe('receive');
            expect(activityResult.current.transactions[0].txid).toBe('sender-tx-1');
        });

        it('should handle multiple transactions with proper sorting and pagination', async () => {
            const { result: activityResult } = renderHook(() => useActivity(), { wrapper });

            // Create multiple transactions with different timestamps
            const transactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 1000,
                    address: senderAccount.faddress,
                    txid: 'tx-1',
                    blockNumber: 12345,
                    pending: false
                },
                {
                    type: 'send',
                    amount: '50000',
                    timestamp: Date.now() - 2000,
                    address: receiverAccount.faddress,
                    txid: 'tx-2',
                    blockNumber: 12344,
                    pending: false
                },
                {
                    type: 'receive',
                    amount: '75000',
                    timestamp: Date.now() - 3000,
                    address: senderAccount.faddress,
                    txid: 'tx-3',
                    blockNumber: 12343,
                    pending: false
                }
            ];

            // Test pagination with limit of 2
            mockNetworkService.fetchRecentActivity
                .mockResolvedValueOnce({
                    transactions: transactions.slice(0, 2), // First 2 transactions
                    totalCount: 3,
                    hasMore: true,
                    nextOffset: 2
                })
                .mockResolvedValueOnce({
                    transactions: transactions.slice(2), // Last transaction
                    totalCount: 3,
                    hasMore: false,
                    nextOffset: 3
                });

            // Load first page
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 2, offset: 0 });
            });

            expect(activityResult.current.transactions).toHaveLength(2);
            expect(activityResult.current.hasMore).toBe(true);
            expect(activityResult.current.totalCount).toBe(3);

            // Load second page
            await act(async () => {
                await activityResult.current.loadMore({ limit: 2 });
            });

            expect(activityResult.current.transactions).toHaveLength(3);
            expect(activityResult.current.hasMore).toBe(false);

            // Verify transactions are sorted by timestamp (newest first)
            const sortedTxs = activityResult.current.transactions;
            expect(sortedTxs[0].timestamp).toBeGreaterThan(sortedTxs[1].timestamp);
            expect(sortedTxs[1].timestamp).toBeGreaterThan(sortedTxs[2].timestamp);

            // Verify transaction stats
            expect(activityResult.current.stats.totalTransactions).toBe(3);
            expect(activityResult.current.stats.sendCount).toBe(1);
            expect(activityResult.current.stats.receiveCount).toBe(2);
        });

        it('should handle error recovery and retry logic', async () => {
            const { result: activityResult } = renderHook(() => useActivity(), { wrapper });

            // Mock network error first
            mockNetworkService.fetchRecentActivity.mockRejectedValueOnce(new Error('Network error'));

            // Attempt to fetch activity
            await act(async () => {
                try {
                    await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
                } catch (error) {
                    // Expected to throw
                }
            });

            // Verify error state
            expect(activityResult.current.error).toBeTruthy();
            expect(activityResult.current.isLoading).toBe(false);

            // Mock successful response
            const transactions: WalletTransaction[] = [
                {
                    type: 'receive',
                    amount: '100000',
                    timestamp: Date.now() - 1000,
                    address: senderAccount.faddress,
                    txid: 'recovery-tx-1',
                    blockNumber: 12345,
                    pending: false
                }
            ];

            mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
                transactions,
                totalCount: 1,
                hasMore: false,
                nextOffset: 1
            });

            // Retry fetch
            await act(async () => {
                await activityResult.current.fetchActivity({ limit: 20, offset: 0 });
            });

            // Verify recovery
            expect(activityResult.current.error).toBeNull();
            expect(activityResult.current.transactions).toHaveLength(1);
            expect(activityResult.current.isLoading).toBe(false);
        });
    });
});
