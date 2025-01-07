import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Base selector
const selectWallet = (state: RootState) => state.wallet;

// Memoized wallet status selector
export const selectWalletStatus = createSelector(
    selectWallet,
    (wallet) => ({
        isLocked: wallet.locked,
        hasWallet: wallet.hasWallet,
        isInitialized: wallet.initialized
    })
);

// Other wallet selectors
export const selectWalletError = createSelector(
    selectWallet,
    (wallet) => wallet.error
);

export const selectNetwork = createSelector(
    selectWallet,
    (wallet) => wallet.network
);

