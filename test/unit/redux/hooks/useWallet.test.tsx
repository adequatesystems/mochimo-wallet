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
            },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware()
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
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useWallet(), { wrapper });

        // Create wallet
        await act(async () => {
            const response = await result.current.createWallet('password123');
            expect(response.type).toBe('wallet/create/fulfilled');
            // Wait for state updates
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // Verify initial state
        await act(async () => {
            expect(result.current.isLocked).toBe(true);
        });

        // Unlock wallet
        await act(async () => {
            await result.current.unlockWallet('password123');
            // Wait for state updates
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // Verify unlocked state
        await act(async () => {
            expect(result.current.isLocked).toBe(false);
        });

        // Lock wallet
        await act(async () => {
            result.current.lockWallet();
            // Wait for state updates
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        // Verify locked state
        await act(async () => {
            expect(result.current.isLocked).toBe(true);
        });
    });

    it('should handle invalid mnemonic', async () => {
        const store = setupStore();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useWallet(), { wrapper });

        await act(async () => {
            const response = await result.current.createWallet('password123', 'invalid mnemonic');
            expect(response.type).toBe('wallet/create/rejected');
        });
    });
}); 