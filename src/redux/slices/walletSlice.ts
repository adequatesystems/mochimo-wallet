import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { WalletState } from '../types/state';
import { NetworkType } from '../../types';

const initialState: WalletState = {
    initialized: false,
    locked: true,
    hasWallet: false,
    network: 'mainnet',
    error: null,
    highestAccountIndex: -1,
    activeAccount: null
};

const walletSlice = createSlice({
    name: 'wallet',
    initialState,
    reducers: {
        setInitialized: (state, action: PayloadAction<boolean>) => {
            state.initialized = action.payload;
        },
        setLocked: (state, action: PayloadAction<boolean>) => {
            state.locked = action.payload;
        },
        setHasWallet: (state, action: PayloadAction<boolean>) => {
            state.hasWallet = action.payload;
        },
        setNetwork: (state, action: PayloadAction<NetworkType>) => {
            state.network = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        reset: () => initialState,
        incrementHighestIndex: (state) => {
            state.highestAccountIndex += 1;
        },
        setHighestIndex: (state, action: PayloadAction<number>) => {
            state.highestAccountIndex = action.payload;
        }
    }
});

export const { 
    setInitialized, 
    setLocked, 
    setHasWallet, 
    setNetwork, 
    setError,
    reset,
    incrementHighestIndex,
    setHighestIndex,
    setActiveAccount
} = walletSlice.actions;

export default walletSlice.reducer; 