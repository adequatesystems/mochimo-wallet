import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WalletUI } from '../../../src/ui/WalletUI';
import { HDWallet } from '../../../src/core/HDWallet';
import { MockStorage } from '../../mocks/MockStorage';

describe('WalletUI', () => {
    let ui: WalletUI;
    let storage: MockStorage;

    beforeEach(() => {
        storage = new MockStorage();
        ui = new WalletUI();
    });

    describe('initialization', () => {
        it('should create new wallet', async () => {
            const onReady = vi.fn();
            ui.on('walletReady', onReady);

            await ui.initialize('password', true);
            expect(onReady).toHaveBeenCalled();
        });

        it('should load existing wallet', async () => {
            // Create and save wallet first
            await HDWallet.createWithStorage('password');
            
            const onReady = vi.fn();
            ui.on('walletReady', onReady);

            await ui.initialize('password');
            expect(onReady).toHaveBeenCalled();
        });
    });

    describe('recovery', () => {
        it('should recover wallet from seed phrase', async () => {
            const onReady = vi.fn();
            ui.on('walletReady', onReady);

            await ui.recover(
                'test test test test test test test test test test test junk',
                'password'
            );

            expect(onReady).toHaveBeenCalled();
        });

        it('should handle recovery errors', async () => {
            const onError = vi.fn();
            ui.on('error', onError);

            await expect(ui.recover('invalid phrase', 'password'))
                .rejects.toThrow();
            expect(onError).toHaveBeenCalled();
        });
    });

    // Add more tests for accounts, transactions, etc.
}); 