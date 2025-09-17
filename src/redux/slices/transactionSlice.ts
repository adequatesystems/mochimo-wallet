import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ActivityFetchOptions, WalletTransaction } from '../../types/network';
import { TransactionState } from '../types/state';

const initialState: TransactionState = {
    isLoading: false,
    error: null,
    pendingTransactions: [],
    
    // Pagination state
    activity: {
        isLoading: false,
        error: null,
        transactions: [],
        totalCount: 0,
        hasMore: false,
        currentOffset: 0,
        lastFetchOptions: null
    },
    
    // Per-account activity cache
    accountActivity: {}
};

const transactionSlice = createSlice({
    name: 'transaction',
    initialState,
    reducers: {
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        addPendingTransaction: (state, action: PayloadAction<string>) => {
            state.pendingTransactions.push(action.payload);
        },
        removePendingTransaction: (state, action: PayloadAction<string>) => {
            state.pendingTransactions = state.pendingTransactions.filter(
                hash => hash !== action.payload
            );
        },
        
        // Activity pagination actions
        setActivityLoading: (state, action: PayloadAction<boolean>) => {
            state.activity.isLoading = action.payload;
        },
        setActivityError: (state, action: PayloadAction<string | null>) => {
            state.activity.error = action.payload;
        },
        setActivityData: (state, action: PayloadAction<{
            transactions: WalletTransaction[];
            totalCount: number;
            hasMore: boolean;
            currentOffset: number;
            options: ActivityFetchOptions;
        }>) => {
            const { transactions, totalCount, hasMore, currentOffset, options } = action.payload;
            state.activity.transactions = transactions;
            state.activity.totalCount = totalCount;
            state.activity.hasMore = hasMore;
            state.activity.currentOffset = currentOffset;
            state.activity.lastFetchOptions = options;
        },
        appendActivityData: (state, action: PayloadAction<{
            transactions: WalletTransaction[];
            totalCount: number;
            hasMore: boolean;
            currentOffset: number;
        }>) => {
            const { transactions, totalCount, hasMore, currentOffset } = action.payload;
            state.activity.transactions.push(...transactions);
            state.activity.totalCount = totalCount;
            state.activity.hasMore = hasMore;
            state.activity.currentOffset = currentOffset;
        },
        clearActivityData: (state) => {
            state.activity.transactions = [];
            state.activity.totalCount = 0;
            state.activity.hasMore = false;
            state.activity.currentOffset = 0;
            state.activity.lastFetchOptions = null;
        },
        
        // Per-account activity actions
        setAccountActivityData: (state, action: PayloadAction<{
            accountId: string;
            transactions: WalletTransaction[];
            totalCount: number;
            hasMore: boolean;
            currentOffset: number;
            options: ActivityFetchOptions;
        }>) => {
            const { accountId, transactions, totalCount, hasMore, currentOffset, options } = action.payload;
            state.accountActivity[accountId] = {
                transactions,
                totalCount,
                hasMore,
                currentOffset,
                lastFetchOptions: options,
                lastUpdated: Date.now()
            };
        },
        appendAccountActivityData: (state, action: PayloadAction<{
            accountId: string;
            transactions: WalletTransaction[];
            totalCount: number;
            hasMore: boolean;
            currentOffset: number;
        }>) => {
            const { accountId, transactions, totalCount, hasMore, currentOffset } = action.payload;
            if (!state.accountActivity[accountId]) {
                state.accountActivity[accountId] = {
                    transactions: [],
                    totalCount: 0,
                    hasMore: false,
                    currentOffset: 0,
                    lastFetchOptions: null,
                    lastUpdated: 0
                };
            }
            state.accountActivity[accountId].transactions.push(...transactions);
            state.accountActivity[accountId].totalCount = totalCount;
            state.accountActivity[accountId].hasMore = hasMore;
            state.accountActivity[accountId].currentOffset = currentOffset;
            state.accountActivity[accountId].lastUpdated = Date.now();
        },
        clearAccountActivityData: (state, action: PayloadAction<string>) => {
            const accountId = action.payload;
            if (state.accountActivity[accountId]) {
                state.accountActivity[accountId].transactions = [];
                state.accountActivity[accountId].totalCount = 0;
                state.accountActivity[accountId].hasMore = false;
                state.accountActivity[accountId].currentOffset = 0;
                state.accountActivity[accountId].lastFetchOptions = null;
                state.accountActivity[accountId].lastUpdated = Date.now();
            }
        },
        clearAllAccountActivityData: (state) => {
            state.accountActivity = {};
        }
    }
});

export const {
    setLoading,
    setError,
    addPendingTransaction,
    removePendingTransaction,
    setActivityLoading,
    setActivityError,
    setActivityData,
    appendActivityData,
    clearActivityData,
    setAccountActivityData,
    appendAccountActivityData,
    clearAccountActivityData,
    clearAllAccountActivityData
} = transactionSlice.actions;

export default transactionSlice.reducer; 