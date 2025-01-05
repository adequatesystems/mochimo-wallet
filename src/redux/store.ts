import { Action, ThunkAction, configureStore } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import accountReducer from './slices/accountSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        accounts: accountReducer
    }
});
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Update this type to handle async actions properly
export type AppThunk<ReturnType = void> = ThunkAction<
    Promise<ReturnType>,
    RootState,
    unknown,
    Action<string>
>;