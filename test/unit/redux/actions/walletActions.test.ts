import { vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import { createWalletAction, lockWalletAction, unlockWalletAction } from '../../../../src/redux/actions/walletActions';
import { SessionManager } from '../../../../src/redux/context/SessionContext';
import { MasterSeed } from '../../../../src/core/MasterSeed';
import { StorageProvider } from '../../../../src/redux/context/StorageContext';
import { MockStorage } from '../../../mocks/MockStorage';
import { AppStore } from '../../../../src/redux/store';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import networkReducer from '../../../../src/redux/slices/networkSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';
describe('Wallet Actions', () => {
    let store: AppStore;
    let mockStorage: MockStorage;
    let mockSession: SessionManager;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer,
                network: networkReducer,
                transaction: transactionReducer,
                accounts: accountReducer   
            },
            middleware: (getDefaultMiddleware) => getDefaultMiddleware()
        });

        mockStorage = new MockStorage();
        StorageProvider.setStorage(mockStorage);

        mockSession = {
            setMasterSeed: vi.fn(),
            unlock: vi.fn(),
            lock: vi.fn(),
            getMasterSeed: vi.fn(),
            getStorageKey: vi.fn()
        } as unknown as SessionManager;

        vi.spyOn(SessionManager, 'getInstance').mockReturnValue(mockSession);
    });

    it('should create a wallet successfully', async () => {
        const mockMasterSeed = await MasterSeed.create();
        vi.spyOn(MasterSeed, 'create').mockResolvedValue(mockMasterSeed);

        const result = await store.dispatch(createWalletAction({ password: 'password' }));
        expect(result.type).toBe('wallet/create/fulfilled');

        const state = store.getState().wallet;
        expect(state.hasWallet).toBe(true);
        expect(state.initialized).toBe(true);
        expect(state.locked).toBe(true);
        expect(state.error).toBeNull();
    });

    it('should handle creation errors', async () => {
        const error = new Error('Creation failed');
        vi.spyOn(MasterSeed, 'create').mockRejectedValue(error);

        await store.dispatch(createWalletAction({ password: 'password' }));
        const state = store.getState().wallet;
        expect(state.error).toBe('Failed to create wallet');
    });

    it('should unlock wallet successfully', async () => {
        await store.dispatch(unlockWalletAction('password'));
        expect(mockSession.unlock).toHaveBeenCalledWith('password', mockStorage);
        
        const state = store.getState().wallet;
        expect(state.locked).toBe(false);
        expect(state.error).toBeNull();
    });

    it('should handle lock errors', async () => {
        vi.spyOn(mockSession, 'lock').mockRejectedValue(new Error('Lock failed'));
        await store.dispatch(lockWalletAction());
        const state = store.getState().wallet;
        expect(state.error).toBe('Failed to lock wallet');
    });
}); 