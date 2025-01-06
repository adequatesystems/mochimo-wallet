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
    let store: ReturnType<typeof configureStore>;
    let mockStorage: MockStorage;
    let mockMasterSeed: MasterSeed;
    let mockSession: jest.Mocked<Partial<SessionManager>>;

    beforeEach(() => {
        mockStorage = new MockStorage();
        mockMasterSeed = new MasterSeed(Buffer.from('test'));
        mockSession = {
            getMasterSeed: vi.fn().mockReturnValue(mockMasterSeed),
            unlock: vi.fn(),
            lock: vi.fn()
        };

        StorageProvider.setStorage(mockStorage);
        vi.spyOn(SessionManager, 'getInstance').mockReturnValue(mockSession as any);

        store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer
            },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        });
    });

    const renderAccountsHook = () => {
        const wrapper = ({ children }: { children: React.ReactNode }) => (
            <Provider store={store}>{children}</Provider>
        );
        return renderHook(() => useAccounts(), { wrapper });
    };

    describe('Account Creation', () => {
        it('should create an account successfully', async () => {
            const { result } = renderAccountsHook();
            
            await act(async () => {
                await result.current.createAccount('Test Account');
            });

            expect(result.current.accounts).toHaveLength(1);
            expect(result.current.accounts[0].name).toBe('Test Account');
            expect(await mockStorage.loadAccount(result.current.accounts[0].tag)).toBeDefined();

        });
    });

    describe('Account Deletion', () => {
        it('should prevent deleting the last account', async () => {
            const { result } = renderAccountsHook();
            
            await act(async () => {
                await result.current.createAccount('Test Account');
            });

            const deletePromise = result.current.deleteAccount(result.current.accounts[0].tag);
            await expect(deletePromise).rejects.toThrow('Cannot delete last account');
        });

        it('should delete an account when multiple exist', async () => {
            const { result } = renderAccountsHook();
            
            await act(async () => {
                await result.current.createAccount('Account 1');
                await result.current.createAccount('Account 2');
            });

            await act(async () => {
                await result.current.deleteAccount(result.current.accounts[0].tag);
            });

            expect(result.current.accounts).toHaveLength(1);
            expect(result.current.accounts[0].name).toBe('Account 2');
        });
    });

    describe('Account Management', () => {
        it('should rename accounts', async () => {
            const { result } = renderAccountsHook();
            
            await act(async () => {
                await result.current.createAccount('Original Name');
            });

            const accountTag = result.current.accounts[0].tag;

            await act(async () => {
                await result.current.renameAccount(accountTag, 'New Name');
            });

            expect(result.current.accounts[0].name).toBe('New Name');
        });

        it('should reorder accounts', async () => {
            const { result } = renderAccountsHook();
            
            await act(async () => {
                await result.current.createAccount('First');
                await result.current.createAccount('Second');
            });

            const [first, second] = result.current.accounts;
            
            await act(async () => {
                await result.current.reorderAccounts({
                    [first.tag]: 1,
                    [second.tag]: 0
                });
            });

            expect(result.current.accounts[0].name).toBe('Second');
            expect(result.current.accounts[1].name).toBe('First');
        });
    });

    describe('Error Handling', () => {
        it('should handle non-existent account operations', async () => {
            const { result } = renderAccountsHook();

            await expect(
                result.current.deleteAccount('nonexistent')
            ).rejects.toThrow('Account not found');

            await expect(
                result.current.renameAccount('nonexistent', 'New Name')
            ).rejects.toThrow('Account not found');
        });
    });
}); 
