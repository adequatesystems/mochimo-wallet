import { MasterSeed } from './MasterSeed';
import { Transaction } from 'mochimo-wots-v2';
import { WOTSWallet } from 'mochimo-wots-v2';
import { Account, AccountData } from '../types/account';
import { Storage } from '../types/storage';
import { WalletExport } from '../types/wallet';
import { StorageFactory } from '../storage/StorageFactory';

export interface HDWalletOptions {
    storage?: Storage;
}

export interface TransactionOptions {
    fee?: bigint;
    name?: string;  // Optional name for the WOTS wallet
}

/**
 * Recovery options for importing from seed phrase
 */
export interface RecoveryOptions extends HDWalletOptions {
    scanAccounts?: boolean;  // Whether to scan for used accounts
    maxScan?: number;        // Maximum number of accounts to scan
}

export class HDWallet {
    private masterSeed?: MasterSeed;
    private accounts: Map<string, Account> = new Map();
    public storage?: Storage;

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
        const tagString = Buffer.from(tag).toString('hex');

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
    async createWOTSWallet(account: Account, options: {increment?: boolean} = {increment: true} ): Promise<WOTSWallet> {
        if (!this.masterSeed) throw new Error('Wallet is locked');

        const wotsIndex = options.increment ? account.nextWotsIndex++ : account.nextWotsIndex;
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
     * @param destination Destination tag (as Uint8Array)
     * @param amount Amount to send
     * @param options Transaction options
     */
    async createTransaction(
        account: Account,
        destination: Uint8Array,
        amount: bigint,
        balance: bigint = BigInt(0),
        options: TransactionOptions = {}
    ): Promise<{ tx: Uint8Array, datagram: Uint8Array }> {
        if (!this.masterSeed) {
            throw new Error('Wallet is locked');
        }

        // Create WOTS wallet for signing
        const wots = await this.createWOTSWallet(account);
        const sourceAddress = wots.getAddress();
        const sourceSecret = wots.getSecret();

        // Default fee if not specified
        const fee = options.fee || BigInt(500);  // Example default fee

        // Create change address from next WOTS index
        const changeWallet = await this.createWOTSWallet(account);

        const changeAddress = changeWallet.getAddress();
        const changeAmount = balance - amount - fee;
        // Sign the transaction
        const { tx, datagram } = Transaction.sign(
            balance,  // Source balance (amount + fee)
            amount,        // Payment amount
            fee,          // Network fee
            changeAmount, // Change amount
            sourceAddress!,
            sourceSecret!,
            destination,
            changeAddress!
        );

        return { tx, datagram: datagram };
    }

    /**
     * Creates a new HD wallet with automatic storage selection
     */
    static async createWithStorage(password: string, prefix?: string): Promise<HDWallet> {
        const storage = StorageFactory.create(prefix);
        return HDWallet.create(password, { storage });
    }

    /**
     * Loads an existing wallet with automatic storage selection
     */
    static async loadWithStorage(password: string, prefix?: string): Promise<HDWallet> {
        const storage = StorageFactory.create(prefix);
        return HDWallet.load(password, storage);
    }

    /**
     * Recovers a wallet from a seed phrase
     */
    static async recover(
        seedPhrase: string,
        password: string,
        options: RecoveryOptions = {}
    ): Promise<HDWallet> {
        // Create master seed from phrase
        const masterSeed = await MasterSeed.fromPhrase(seedPhrase);
        const wallet = new HDWallet(options);
        wallet.masterSeed = masterSeed;

        // Create initial encrypted seed for password verification
        await masterSeed.export(password);

        // Save encrypted master seed if storage provided
        if (wallet.storage) {
            const encrypted = await masterSeed.export(password);
            await wallet.storage.saveMasterSeed(encrypted);
        }

        // Scan for used accounts if requested
        if (options.scanAccounts) {
            await wallet.scanAccounts(options.maxScan || 10);
        }

        return wallet;
    }

    /**
     * Scans for used accounts
     */
    private async scanAccounts(maxScan: number): Promise<void> {
        if (!this.masterSeed) throw new Error('Wallet is locked');

        for (let i = 0; i < maxScan; i++) {
            // Derive account tag
            const tag = await this.masterSeed.deriveAccountTag(i);
            const tagString = Buffer.from(tag).toString('base64');

            // Check if account exists (implementation depends on blockchain)
            const exists = await this.checkAccountExists(tagString);
            if (!exists) break;

            // Create and store account
            const account = new Account({
                name: `Account ${i + 1}`,
                index: i,
                tag: tagString,
                nextWotsIndex: 0  // Will need to scan for used WOTS addresses
            });

            this.accounts.set(tagString, account);

            if (this.storage) {
                await this.storage.saveAccount(account.toJSON());
            }
        }
    }

    /**
     * Checks if an account exists on the blockchain
     * This is a placeholder - actual implementation depends on blockchain API
     */
    private async checkAccountExists(tag: string): Promise<boolean> {
        // TODO: Implement blockchain check
        return false;
    }

    /**
     * Exports the wallet's seed phrase
     */
    async exportSeedPhrase(password: string): Promise<string> {
        if (!this.masterSeed) throw new Error('Wallet is locked');

        try {
            // Verify password by attempting to export
            await this.masterSeed.export(password);

            // If password is correct, return phrase
            return this.masterSeed.toPhrase();
        } catch (error) {
            // Re-throw the original error from export
            throw error;
        }
    }
} 