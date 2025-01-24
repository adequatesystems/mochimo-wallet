import { Action, configureStore, ThunkAction, ThunkDispatch, AnyAction, AsyncThunk } from '@reduxjs/toolkit';
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

// Basic Redux types
export type AppStore = typeof store;
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// Thunk types
export type AsyncThunkConfig = {
    state: RootState;
    dispatch: AppDispatch;
    extra?: unknown;
    rejectValue?: unknown;
    serializedErrorType?: unknown;
    pendingMeta?: unknown;
    fulfilledMeta?: unknown;
    rejectedMeta?: unknown;
};

// Traditional Thunk type
export type AppThunk<ReturnType = void> = ThunkAction<
    Promise<ReturnType>,
    RootState,
    unknown,
    Action<string>
>;

// Typed dispatch for async actions
export type AppThunkDispatch = ThunkDispatch<RootState, unknown, AnyAction>;

// Helper type for AsyncThunk actions
export type AsyncThunkAction<Returned, ThunkArg = void> = (
    arg: ThunkArg
) => AsyncThunk<Returned, ThunkArg, AsyncThunkConfig>;
