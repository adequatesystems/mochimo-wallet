import { MasterSeed } from './MasterSeed';
import { Transaction } from 'mochimo-wots-v2';
import { WOTSWallet } from 'mochimo-wots-v2';
import { Account, AccountData } from '../types/account';
import { Storage } from '../types/storage';
import { WalletExport } from '../types/wallet';

export interface HDWalletOptions {
    storage?: Storage;
}

export interface TransactionOptions {
    fee?: bigint;
    name?: string;  // Optional name for the WOTS wallet
}

export class HDWallet {
    private masterSeed?: MasterSeed;
    private accounts: Map<string, Account> = new Map();
    private storage?: Storage;

    constructor(options: HDWalletOptions = {}) {
        this.storage = options.storage;
    }

    /**
     * Creates a new HD wallet with a fresh master seed
     */
    static async create(password: string, options?: HDWalletOptions): Promise<HDWallet> {
        const wallet = new HDWallet(options);
        wallet.masterSeed = await MasterSeed.create();
        
        // Encrypt and store if storage is provided
        if (wallet.storage) {
            const encrypted = await wallet.masterSeed.export(password);
            await wallet.storage.saveMasterSeed(encrypted);
        }
        
        return wallet;
    }

    /**
     * Loads an existing HD wallet from storage
     */
    static async load(password: string, storage: Storage): Promise<HDWallet> {
        const encrypted = await storage.loadMasterSeed();
        if (!encrypted) {
            throw new Error('No wallet found in storage');
        }

        try {
            const wallet = new HDWallet({ storage });
            wallet.masterSeed = await MasterSeed.import(encrypted, password);
            
            // Load accounts from storage
            const accounts = await storage.loadAccounts();
            for (const accountData of accounts) {
                wallet.accounts.set(accountData.tag, new Account(accountData));
            }
            
            return wallet;
        } catch (error) {
            throw new Error('Failed to load wallet - invalid password');
        }
    }

    /**
     * Creates a new account
     */
    async createAccount(name: string): Promise<Account> {
        if (!this.masterSeed) throw new Error('Wallet is locked');

        // Find next available account index
        const accountIndex = this.accounts.size;
        
        // Derive account tag for identification
        const tag = await this.masterSeed.deriveAccountTag(accountIndex);
        const tagString = Buffer.from(tag).toString('base64');
        
        // Create account data
        const accountData: AccountData = {
            name,
            index: accountIndex,
            tag: tagString,
            nextWotsIndex: 0
        };

        // Create and store account
        const account = new Account(accountData);
        this.accounts.set(tagString, account);
        
        // Save to storage if available
        if (this.storage) {
            await this.storage.saveAccount(accountData);
        }
        
        return account;
    }

    /**
     * Creates a new WOTS wallet for an account
     */
    async createWOTSWallet(account: Account): Promise<WOTSWallet> {
        if (!this.masterSeed) throw new Error('Wallet is locked');

        const wotsIndex = account.nextWotsIndex++;
        const wallet = await this.masterSeed.createWOTSWallet(
            account.index,
            wotsIndex,
            `${account.name} - WOTS ${wotsIndex}`
        );

        // Update account in storage
        if (this.storage) {
            await this.storage.saveAccount(account.toJSON());
        }

        return wallet;
    }

    /**
     * Locks the wallet by wiping the master seed from memory
     */
    lock(): void {
        this.masterSeed?.lock();
        this.masterSeed = undefined;
    }

    /**
     * Gets all accounts in the wallet
     */
    getAccounts(): Account[] {
        return Array.from(this.accounts.values());
    }

    /**
     * Gets an account by its tag
     */
    getAccount(tag: string): Account | undefined {
        return this.accounts.get(tag);
    }

    /**
     * Exports the wallet to a portable format
     * @throws Error if the wallet is locked
     */
    async export(password: string): Promise<WalletExport> {
        if (!this.masterSeed) {
            throw new Error('Wallet is locked');
        }

        return {
            version: '1.0.0',
            timestamp: Date.now(),
            encrypted: await this.masterSeed.export(password),
            accounts: this.getAccounts().map(a => a.toJSON())
        };
    }

    /**
     * Creates a wallet from exported data
     * @throws Error if the data is invalid or password is incorrect
     */
    static async import(data: WalletExport, password: string, options?: HDWalletOptions): Promise<HDWallet> {
        // Validate version
        if (!data.version.startsWith('1.')) {
            throw new Error('Unsupported wallet version');
        }

        try {
            const wallet = new HDWallet(options);
            wallet.masterSeed = await MasterSeed.import(data.encrypted, password);

            // Import accounts
            for (const accountData of data.accounts) {
                wallet.accounts.set(accountData.tag, new Account(accountData));
            }

            // Save to storage if provided
            if (wallet.storage) {
                await wallet.storage.saveMasterSeed(data.encrypted);
                for (const account of wallet.accounts.values()) {
                    await wallet.storage.saveAccount(account.toJSON());
                }
            }

            return wallet;
        } catch (error) {
            throw new Error('Failed to import wallet - invalid data or password');
        }
    }

    /**
     * Creates and signs a transaction
     * @param account Source account
     * @param destination Destination address (as Uint8Array)
     * @param amount Amount to send
     * @param options Transaction options
     */
    async createTransaction(
        account: Account,
        destination: Uint8Array,
        amount: bigint,
        options: TransactionOptions = {}
    ): Promise<Transaction> {
        if (!this.masterSeed) {
            throw new Error('Wallet is locked');
        }

        // Create WOTS wallet for signing
        const wots = await this.createWOTSWallet(account);
        const sourceAddress = wots.getAddress();
        const sourceSecret = wots.getSecret();

        // Default fee if not specified
        const fee = options.fee || BigInt(1000);  // Example default fee
        
        // Create change address from next WOTS index
        const changeWallet = await this.createWOTSWallet(account);
        const changeAddress = changeWallet.getAddress();

        // Sign the transaction
        const { tx } = Transaction.sign(
            amount + fee,  // Source balance (amount + fee)
            amount,        // Payment amount
            fee,          // Network fee
            BigInt(0),    // Change amount
            sourceAddress,
            sourceSecret,
            destination,
            changeAddress
        );

        return Transaction.of(tx);
    }
} 