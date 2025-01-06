import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useWallet } from '../../../../src/redux/hooks/useWallet';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { MockStorage } from '../../../mocks/MockStorage';
import React from 'react';
describe('useWallet', () => {
    const mockStorage = new MockStorage();
    
    beforeEach(() => {
        StorageProvider.setStorage(mockStorage);
    });

    const setupStore = () => {
        return configureStore({
            reducer: {
                wallet: walletReducer
            }
        });
    };

    it('should create wallet with new mnemonic', async () => {
        const store = setupStore();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useWallet(), { wrapper });

        let mnemonic: string | undefined;
        await act(async () => {
            const response = await result.current.createWallet('password123');
            if (response.type === 'wallet/create/fulfilled' && response.payload) {
                mnemonic = response.payload.mnemonic;
            }
        });

        expect(mnemonic).toBeDefined();
        expect(typeof mnemonic).toBe('string');
        expect(mnemonic!.split(' ').length).toBe(24);
        expect(result.current.hasWallet).toBe(true);
        expect(result.current.isLocked).toBe(true);
    });

    it('should handle wallet locking', async () => {
        const store = setupStore();
        const wrapper = ({ children }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useWallet(), { wrapper });

        // Create and verify locked state
        await act(async () => {
            await result.current.createWallet('password123').unwrap();
        });
        expect(result.current.isLocked).toBe(true);

        // Unlock
        await act(async () => {
            await result.current.unlockWallet('password123');
        });
        expect(result.current.isLocked).toBe(false);

        // Lock
        await act(() => {
            result.current.lockWallet();
        });
        expect(result.current.isLocked).toBe(true);
    });

    it('should handle invalid mnemonic', async () => {
        const store = setupStore();
        const wrapper = ({ children }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useWallet(), { wrapper });

        await act(async () => {
            const promise = result.current.createWallet('password123', 'invalid mnemonic');
            await expect(promise).rejects.toThrow();
        });
    });
}); 