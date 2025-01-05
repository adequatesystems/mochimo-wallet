import { vi } from 'vitest';
import { configureStore } from '@reduxjs/toolkit';
import walletReducer from '../../../../src/redux/slices/walletSlice';
import { createWalletAction, lockWalletAction, unlockWalletAction } from '../../../../src/redux/actions/walletActions';
import { SessionManager } from '../../../../src/redux/context/SessionContext';
import { MasterSeed } from '../../../../src/core/MasterSeed';

describe('Wallet Actions', () => {
    let store: ReturnType<typeof configureStore>;
    let mockSession: SessionManager;

    beforeEach(() => {
        store = configureStore({
            reducer: {
                wallet: walletReducer
            }
        });

        // Mock SessionManager
        mockSession = {
            setMasterSeed: vi.fn(),
            unlock: vi.fn(),
            lock: vi.fn(),
            getMasterSeed: vi.fn(),
            getInstance: vi.fn()
        } as unknown as SessionManager;

        vi.spyOn(SessionManager, 'getInstance').mockReturnValue(mockSession);
    });

    describe('createWalletAction', () => {
        it('should create a wallet successfully', async () => {
            const mockMasterSeed = await MasterSeed.create();
            vi.spyOn(MasterSeed, 'create').mockResolvedValue(mockMasterSeed);
            mockSession.setMasterSeed.mockResolvedValue(undefined);

            await store.dispatch(createWalletAction('password'));

            const state = store.getState().wallet;
            expect(state.hasWallet).toBe(true);
            expect(state.initialized).toBe(true);
            expect(state.locked).toBe(false);
            expect(state.error).toBeNull();
            expect(mockSession.setMasterSeed).toHaveBeenCalledWith(mockMasterSeed, 'password');
        });

        it('should handle creation errors', async () => {
            const error = new Error('Creation failed');
            vi.spyOn(MasterSeed, 'create').mockRejectedValue(error);

            await expect(store.dispatch(createWalletAction('password'))).rejects.toThrow('Creation failed');

            const state = store.getState().wallet;
            expect(state.error).toBe('Creation failed');
        });
    });

    describe('unlockWalletAction', () => {
        it('should unlock wallet successfully', async () => {
            mockSession.unlock.mockResolvedValue(undefined);

            await store.dispatch(unlockWalletAction('password'));

            const state = store.getState().wallet;
            expect(state.locked).toBe(false);
            expect(state.error).toBeNull();
            expect(mockSession.unlock).toHaveBeenCalledWith('password');
        });

        it('should handle unlock errors', async () => {
            const error = new Error('Invalid password');
            mockSession.unlock.mockRejectedValue(error);

            await expect(store.dispatch(unlockWalletAction('password'))).rejects.toThrow('Invalid password');

            const state = store.getState().wallet;
            expect(state.error).toBe('Invalid password');
        });
    });

    describe('lockWalletAction', () => {
        it('should lock wallet successfully', async () => {
            await store.dispatch(lockWalletAction());

            const state = store.getState().wallet;
            expect(state.locked).toBe(true);
            expect(state.error).toBeNull();
            expect(mockSession.lock).toHaveBeenCalled();
        });

        it('should handle lock errors', async () => {
            const error = new Error('Lock failed');
            mockSession.lock.mockImplementation(() => { throw error; });

            await expect(store.dispatch(lockWalletAction())).rejects.toThrow('Lock failed');

            const state = store.getState().wallet;
            expect(state.error).toBe('Lock failed');
        });
    });
}); 