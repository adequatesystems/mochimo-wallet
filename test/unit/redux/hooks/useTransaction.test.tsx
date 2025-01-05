import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useTransaction } from '../../../../src/redux/hooks/useTransaction';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
import type { PropsWithChildren } from 'react';
import React from 'react';

describe('useTransaction', () => {
    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer,
                transaction: transactionReducer
            }
        });
    });

    const wrapper = ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should handle transaction sending', async () => {
        const { result } = renderHook(() => useTransaction(), { wrapper });

        expect(result.current.isLoading).toBe(false);
        expect(result.current.error).toBeNull();
        expect(result.current.pendingTransactions).toEqual([]);

        const txHash = await act(async () => {
            return await result.current.sendTransaction(
                'destination-address',
                { value: BigInt(1000000) },
                'optional-tag'
            );
        });

        expect(txHash).toBeDefined();
        expect(result.current.pendingTransactions).toContain(txHash);
        expect(result.current.isLoading).toBe(false);
    });

    it('should handle transaction errors', async () => {
        const { result } = renderHook(() => useTransaction(), { wrapper });

        // Mock error condition
        store.dispatch({ type: 'wallet/setWallet', payload: null });

        await act(async () => {
            await expect(
                result.current.sendTransaction(
                    'destination-address',
                    { value: BigInt(1000000) }
                )
            ).rejects.toThrow('No wallet or active account');
        });

        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
        expect(result.current.pendingTransactions).toEqual([]);
    });
}); 