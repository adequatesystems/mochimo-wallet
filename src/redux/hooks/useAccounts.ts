import { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../store';
import { renameAccountAction, reorderAccountsAction, deleteAccountAction } from '../actions/accountActions';
import { createAccountAction, setSelectedAccountAction } from '../actions/walletActions';

export const useAccounts = () => {
    const dispatch = useDispatch<AppDispatch>();

    const accounts = useSelector((state: RootState) => state.accounts.accounts);
    const selectedAccount = useSelector((state: RootState) => state.accounts.selectedAccount);

    const sortedAccounts = useMemo(() => {
        return Object.values(accounts).sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }, [accounts]);

    const createAccount = useCallback(async (name: string) => {
        return await dispatch(createAccountAction(name));
    }, [dispatch]);

    const renameAccount = useCallback(async (id: string, name: string) => {
        return await dispatch(renameAccountAction(id, name));
    }, [dispatch]);

    const deleteAccount = useCallback(async (id: string) => {
        return await dispatch(deleteAccountAction(id));
    }, [dispatch]);

    const reorderAccounts = useCallback(async (newOrder: Record<string, number>) => {
        return await dispatch(reorderAccountsAction(newOrder));
    }, [dispatch]);

    const setSelectedAccount = useCallback(async (id: string | null) => {
        return await dispatch(setSelectedAccountAction(id));
    }, [dispatch]);
    
    return {
        accounts: sortedAccounts,
        selectedAccount,
        createAccount,
        renameAccount,
        deleteAccount,
        reorderAccounts,
        setSelectedAccount
    };
}; 