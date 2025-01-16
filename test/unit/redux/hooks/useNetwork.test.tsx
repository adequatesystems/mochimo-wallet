import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useNetwork } from '../../../../src/redux/hooks/useNetwork';
import networkReducer, { setBlockHeight, setNetworkStatus } from '../../../../src/redux/slices/networkSlice';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

describe('useNetwork', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                network: networkReducer
            },
            preloadedState: {
                network: {
                    blockHeight: 0,
                    isConnected: false,
                    error: null
                }
            }
        });
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should return initial network state', () => {
        const { result } = renderHook(() => useNetwork(), { wrapper });

        expect(result.current).toEqual({
            blockHeight: 0,
            isConnected: false,
            error: null
        });
    });

    it('should reflect block height updates', () => {
        const { result, rerender } = renderHook(() => useNetwork(), { wrapper });

        act(() => {
            store.dispatch(setBlockHeight(1000));
        });
        rerender();

        expect(result.current.blockHeight).toBe(1000);
    });

    it('should reflect network connection status updates', () => {
        const { result, rerender } = renderHook(() => useNetwork(), { wrapper });

        act(() => {
            store.dispatch(setNetworkStatus({ isConnected: true }));
        });
        rerender();

        expect(result.current.isConnected).toBe(true);
        expect(result.current.error).toBeNull();
    });

    it('should handle network errors', () => {
        const { result, rerender } = renderHook(() => useNetwork(), { wrapper });

        act(() => {
            store.dispatch(setNetworkStatus({ 
                isConnected: false, 
                error: 'Network connection failed' 
            }));
        });
        rerender();

        expect(result.current.isConnected).toBe(false);
        expect(result.current.error).toBe('Network connection failed');
    });
});
