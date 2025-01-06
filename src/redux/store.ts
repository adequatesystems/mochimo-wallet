import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit';
import walletReducer from './slices/walletSlice';
import networkReducer from './slices/networkSlice';
import transactionReducer from './slices/transactionSlice';
import accountReducer from './slices/accountSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        network: networkReducer,
        transaction: transactionReducer,
        accounts: accountReducer
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: false,
            thunk: true
        })
});
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
export type AppThunk<ReturnType = void> = ThunkAction<
    Promise<ReturnType>,
    RootState,
    unknown,
    Action<string>
>;