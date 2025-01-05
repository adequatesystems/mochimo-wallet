import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { sendTransactionAction } from '../actions/transactionActions';
import { Amount } from '../../types/amount';

export const useTransaction = () => {
    const dispatch = useAppDispatch();
    const isLoading = useAppSelector(state => state.transaction.isLoading);
    const error = useAppSelector(state => state.transaction.error);
    const pendingTransactions = useAppSelector(state => state.transaction.pendingTransactions);

    const sendTransaction = useCallback(async (
        to: string,
        amount: Amount,
        tag?: string
    ) => {
        return dispatch(sendTransactionAction({ to, amount, tag })).unwrap();
    }, [dispatch]);

    return {
        isLoading,
        error,
        pendingTransactions,
        sendTransaction
    };
}; 