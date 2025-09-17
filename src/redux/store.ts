import { Action, AnyAction, AsyncThunk, configureStore, ThunkAction, ThunkDispatch } from '@reduxjs/toolkit';
import accountReducer from './slices/accountSlice';
import networkReducer from './slices/networkSlice';
import providersReducer from './slices/providerSlice';
import transactionReducer from './slices/transactionSlice';
import walletReducer from './slices/walletSlice';

export const store = configureStore({
    reducer: {
        wallet: walletReducer,
        network: networkReducer,
        transaction: transactionReducer,
        accounts: accountReducer,
        providers: providersReducer
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
