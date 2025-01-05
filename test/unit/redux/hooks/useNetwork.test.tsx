import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNetwork } from '../../../../src/redux/hooks/useNetwork';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import type { PropsWithChildren } from 'react';
import React from 'react';

describe('useNetwork', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer
            }
        });
    });

    const wrapper = ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should handle tag activation', async () => {
        const { result } = renderHook(() => useNetwork(), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();

        await act(async () => {
            await result.current.activateTag();
        });

        expect(result.current.isLoading).toBe(false);
    });

    it('should handle activation errors', async () => {
        const { result } = renderHook(() => useNetwork(), { wrapper });

        // Mock error condition
        store.dispatch({ type: 'wallet/setWallet', payload: null });

        await act(async () => {
            await expect(result.current.activateTag()).rejects.toThrow('No wallet or active account');
        });

        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    });
}); 