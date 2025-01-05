import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { selectAccounts, selectSelectedAccount } from '../selectors/accountSelectors';
import {  updateAccountAction, deleteAccountAction } from '../actions/accountActions';
import { Account } from '@/types/account';
import { createAccountAction } from '../actions/walletActions';

export const useAccounts = () => {
    const dispatch = useAppDispatch();
    const accounts = useAppSelector(selectAccounts);
    const selectedAccount = useAppSelector(selectSelectedAccount);

    const createAccount = useCallback(async (name?: string) => {
        return dispatch(createAccountAction(name));
    }, [dispatch]);

    const updateAccount = useCallback(async (id: string, updates: Partial<Account>) => {
        return dispatch(updateAccountAction(id, updates));
    }, [dispatch]);

    const deleteAccount = useCallback(async (id: string) => {
        return dispatch(deleteAccountAction(id));
    }, [dispatch]);

    return {
        accounts,
        selectedAccount,
        createAccount,
        updateAccount,
        deleteAccount
    };
}; 