import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useWallet } from '../../../../src/redux/hooks/useWallet';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { wordlist } from '@scure/bip39/wordlists/english';

// Valid test mnemonic using BIP39 wordlist
const TEST_MNEMONIC = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('useWallet', () => {
    let store: ReturnType<typeof configureStore>;
    
    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                accounts: accountReducer
            }
        });
    });

    const wrapper = ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
    );

    describe('initialization', () => {
        it('should initialize with default state', () => {
            const { result } = renderHook(() => useWallet(), { wrapper });
            
            expect(result.current.isLocked).toBe(true);
            expect(result.current.hasWallet).toBe(false);
            expect(result.current.isInitialized).toBe(false);
            expect(result.current.error).toBeNull();
            expect(result.current.network).toBe('mainnet');
        });
    });

    describe('wallet creation', () => {
        it('should create wallet with new mnemonic', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });

            let mnemonic: string;
            await act(async () => {
                mnemonic = await result.current.createWallet('password123');
            });

            expect(mnemonic).toBeDefined();
            expect(typeof mnemonic).toBe('string');
            expect(mnemonic.split(' ').length).toBe(24); // BIP39 24-word mnemonic
            expect(result.current.hasWallet).toBe(true);
            expect(result.current.isLocked).toBe(true);
            
            // Verify mnemonic words are from BIP39 wordlist
            expect(mnemonic.split(' ').every(word => wordlist.includes(word))).toBe(true);
        });

        it('should create wallet with provided mnemonic', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });

            await act(async () => {
                await result.current.createWallet('password123', TEST_MNEMONIC);
            });

            expect(result.current.hasWallet).toBe(true);
            expect(result.current.isLocked).toBe(true);
        });

        it('should reject invalid mnemonic', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });
            const invalidMnemonic = 'invalid mnemonic phrase';

            await act(async () => {
                await expect(
                    result.current.createWallet('password123', invalidMnemonic)
                ).rejects.toThrow('Invalid seed phrase');
            });

            expect(result.current.hasWallet).toBe(false);
            expect(result.current.error).toBeDefined();
        });
    });

    describe('wallet locking', () => {
        it('should manage wallet lock state', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });

            // Create and verify wallet
            await act(async () => {
                await result.current.createWallet('password123');
            });
            expect(result.current.isLocked).toBe(true);

            // Unlock wallet
            await act(async () => {
                await result.current.unlockWallet('password123');
            });
            expect(result.current.isLocked).toBe(false);

            // Lock wallet
            act(() => {
                result.current.lockWallet();
            });
            expect(result.current.isLocked).toBe(true);
        });

        it('should prevent unlocking with wrong password', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });

            await act(async () => {
                await result.current.createWallet('password123');
            });

            await act(async () => {
                await expect(
                    result.current.unlockWallet('wrongpassword')
                ).rejects.toThrow();
            });

            expect(result.current.isLocked).toBe(true);
            expect(result.current.error).toBeDefined();
        });

        it('should prevent operations on non-existent wallet', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });

            // Try unlock
            await act(async () => {
                await expect(
                    result.current.unlockWallet('password123')
                ).rejects.toThrow();
            });

            // Try lock
            act(() => {
                expect(() => result.current.lockWallet()).toThrow('No wallet exists');
            });

            expect(result.current.hasWallet).toBe(false);
            expect(result.current.error).toBeDefined();
        });
    });

    describe('network handling', () => {
        it('should initialize with mainnet', async () => {
            const { result } = renderHook(() => useWallet(), { wrapper });

            await act(async () => {
                await result.current.createWallet('password123');
                await result.current.unlockWallet('password123');
            });

            expect(result.current.network).toBe('mainnet');
        });

        // Add more network-related tests if there are network switching capabilities
    });
}); 