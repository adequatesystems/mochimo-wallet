import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

/**
 * Select the current activity state
 */
export const selectActivityState = (state: RootState) => state.transaction.activity;

/**
 * Select the account activity cache
 */
export const selectAccountActivityCache = (state: RootState) => state.transaction.accountActivity;

/**
 * Select activity loading state
 */
export const selectActivityLoading = createSelector(
    [selectActivityState],
    (activity) => activity.isLoading
);

/**
 * Select activity error
 */
export const selectActivityError = createSelector(
    [selectActivityState],
    (activity) => activity.error
);

/**
 * Select all activity transactions
 */
export const selectActivityTransactions = createSelector(
    [selectActivityState],
    (activity) => activity.transactions
);

/**
 * Select activity pagination info
 */
export const selectActivityPagination = createSelector(
    [selectActivityState],
    (activity) => ({
        totalCount: activity.totalCount,
        hasMore: activity.hasMore,
        currentOffset: activity.currentOffset,
        lastFetchOptions: activity.lastFetchOptions
    })
);

/**
 * Select transactions by type
 */
export const selectTransactionsByType = createSelector(
    [selectActivityTransactions],
    (transactions) => (type: 'send' | 'receive' | 'mining') => 
        transactions.filter(tx => tx.type === type)
);

/**
 * Select send transactions
 */
export const selectSendTransactions = createSelector(
    [selectActivityTransactions],
    (transactions) => transactions.filter(tx => tx.type === 'send')
);

/**
 * Select receive transactions
 */
export const selectReceiveTransactions = createSelector(
    [selectActivityTransactions],
    (transactions) => transactions.filter(tx => tx.type === 'receive')
);

/**
 * Select pending transactions (from mempool)
 */
export const selectPendingTransactions = createSelector(
    [selectActivityTransactions],
    (transactions) => transactions.filter(tx => tx.pending)
);

/**
 * Select confirmed transactions
 */
export const selectConfirmedTransactions = createSelector(
    [selectActivityTransactions],
    (transactions) => transactions.filter(tx => !tx.pending)
);

/**
 * Select transactions by date range
 */
export const selectTransactionsByDateRange = createSelector(
    [selectActivityTransactions],
    (transactions) => (startDate: Date, endDate: Date) => 
        transactions.filter(tx => {
            const txDate = new Date(tx.timestamp);
            return txDate >= startDate && txDate <= endDate;
        })
);

/**
 * Select transactions by amount range
 */
export const selectTransactionsByAmountRange = createSelector(
    [selectActivityTransactions],
    (transactions) => (minAmount: string, maxAmount: string) => 
        transactions.filter(tx => {
            const amount = BigInt(tx.amount);
            const min = BigInt(minAmount);
            const max = BigInt(maxAmount);
            return amount >= min && amount <= max;
        })
);

/**
 * Select transactions by address
 */
export const selectTransactionsByAddress = createSelector(
    [selectActivityTransactions],
    (transactions) => (address: string) => 
        transactions.filter(tx => 
            tx.address.toLowerCase().includes(address.toLowerCase())
        )
);

/**
 * Select transaction statistics
 */
export const selectTransactionStats = createSelector(
    [selectActivityTransactions],
    (transactions) => {
        let totalSent = BigInt(0);
        let totalReceived = BigInt(0);
        let totalFees = BigInt(0);
        let sendCount = 0;
        let receiveCount = 0;

        for (const tx of transactions) {
            if (tx.type === 'send') {
                totalSent += BigInt(tx.amount);
                sendCount++;
                if (tx.fee) {
                    totalFees += BigInt(tx.fee);
                }
            } else if (tx.type === 'receive') {
                totalReceived += BigInt(tx.amount);
                receiveCount++;
            }
        }

        return {
            totalTransactions: transactions.length,
            totalSent: totalSent.toString(),
            totalReceived: totalReceived.toString(),
            totalFees: totalFees.toString(),
            sendCount,
            receiveCount
        };
    }
);

/**
 * Select recent transactions (last N transactions)
 */
export const selectRecentTransactions = createSelector(
    [selectActivityTransactions],
    (transactions) => (count: number = 10) => 
        transactions.slice(0, count)
);

/**
 * Select account activity by account ID
 */
export const selectAccountActivity = createSelector(
    [selectAccountActivityCache],
    (cache) => (accountId: string) => cache[accountId] || null
);

/**
 * Select account transactions by account ID
 */
const EMPTY_TRANSACTIONS: any[] = [];
export const selectAccountTransactions = createSelector(
    [selectAccountActivityCache],
    (cache) => (accountId: string) => cache[accountId]?.transactions ?? EMPTY_TRANSACTIONS
);

/**
 * Select account pagination info by account ID
 */
export const selectAccountPagination = createSelector(
    [selectAccountActivityCache],
    (cache) => (accountId: string) => cache[accountId] || null
);

/**
 * Select if account data is stale (older than 5 minutes)
 */
export const selectIsAccountDataStale = createSelector(
    [selectAccountActivityCache],
    (cache) => (accountId: string) => {
        const accountData = cache[accountId];
        if (!accountData) return true;
        
        return (Date.now() - accountData.lastUpdated) > 5 * 60 * 1000;
    }
);

/**
 * Select all cached account IDs
 */
export const selectCachedAccountIds = createSelector(
    [selectAccountActivityCache],
    (cache) => Object.keys(cache)
);

/**
 * Select total cached transactions count across all accounts
 */
export const selectTotalCachedTransactions = createSelector(
    [selectAccountActivityCache],
    (cache) => {
        return Object.values(cache).reduce((total, accountData) => 
            total + accountData.transactions.length, 0
        );
    }
);

/**
 * Select transactions with memos
 */
export const selectTransactionsWithMemos = createSelector(
    [selectActivityTransactions],
    (transactions) => transactions.filter(tx => tx.memo && tx.memo.trim() !== '')
);

/**
 * Select transactions without memos
 */
export const selectTransactionsWithoutMemos = createSelector(
    [selectActivityTransactions],
    (transactions) => transactions.filter(tx => !tx.memo || tx.memo.trim() === '')
);

/**
 * Select transactions by block number range
 */
export const selectTransactionsByBlockRange = createSelector(
    [selectActivityTransactions],
    (transactions) => (fromBlock: number, toBlock: number) => 
        transactions.filter(tx => 
            tx.blockNumber && tx.blockNumber >= fromBlock && tx.blockNumber <= toBlock
        )
);

/**
 * Select unique addresses from transactions
 */
export const selectUniqueAddresses = createSelector(
    [selectActivityTransactions],
    (transactions) => {
        const addresses = new Set<string>();
        transactions.forEach(tx => {
            if (tx.address) {
                addresses.add(tx.address);
            }
        });
        return Array.from(addresses);
    }
);

/**
 * Select transaction count by address
 */
export const selectTransactionCountByAddress = createSelector(
    [selectActivityTransactions],
    (transactions) => {
        const addressCounts: Record<string, number> = {};
        transactions.forEach(tx => {
            if (tx.address) {
                addressCounts[tx.address] = (addressCounts[tx.address] || 0) + 1;
            }
        });
        return addressCounts;
    }
);
