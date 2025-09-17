import { useCallback, useEffect, useMemo, useState } from 'react';
import { Account } from '../../types/account';
import { ActivityFetchOptions } from '../../types/network';
import {
    fetchAccountActivityAction,
    fetchConfirmedTransactionsAction,
    fetchMempoolTransactionsAction,
    fetchRecentActivityAction,
    loadMoreAccountActivityAction,
    loadMoreActivityAction,
    refreshActivityAction
} from '../actions/transactionActions';
import {
    selectAccountActivity,
    selectAccountPagination,
    selectAccountTransactions,
    selectActivityError,
    selectActivityLoading,
    selectActivityPagination,
    selectActivityTransactions,
    selectConfirmedTransactions,
    selectIsAccountDataStale,
    selectPendingTransactions,
    selectReceiveTransactions,
    selectRecentTransactions,
    selectSendTransactions,
    selectTransactionCountByAddress,
    selectTransactionsByAddress,
    selectTransactionsByAmountRange,
    selectTransactionsByBlockRange,
    selectTransactionsByDateRange,
    selectTransactionsByType,
    selectTransactionStats,
    selectTransactionsWithMemos,
    selectTransactionsWithoutMemos,
    selectUniqueAddresses
} from '../selectors/activitySelectors';
import { useAppDispatch, useAppSelector } from './useStore';

/**
 * Main hook for managing transaction activity with pagination
 */
export const useActivity = () => {
    const dispatch = useAppDispatch();
    
    // Selectors
    const isLoading = useAppSelector(selectActivityLoading);
    const error = useAppSelector(selectActivityError);
    const transactions = useAppSelector(selectActivityTransactions);
    const pagination = useAppSelector(selectActivityPagination);
    
    // Computed selectors
    const sendTransactions = useAppSelector(selectSendTransactions);
    const receiveTransactions = useAppSelector(selectReceiveTransactions);
    const pendingTransactions = useAppSelector(selectPendingTransactions);
    const confirmedTransactions = useAppSelector(selectConfirmedTransactions);
    const stats = useAppSelector(selectTransactionStats);
    const recentTransactions = useAppSelector(selectRecentTransactions);
    
    // Filter functions
    const getTransactionsByType = useAppSelector(selectTransactionsByType);
    const getTransactionsByDateRange = useAppSelector(selectTransactionsByDateRange);
    const getTransactionsByAmountRange = useAppSelector(selectTransactionsByAmountRange);
    const getTransactionsByAddress = useAppSelector(selectTransactionsByAddress);
    const getTransactionsByBlockRange = useAppSelector(selectTransactionsByBlockRange);
    
    // Additional data
    const transactionsWithMemos = useAppSelector(selectTransactionsWithMemos);
    const transactionsWithoutMemos = useAppSelector(selectTransactionsWithoutMemos);
    const uniqueAddresses = useAppSelector(selectUniqueAddresses);
    const transactionCountByAddress = useAppSelector(selectTransactionCountByAddress);

    // Actions
    const fetchActivity = useCallback(async (options: ActivityFetchOptions = {}) => {
        return dispatch(fetchRecentActivityAction(options)).unwrap();
    }, [dispatch]);

    const loadMore = useCallback(async (options: ActivityFetchOptions = {}) => {
        return dispatch(loadMoreActivityAction(options)).unwrap();
    }, [dispatch]);

    const refresh = useCallback(async (options: ActivityFetchOptions = {}) => {
        return dispatch(refreshActivityAction(options)).unwrap();
    }, [dispatch]);

    const fetchConfirmed = useCallback(async (options: ActivityFetchOptions = {}) => {
        return dispatch(fetchConfirmedTransactionsAction(options)).unwrap();
    }, [dispatch]);

    const fetchMempool = useCallback(async () => {
        return dispatch(fetchMempoolTransactionsAction()).unwrap();
    }, [dispatch]);

    return {
        // State
        isLoading,
        error,
        transactions,
        pagination,
        
        // Computed data
        sendTransactions,
        receiveTransactions,
        pendingTransactions,
        confirmedTransactions,
        stats,
        recentTransactions,
        transactionsWithMemos,
        transactionsWithoutMemos,
        uniqueAddresses,
        transactionCountByAddress,
        
        // Filter functions
        getTransactionsByType,
        getTransactionsByDateRange,
        getTransactionsByAmountRange,
        getTransactionsByAddress,
        getTransactionsByBlockRange,
        
        // Actions
        fetchActivity,
        loadMore,
        refresh,
        fetchConfirmed,
        fetchMempool,
        
        // Computed properties
        hasMore: pagination.hasMore,
        totalCount: pagination.totalCount,
        currentOffset: pagination.currentOffset,
        canLoadMore: pagination.hasMore && !isLoading
    };
};

/**
 * Hook for managing activity for a specific account
 */
export const useAccountActivity = (account: Account) => {
    const dispatch = useAppDispatch();
    const globalIsLoading = useAppSelector(selectActivityLoading);
    const globalError = useAppSelector(selectActivityError);
    
    // Selectors for specific account
    const accountData = useAppSelector(state => selectAccountActivity(state)(account.tag));
    const accountTransactions = useAppSelector(state => selectAccountTransactions(state)(account.tag));
    const accountPagination = useAppSelector(state => selectAccountPagination(state)(account.tag));
    const isStale = useAppSelector(state => selectIsAccountDataStale(state)(account.tag));
    
    // Computed data for this account
    const sendTransactions = useMemo(() => 
        accountTransactions.filter(tx => tx.type === 'send'), [accountTransactions]);
    const receiveTransactions = useMemo(() => 
        accountTransactions.filter(tx => tx.type === 'receive'), [accountTransactions]);
    const pendingTransactions = useMemo(() => 
        accountTransactions.filter(tx => tx.pending), [accountTransactions]);
    const confirmedTransactions = useMemo(() => 
        accountTransactions.filter(tx => !tx.pending), [accountTransactions]);
    
    const stats = useMemo(() => {
        let totalSent = BigInt(0);
        let totalReceived = BigInt(0);
        let totalFees = BigInt(0);
        let sendCount = 0;
        let receiveCount = 0;

        for (const tx of accountTransactions) {
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
            totalTransactions: accountTransactions.length,
            totalSent: totalSent.toString(),
            totalReceived: totalReceived.toString(),
            totalFees: totalFees.toString(),
            sendCount,
            receiveCount
        };
    }, [accountTransactions]);

    // Actions
    const fetchAccountActivity = useCallback(async (options: ActivityFetchOptions = {}) => {
        return dispatch(fetchAccountActivityAction({ account, options })).unwrap();
    }, [dispatch, account]);

    const loadMoreAccountActivity = useCallback(async (options: ActivityFetchOptions = {}) => {
        return dispatch(loadMoreAccountActivityAction({ account, options })).unwrap();
    }, [dispatch, account]);

    return {
        // State
        accountData,
        transactions: accountTransactions,
        pagination: accountPagination,
        isStale,
        isLoading: globalIsLoading,
        error: globalError,
        
        // Computed data
        sendTransactions,
        receiveTransactions,
        pendingTransactions,
        confirmedTransactions,
        stats,
        
        // Actions
        fetchAccountActivity,
        loadMoreAccountActivity,
        
        // Computed properties
        hasMore: accountPagination?.hasMore || false,
        totalCount: accountPagination?.totalCount || 0,
        currentOffset: accountPagination?.currentOffset || 0,
        canLoadMore: (accountPagination?.hasMore || false) && !globalIsLoading,
        lastUpdated: accountPagination?.lastUpdated || 0
    };
};

/**
 * Hook for infinite scroll functionality
 */
export const useInfiniteScroll = (options: ActivityFetchOptions = {}) => {
    const dispatch = useAppDispatch();
    const { isLoading, hasMore, transactions, pagination } = useActivity();

    const loadMore = useCallback(async () => {
        if (!hasMore || isLoading) {
            return;
        }

        try {
            await dispatch(loadMoreActivityAction(options)).unwrap();
        } catch (error) {
            console.error('Failed to load more transactions:', error);
        }
    }, [dispatch, hasMore, isLoading, options]);

    const canLoadMore = hasMore && !isLoading;

    return {
        transactions,
        isLoading,
        hasMore,
        canLoadMore,
        loadMore,
        totalCount: pagination.totalCount,
        currentOffset: pagination.currentOffset
    };
};

/**
 * Hook for transaction filtering and search
 */
export const useTransactionFilters = () => {
    const { transactions, getTransactionsByType, getTransactionsByDateRange, getTransactionsByAmountRange, getTransactionsByAddress, getTransactionsByBlockRange } = useActivity();

    const filterByType = useCallback((type: 'send' | 'receive' | 'mining') => {
        return getTransactionsByType(type);
    }, [getTransactionsByType]);

    const filterByDateRange = useCallback((startDate: Date, endDate: Date) => {
        return getTransactionsByDateRange(startDate, endDate);
    }, [getTransactionsByDateRange]);

    const filterByAmountRange = useCallback((minAmount: string, maxAmount: string) => {
        return getTransactionsByAmountRange(minAmount, maxAmount);
    }, [getTransactionsByAmountRange]);

    const filterByAddress = useCallback((address: string) => {
        return getTransactionsByAddress(address);
    }, [getTransactionsByAddress]);

    const filterByBlockRange = useCallback((fromBlock: number, toBlock: number) => {
        return getTransactionsByBlockRange(fromBlock, toBlock);
    }, [getTransactionsByBlockRange]);

    const searchTransactions = useCallback((query: string) => {
        const lowerQuery = query.toLowerCase();
        return transactions.filter(tx => 
            tx.address.toLowerCase().includes(lowerQuery) ||
            tx.txid.toLowerCase().includes(lowerQuery) ||
            (tx.memo && tx.memo.toLowerCase().includes(lowerQuery))
        );
    }, [transactions]);

    return {
        transactions,
        filterByType,
        filterByDateRange,
        filterByAmountRange,
        filterByAddress,
        filterByBlockRange,
        searchTransactions
    };
};

/**
 * Hook for real-time transaction monitoring
 */
export const useTransactionMonitor = (intervalMs: number = 5000) => {
    const { refresh, transactions } = useActivity();
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [lastTransactionCount, setLastTransactionCount] = useState(0);

    const startMonitoring = useCallback(() => {
        setIsMonitoring(true);
        setLastTransactionCount(transactions.length);
    }, [transactions.length]);

    const stopMonitoring = useCallback(() => {
        setIsMonitoring(false);
    }, []);

    useEffect(() => {
        if (!isMonitoring) return;

        const interval = setInterval(async () => {
            try {
                await refresh();
            } catch (error) {
                console.error('Failed to refresh transactions:', error);
            }
        }, intervalMs);

        return () => clearInterval(interval);
    }, [isMonitoring, refresh, intervalMs]);

    const newTransactionCount = transactions.length - lastTransactionCount;
    const hasNewTransactions = newTransactionCount > 0;

    return {
        isMonitoring,
        startMonitoring,
        stopMonitoring,
        hasNewTransactions,
        newTransactionCount
    };
};
