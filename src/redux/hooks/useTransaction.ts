import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { sendTransactionAction,  } from '../actions/transactionActions';
import { removePendingTransaction } from '../slices/transactionSlice';

export const useTransaction = () => {
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(state => state.transaction.isLoading);
    const error = useAppSelector(state => state.transaction.error);
    const pendingTransactions = useAppSelector(state => state.transaction.pendingTransactions);

    const sendTransaction = useCallback(async (
        to: string,
        amount: bigint,
        memo?: string
    ) => {
        return dispatch(sendTransactionAction({ to, amount, memo })).unwrap();
    }, [dispatch]);
    const removePending = useCallback((txHash: string) => {
        dispatch(removePendingTransaction(txHash));
    }, [dispatch]);
    return {
        isLoading,
        error,
        pendingTransactions,
        sendTransaction,
        removePending
    };
}; 