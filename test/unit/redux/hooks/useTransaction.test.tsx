import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useTransaction } from '../../../../src/redux/hooks/useTransaction';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
import { NetworkProvider } from '../../../../src/redux/context/NetworkContext';
import { SessionManager } from '../../../../src/redux/context/SessionContext';
import { MasterSeed } from '../../../../src/core/MasterSeed';
import type { PropsWithChildren } from 'react';
import React from 'react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { TransactionBuilder } from 'mochimo-mesh-api-client';

// Mock WOTS module
vi.mock('mochimo-wots', async () => {
    return {
        WOTSWallet: {
            create: vi.fn().mockReturnValue({
                getAddress: vi.fn().mockReturnValue('0'.repeat(64)),
                getSecret: vi.fn().mockReturnValue('1'.repeat(64))
            })
        }
    };
});

// Mock the derivation module
vi.mock('../../../../src/redux/utils/derivation', () => ({
    Derivation: {
        deriveWotsSeedAndAddress: vi.fn().mockReturnValue({
            address: '0'.repeat(64),
            secret: '1'.repeat(64),
            wotsWallet: {
                getAddress: vi.fn().mockReturnValue('0'.repeat(64)),
                getSecret: vi.fn().mockReturnValue('1'.repeat(64))
            }
        })
    }
}));
const TBMock = vi.mock("mochimo-mesh-api-client", () => ({
    TransactionBuilder: vi.fn().mockImplementation(() => ({
        buildAndSignTransaction: vi.fn().mockResolvedValue({
            submitResult: {
                transaction_identifier: {hash: 'test-tx'}
            }
        })
    }))
}));

describe('useTransaction', () => {
    let store: ReturnType<typeof configureStore>;
    
    const mockNetworkService = {
        activateTag: vi.fn(),
        resolveTag: vi.fn().mockImplementation(async (tag: string) => ({
            addressConsensus: '0'.repeat(64),
            balanceConsensus: '1000000',
            status: 'success'
        })),
        pushTransaction: vi.fn().mockImplementation(async () => ({
            status: 'success',
            data: { txid: 'test-tx' }
        })),
        getNetworkStatus: vi.fn().mockReturnValue('connected')
    };

    beforeEach(async () => {
        // Reset mocks
        vi.clearAllMocks();
        
        // Create test account with all required fields
        const testAccount = {
            name: 'Test Account',
            tag: '0'.repeat(64), // Use proper length tag
            type: 'standard' as const,
            faddress: '0'.repeat(64), // Use proper length address
            balance: '1000000',
            index: 0,
            source: 'mnemonic' as const,
            wotsIndex: 0,
            seed: '0'.repeat(64)
        };

        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer,
                accounts: accountReducer,
                transaction: transactionReducer
            },
            preloadedState: {
                wallet: {
                    initialized: true,
                    locked: false,
                    hasWallet: true,
                    network: 'mainnet',
                    error: null,
                    highestAccountIndex: 0
                },
                accounts: {
                    accounts: {
                        [testAccount.tag]: testAccount
                    },
                    selectedAccount: testAccount.tag,
                    loading: false,
                    error: null
                },
                network: {
                    status: 'connected',
                    error: null
                },
                transaction: {
                    pendingTransactions: [],
                    isLoading: false,
                    error: null
                }
            }
        });

        // Setup network service
        NetworkProvider.setNetwork(mockNetworkService);

        // Setup session
        const session = SessionManager.getInstance();
        const masterSeed = await MasterSeed.create();
        (session as any).masterSeed = masterSeed;
    });

    const wrapper = ({ children }: PropsWithChildren) => (
        <Provider store={store}>{children}</Provider>
    );

    it('should handle transaction sending', async () => {
        const { result } = renderHook(() => useTransaction(), { wrapper });

        await act(async () => {
            await result.current.sendTransaction(
                '0'.repeat(64), // Use proper length destination address
                BigInt(1000000)
            );
        });

        expect(result.current.pendingTransactions).toContain('test-tx');
        expect(result.current.isLoading).toBe(false);
    });

    it('should handle transaction errors', async () => {
      vi.mocked(mockNetworkService.resolveTag).mockRejectedValueOnce(
            new Error('Transaction failed')
        );

        const { result } = renderHook(() => useTransaction(), { wrapper });

        await act(async () => {
            await expect(
                result.current.sendTransaction(
                    '0'.repeat(64), // Use proper length destination address
                    BigInt(1000000)
                )
            ).rejects.toThrow('Transaction failed');
        });

        expect(result.current.error).toBeDefined();
        expect(result.current.isLoading).toBe(false);
    });
}); 