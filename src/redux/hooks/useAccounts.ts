import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { renameAccountAction, reorderAccountsAction } from '../actions/accountActions';
import { createAccountAction } from '../actions/walletActions';

export const useAccounts = () => {
    const dispatch = useDispatch<AppDispatch>();
    
    const accounts = useSelector((state: RootState) => state.accounts.accounts);
    
    const sortedAccounts = useMemo(() => {
        return Object.values(accounts).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [accounts]);

    const createAccount = useCallback(async (name: string) => {
        return await dispatch(createAccountAction(name));
    }, [dispatch]);

    const renameAccount = useCallback(async (id: string, name: string) => {
        return await dispatch(renameAccountAction(id, name));
    }, [dispatch]);

    const reorderAccounts = useCallback(async (newOrder: Record<string, number>) => {
        return await dispatch(reorderAccountsAction(newOrder));
    }, [dispatch]);

    return {
        accounts: sortedAccounts,
        createAccount,
        renameAccount,
        reorderAccounts
    };
}; 