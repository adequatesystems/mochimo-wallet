import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { createWalletAction, unlockWalletAction, lockWalletAction } from '../actions/walletActions';
import { selectWalletStatus, selectWalletError, selectNetwork } from '../selectors/walletSelectors';
import { StorageProvider } from '../context/StorageContext';

export const useWallet = () => {
    const dispatch = useAppDispatch();
    const { isLocked, hasWallet, isInitialized } = useAppSelector(selectWalletStatus);
    const error = useAppSelector(selectWalletError);
    const network = useAppSelector(selectNetwork);

    const createWallet = useCallback(async (password: string, mnemonic?: string) => {
        return dispatch(createWalletAction({ password, mnemonic }));
    }, [dispatch]);

    const unlockWallet = useCallback(async (password: string) => {
        return dispatch(unlockWalletAction(password));
    }, [dispatch]);

    const lockWallet = useCallback(() => {
        if (!hasWallet) {
            throw new Error('No wallet exists');
        }
        dispatch(lockWalletAction());
    }, [dispatch, hasWallet]);

    const checkWallet = useCallback(async () => {
        const masterSeed = await StorageProvider.getStorage().loadMasterSeed();
        return Boolean(masterSeed);
    }, [dispatch]);

    return {
        isLocked,
        hasWallet,
        isInitialized,
        error,
        network,
        createWallet,
        unlockWallet,
        lockWallet,
        checkWallet
    };
}; 