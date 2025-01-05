import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AccountState } from '../types/state';

const initialState: AccountState = {
    accounts: {},
    selectedAccount: null,
    loading: false,
    error: null
};

const accountSlice = createSlice({
    name: 'accounts',
    initialState,
    reducers: {
        addAccount: (state, action: PayloadAction<{
            id: string;
            account: AccountState['accounts'][string];
        }>) => {
            state.accounts[action.payload.id] = action.payload.account;
        },
        updateAccount: (state, action: PayloadAction<{
            id: string;
            updates: Partial<AccountState['accounts'][string]>;
        }>) => {
            if (state.accounts[action.payload.id]) {
                state.accounts[action.payload.id] = {
                    ...state.accounts[action.payload.id],
                    ...action.payload.updates
                };
            }
        },
        removeAccount: (state, action: PayloadAction<string>) => {
            delete state.accounts[action.payload];
            if (state.selectedAccount === action.payload) {
                state.selectedAccount = null;
            }
        },
        setSelectedAccount: (state, action: PayloadAction<string | null>) => {
            state.selectedAccount = action.payload;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
        },
        reset: () => initialState,
        renameAccount: (state, action: PayloadAction<{
            id: string;
            name: string;
        }>) => {
            if (state.accounts[action.payload.id]) {
                state.accounts[action.payload.id].name = action.payload.name;
            }
        },
        reorderAccounts: (state, action: PayloadAction<{
            orderedIds: string[];
        }>) => {
            action.payload.orderedIds.forEach((id, index) => {
                if (state.accounts[id]) {
                    state.accounts[id].order = index;
                }
            });
        },
        moveAccount: (state, action: PayloadAction<{
            id: string;
            direction: 'up' | 'down';
        }>) => {
            const { id, direction } = action.payload;
            
            const sortedAccounts = Object.entries(state.accounts)
                .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0));
            
            const currentIndex = sortedAccounts.findIndex(([accId]) => accId === id);
            if (currentIndex === -1) return;

            const targetIndex = direction === 'up' 
                ? Math.max(0, currentIndex - 1)
                : Math.min(sortedAccounts.length - 1, currentIndex + 1);

            if (currentIndex !== targetIndex) {
                const currentOrder = sortedAccounts[currentIndex][1].order ?? 0;
                const targetOrder = sortedAccounts[targetIndex][1].order ?? 0;
                
                state.accounts[id].order = targetOrder;
                state.accounts[sortedAccounts[targetIndex][0]].order = currentOrder;
            }
        },
        bulkAddAccounts: (state, action: PayloadAction<Record<string, Account>>) => {
            state.accounts = {
                ...state.accounts,
                ...action.payload
            };
        }
    }
});

export const {
    addAccount,
    updateAccount,
    removeAccount,
    setSelectedAccount,
    setLoading,
    setError,
    renameAccount,
    reorderAccounts,
    moveAccount,
    reset,
    bulkAddAccounts
} = accountSlice.actions;

export const selectOrderedAccounts = (state: { accounts: AccountState }) => {
    return Object.entries(state.accounts.accounts)
        .sort(([, a], [, b]) => (a.order ?? 0) - (b.order ?? 0))
        .map(([id, account]) => ({ id, ...account }));
};

export default accountSlice.reducer; 