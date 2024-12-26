import { Storage } from '../types/storage';
import { EncryptedData } from '../crypto/encryption';
import { AccountData } from '../types/account';
import type { StorageArea } from '../types/storage';

export class ExtensionStorage implements Storage {
    private readonly prefix: string;
    private storage: StorageArea;
    private readonly MASTER_SEED_KEY = 'master_seed';
    private readonly ACCOUNTS_KEY = 'accounts';
    private readonly ACTIVE_ACCOUNT_KEY = 'active_account';

    constructor(prefix = 'mochimo_wallet_') {
        this.prefix = prefix;
        this.storage = this.getStorageArea();
    }

    private getStorageArea(): StorageArea {
        if (typeof browser !== 'undefined' && browser.storage) {
            return browser.storage.sync || browser.storage.local;
        }
        if (typeof chrome !== 'undefined' && chrome.storage) {
            return chrome.storage.sync || chrome.storage.local;
        }
        throw new Error('No extension storage API available');
    }

    private getKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    async saveMasterSeed(encrypted: EncryptedData): Promise<void> {
        await this.storage.set({
            [this.getKey('master_seed')]: encrypted
        });
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        const result = await this.storage.get(this.getKey('master_seed'));
        return result[this.getKey('master_seed')] || null;
    }

    async saveAccount(account: AccountData): Promise<void> {
        const accounts = await this.loadAccounts();
        const index = accounts.findIndex(a => a.tag === account.tag);
        
        if (index >= 0) {
            accounts[index] = account;
        } else {
            accounts.push(account);
        }

        await this.storage.set({
            [this.getKey('accounts')]: accounts
        });
    }

    async loadAccounts(): Promise<AccountData[]> {
        const result = await this.storage.get(this.getKey('accounts'));
        return result[this.getKey('accounts')] || [];
    }

    async saveActiveAccount(account: AccountData): Promise<void> {
        await chrome.storage.local.set({
            [this.ACTIVE_ACCOUNT_KEY]: account
        });
    }

    async loadActiveAccount(): Promise<AccountData | null> {
        const result = await chrome.storage.local.get(this.ACTIVE_ACCOUNT_KEY);
        return result[this.ACTIVE_ACCOUNT_KEY] || null;
    }

    async clear(): Promise<void> {
        await this.storage.remove([
            this.getKey(this.MASTER_SEED_KEY),
            this.getKey(this.ACCOUNTS_KEY),
            this.getKey(this.ACTIVE_ACCOUNT_KEY)
        ]);
    }
} 