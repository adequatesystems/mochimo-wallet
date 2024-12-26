import { HDWallet } from '../core/HDWallet';
import { Account } from '../types/account';
import { WalletEvents } from './events';

export class WalletUI {
    private wallet?: HDWallet;
    private events: WalletEvents;

    constructor() {
        this.events = new WalletEvents();
    }

    /**
     * Creates or loads a wallet
     */
    async initialize(password: string, create = false): Promise<void> {
        try {
            this.wallet = create 
                ? await HDWallet.createWithStorage(password)
                : await HDWallet.loadWithStorage(password);
            
            this.events.emit('walletReady', this.wallet.getAccounts());
        } catch (error) {
            this.events.emit('error', error);
            throw error;
        }
    }

    /**
     * Creates a new account
     */
    async createAccount(name: string): Promise<Account> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        const account = await this.wallet.createAccount(name);
        this.events.emit('accountCreated', account);
        return account;
    }

    /**
     * Sends a transaction
     */
    async sendTransaction(
        accountTag: string, 
        destination: string, 
        amount: bigint
    ): Promise<void> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        const account = this.wallet.getAccount(accountTag);
        if (!account) throw new Error('Account not found');

        try {
            // Convert destination address from hex/base64
            const destAddress = Buffer.from(destination, 'hex');
            
            // Create and broadcast transaction
            const tx = await this.wallet.createTransaction(
                account,
                destAddress,
                amount
            );

            this.events.emit('transactionSent', tx);
        } catch (error) {
            this.events.emit('error', error);
            throw error;
        }
    }

    /**
     * Locks the wallet
     */
    lock(): void {
        this.wallet?.lock();
        this.wallet = undefined;
        this.events.emit('walletLocked');
    }

    /**
     * Subscribes to wallet events
     */
    on<T extends keyof WalletEvents['handlers']>(
        event: T,
        handler: WalletEvents['handlers'][T]
    ): void {
        this.events.on(event, handler);
    }

    /**
     * Recovers a wallet from seed phrase
     */
    async recover(seedPhrase: string, password: string): Promise<void> {
        try {
            this.wallet = await HDWallet.recover(seedPhrase, password, {
                scanAccounts: true,
                maxScan: 20  // Scan up to 20 accounts
            });

            this.events.emit('walletReady', this.wallet.getAccounts());
        } catch (error) {
            this.events.emit('error', error);
            throw error;
        }
    }

    /**
     * Exports the wallet's seed phrase
     */
    async exportSeedPhrase(password: string): Promise<string> {
        if (!this.wallet) throw new Error('Wallet not initialized');
        
        try {
            const phrase = await this.wallet.exportSeedPhrase(password);
            return phrase;
        } catch (error) {
            this.events.emit('error', error);
            throw error;
        }
    }
} 