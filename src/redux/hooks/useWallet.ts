import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from './useStore';
import { createWalletAction, unlockWalletAction, lockWalletAction, importFromMcmFileAction, importAccountsFromMcmAction, exportWalletJSONAction, loadWalletJSONAction } from '../actions/walletActions';
import { selectWalletStatus, selectWalletError, selectNetwork } from '../selectors/walletSelectors';
import { StorageProvider } from '../context/StorageContext';
import { DecodeResult } from '@/crypto';
import { setHasWallet } from '../slices/walletSlice';
import { WalletExportedJSON } from '../types/state';
import { MasterSeed } from '@/core/MasterSeed';

export const useWallet = () => {
    const dispatch = useAppDispatch();
    const { isLocked, hasWallet, isInitialized } = useAppSelector(selectWalletStatus);
    const error = useAppSelector(selectWalletError);
    const network = useAppSelector(selectNetwork);

    const createWallet = useCallback(async (password: string, mnemonic?: string) => {
        return dispatch(createWalletAction({ password, mnemonic }));
    }, [dispatch]);

    const unlockWallet = useCallback(async (password: string, type: 'password' | 'seed' | 'jwk' | 'mnemonic' = 'password') => {
        return dispatch(unlockWalletAction(password, type));
    }, [dispatch]);

    const verifyWalletOwnership = useCallback(async (password: string) => {
        const masterSeed = await StorageProvider.getStorage().loadMasterSeed();
        if(!masterSeed) return false;
        try {
            await MasterSeed.import(masterSeed, password);
            return true;
        } catch (error) {
            return false;
        }
    }, [dispatch]);

    const getMnemonic = useCallback(async (password: string) => {
        const masterSeed = await StorageProvider.getStorage().loadMasterSeed();
        if(!masterSeed) return false;
        try {
            const ms = await MasterSeed.import(masterSeed, password);
            return ms.toPhrase()
        } catch (error) {
            throw new Error('Invalid password for mnemonic export');
        }
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

    const importFromMcmFile = useCallback(async (mcmData: DecodeResult, password: string, accountFilter?: (index: number, seed: Uint8Array, name: string) => boolean) => {
        return dispatch(importFromMcmFileAction({ mcmData, password, accountFilter }));
    }, [dispatch]);

    const importAccountsFromMcm = useCallback(async (mcmData: DecodeResult, accountFilter?: (index: number, seed: Uint8Array, name: string) => boolean) => {
        return dispatch(importAccountsFromMcmAction({ mcmData, accountFilter, source: 'mcm' }));
    }, [dispatch]);

    const importAccountsFrom = useCallback(async (source: 'mcm' | 'keypair', mcmData: DecodeResult, accountFilter?: (index: number, seed: Uint8Array, name: string) => boolean) => {
        return dispatch(importAccountsFromMcmAction({ mcmData, accountFilter, source }));
    }, [dispatch]);
    
    const setHasWalletStatus = useCallback((hasWallet: boolean) => {
        dispatch(setHasWallet(hasWallet));
    }, [dispatch]);
    const exportWalletJSON = useCallback(async (password: string) => {
        return dispatch(exportWalletJSONAction(password));
    }, [dispatch]);
    const importWalletJSON = useCallback(async (walletJSON: WalletExportedJSON, password: string) => {
        return dispatch(loadWalletJSONAction(walletJSON, password));
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
        checkWallet,
        importFromMcmFile,
        importAccountsFromMcm,
        setHasWalletStatus,
        importWalletJSON,
        exportWalletJSON,
        verifyWalletOwnership,
        getMnemonic,
        importAccountsFrom
    };
}; 