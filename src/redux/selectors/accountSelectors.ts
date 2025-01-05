import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

export const selectAccounts = (state: RootState) => state.accounts.accounts;

export const selectSelectedAccount = (state: RootState) => {
    const selectedId = state.accounts.selectedAccount;
    return selectedId ? state.accounts.accounts[selectedId] : null;
};

export const selectOrderedAccounts = createSelector(
    selectAccounts,
    (accounts) => Object.values(accounts).sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
); 