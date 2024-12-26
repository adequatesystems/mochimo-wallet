import { Account } from '../types/account';
import { Transaction } from 'mochimo-wots-v2';

export class WalletEvents {
    handlers: {
        walletReady: (accounts: Account[]) => void;
        accountCreated: (account: Account) => void;
        transactionSent: (tx: Transaction) => void;
        walletLocked: () => void;
        error: (error: Error) => void;
    } = {
        walletReady: () => {},
        accountCreated: () => {},
        transactionSent: () => {},
        walletLocked: () => {},
        error: () => {}
    };

    on<T extends keyof WalletEvents['handlers']>(
        event: T,
        handler: WalletEvents['handlers'][T]
    ): void {
        this.handlers[event] = handler;
    }

    emit<T extends keyof WalletEvents['handlers']>(
        event: T,
        ...args: Parameters<WalletEvents['handlers'][T]>
    ): void {
        this.handlers[event](...args);
    }
} 