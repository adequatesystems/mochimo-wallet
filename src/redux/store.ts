import { configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import accountReducer from './slices/accountSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        accounts: accountReducer
    }
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 