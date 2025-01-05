import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { createWalletAction, unlockWalletAction, lockWalletAction } from '../actions/walletActions';
import { selectWalletStatus, selectWalletError } from '../selectors/walletSelectors';

export const useWallet = () => {
    const dispatch = useAppDispatch();
    const { isLocked, hasWallet, isInitialized } = useAppSelector(selectWalletStatus);
    const error = useAppSelector(selectWalletError);

    const createWallet = useCallback(async (password: string, mnemonic?: string) => {
        return dispatch(createWalletAction(password, mnemonic));
    }, [dispatch]);

    const unlockWallet = useCallback(async (password: string) => {
        return dispatch(unlockWalletAction(password));
    }, [dispatch]);

    const lockWallet = useCallback(() => {
        dispatch(lockWalletAction());
    }, [dispatch]);

    return {
        isLocked,
        hasWallet,
        isInitialized,
        error,
        createWallet,
        unlockWallet,
        lockWallet
    };
}; 