import { configureStore, ThunkAction, Action } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import accountReducer from './slices/accountSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        accounts: accountReducer
    }
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
    ReturnType,
    RootState,
    unknown,
    Action<string>
>; 