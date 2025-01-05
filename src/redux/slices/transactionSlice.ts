import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TransactionState {
    isLoading: boolean;
    error: string | null;
    pendingTransactions: string[]; // Array of transaction hashes
}

const initialState: TransactionState = {
    isLoading: false,
    error: null,
    pendingTransactions: []
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
        }
    }
});

export const {
    setLoading,
    setError,
    addPendingTransaction,
    removePendingTransaction
} = transactionSlice.actions;

export default transactionSlice.reducer; 