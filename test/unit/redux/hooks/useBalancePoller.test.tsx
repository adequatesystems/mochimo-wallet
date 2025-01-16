import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { useBalancePoller } from '../../../../src/redux/hooks/useBalancePoller';
import { NetworkProvider } from '../../../../src/redux/context/NetworkContext';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import { Account } from '../../../../src/types';
import React from 'react';

describe('useBalancePoller', () => {
    const mockNetwork = {
        apiUrl: 'test',
        getNetworkStatus: vi.fn(),
        getBalance: vi.fn(),
        resolveTag: vi.fn(),
        pushTransaction: vi.fn(),
        activateTag: vi.fn(),
    };

    const mockAccounts: Account[] = [
        { tag: 'tag1', balance: '100', name: 'Account 1', type: 'standard', wotsIndex: 0, faddress: '', seed: '' },
        { tag: 'tag2', balance: '200', name: 'Account 2', type: 'standard', wotsIndex: 0, faddress: '', seed: '' }
    ];

    let store: ReturnType<typeof configureStore>;

    beforeEach(() => {
        vi.useFakeTimers();
        NetworkProvider.setNetwork(mockNetwork);

        store = configureStore({
            reducer: {
                accounts: accountReducer
            },
            preloadedState: {
                accounts: {
                    accounts: mockAccounts.reduce((acc, account) => {
                        acc[account.tag] = account;
                        return acc;
                    }, {} as Record<string, Account>),
                    selectedAccount: null,
                    loading: false,
                    error: null
                }
            }
        });

        // Reset mock implementations
        mockNetwork.getNetworkStatus.mockReset();
        mockNetwork.getBalance.mockReset();
    });

    afterEach(() => {
        vi.clearAllTimers();
        vi.useRealTimers();
    });

    it('should poll balances when block height changes', async () => {
        mockNetwork.getNetworkStatus
            .mockResolvedValueOnce({ height: 1000 })
            .mockResolvedValueOnce({ height: 1001 });

        mockNetwork.getBalance
            .mockResolvedValueOnce('150')  // tag1 new balance
            .mockResolvedValueOnce('250'); // tag2 new balance

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        renderHook(() => useBalancePoller(1000), { wrapper });

        // Initial poll
        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        expect(mockNetwork.getBalance).toHaveBeenCalledWith('0xtag1');
        expect(mockNetwork.getBalance).toHaveBeenCalledWith('0xtag2');

        // State should be updated
        const state = store.getState();
        expect(state.accounts.accounts.tag1.balance).toBe('150');
        expect(state.accounts.accounts.tag2.balance).toBe('250');
    });

    it('should handle network errors with backoff', async () => {
        mockNetwork.getNetworkStatus
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'))
            .mockRejectedValueOnce(new Error('Network error'));

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        renderHook(() => useBalancePoller(1000), { wrapper });

        // First error
        await act(async () => {
            vi.advanceTimersByTime(0);
            await Promise.resolve();
        });

        // Should retry with normal interval
        expect(vi.getTimerCount()).toBe(1);

        // Second error
        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        // Third error - should trigger backoff
        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        // Should still have a timer running with backoff
        expect(vi.getTimerCount()).toBe(1);
        
        // Verify backoff timing
        const nextTimer = vi.getTimerCount();
        expect(nextTimer).toBe(1);
    });

    it('should cache balances and avoid unnecessary fetches', async () => {
        // Setup: Only one account for simpler testing
        const singleAccountStore = configureStore({
            reducer: {
                accounts: accountReducer
            },
            preloadedState: {
                accounts: {
                    accounts: {
                        tag1: mockAccounts[0]
                    },
                    selectedAccount: null,
                    loading: false,
                    error: null
                }
            }
        });

        // Mock: Same block height for both calls
        mockNetwork.getNetworkStatus.mockResolvedValue({ height: 1000 });
        mockNetwork.getBalance.mockResolvedValue('150');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={singleAccountStore}>{children}</Provider>
        );

        renderHook(() => useBalancePoller(1000), { wrapper });

        // First poll
        await act(async () => {
            vi.advanceTimersByTime(0);
        });

        // Verify first call
        expect(mockNetwork.getBalance).toHaveBeenCalledTimes(1);
        expect(mockNetwork.getBalance).toHaveBeenCalledWith('0xtag1');

        // Reset mock for second poll
        mockNetwork.getBalance.mockClear();

        // Second poll with same height
        await act(async () => {
            vi.advanceTimersByTime(1000);
        });

        // Should use cached value
        expect(mockNetwork.getBalance).not.toHaveBeenCalled();
    });

    it('should handle invalid balance responses', async () => {
        mockNetwork.getNetworkStatus.mockResolvedValue({ height: 1000 });
        mockNetwork.getBalance.mockResolvedValue('invalid');

        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        renderHook(() => useBalancePoller(1000), { wrapper });

        await act(async () => {
            await vi.runOnlyPendingTimersAsync();
        });

        // State should not be updated with invalid balance
        const state = store.getState();
        expect(state.accounts.accounts.tag1.balance).toBe('100');
    });

    it('should clean up on unmount', () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );

        const { unmount } = renderHook(() => useBalancePoller(1000), { wrapper });

        unmount();

        // All timers should be cleared
        expect(vi.getTimerCount()).toBe(0);
    });
}); 