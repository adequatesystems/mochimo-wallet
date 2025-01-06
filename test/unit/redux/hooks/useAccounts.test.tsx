import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useAccounts } from '../../../../src/redux/hooks/useAccounts';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { SessionManager } from '../../../../src/redux/context/SessionContext';
import { MockStorage } from '../../../mocks/MockStorage';
import { MasterSeed } from '../../../../src/core/MasterSeed';
import React from 'react';

describe('useAccounts', () => {
    const mockStorage = new MockStorage();
    const mockMasterSeed = new MasterSeed(Buffer.from('test'));
    const mockSession = {
        getMasterSeed: vi.fn().mockReturnValue(mockMasterSeed),
        unlock: vi.fn(),
        lock: vi.fn()
    };

    beforeEach(() => {
        StorageProvider.setStorage(mockStorage);
        vi.spyOn(SessionManager, 'getInstance').mockReturnValue(mockSession as any);
    });

    const setupStore = () => {
        return configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer
            },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        });
    };

    it('should create and manage accounts', async () => {
        const store = setupStore();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useAccounts(), { wrapper });

        // Create first account
        await act(async () => {
            await result.current.createAccount('Test Account 1');
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.accounts).toHaveLength(1);
        expect(result.current.accounts[0].name).toBe('Test Account 1');

        // Create second account
        await act(async () => {
            await result.current.createAccount('Test Account 2');
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.accounts).toHaveLength(2);
        expect(result.current.accounts[1].name).toBe('Test Account 2');

        // Rename first account
        await act(async () => {
            await result.current.renameAccount(result.current.accounts[0].tag, 'Renamed Account');
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.accounts[0].name).toBe('Renamed Account');

        // Reorder accounts
        await act(async () => {
            await result.current.reorderAccounts({
                [result.current.accounts[0].tag]: 1,
                [result.current.accounts[1].tag]: 0
            });
            await new Promise(resolve => setTimeout(resolve, 0));
        });

        expect(result.current.accounts[0].name).toBe('Test Account 2');
        expect(result.current.accounts[1].name).toBe('Renamed Account');
    });

    it('should handle errors gracefully', async () => {
        const store = setupStore();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { result } = renderHook(() => useAccounts(), { wrapper });

        // Test error on non-existent account rename
        await act(async () => {
            await expect(
                result.current.renameAccount('nonexistent', 'New Name')
            ).rejects.toThrow();
        });

        // Create an account then test invalid reorder
        await act(async () => {
            await result.current.createAccount('Test Account');
            await expect(
                result.current.reorderAccounts({ 'nonexistent': 0 })
            ).rejects.toThrow();
        });
    });
}); 
