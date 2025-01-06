import { Storage, StorageArea } from '../types/storage';
import { Account } from '../types/account';
import { EncryptedData } from '../crypto/encryption';
import { encryptAccount, decryptAccount, EncryptedAccount } from '../crypto/accountEncryption';

export class ExtensionStorage implements Storage {
    private storage: StorageArea;
    private prefix: string;

    constructor(prefix: string = 'mochimo_wallet_') {
        this.storage = getStorageArea();
        this.prefix = prefix;
    }

    private getKey(key: string): string {
        return this.prefix ? `${this.prefix}_${key}` : key;
    }

    async saveMasterSeed(seed: EncryptedData): Promise<void> {
        await this.storage.set({
            [this.getKey('masterSeed')]: seed
        });
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        const result = await this.storage.get(this.getKey('masterSeed'));
        return result[this.getKey('masterSeed')] || null;
    }

    async saveAccount(account: Account, storageKey: Uint8Array): Promise<void> {
        // Load existing accounts
        const result = await this.storage.get(this.getKey('accounts'));
        const accounts: Record<string, EncryptedAccount> = result[this.getKey('accounts')] || {};
        
        // Add/Update account
        accounts[account.tag] = await encryptAccount(account, storageKey);
        
        // Save all accounts
        await this.storage.set({
            [this.getKey('accounts')]: accounts
        });
    }

    async loadAccount(id: string, storageKey: Uint8Array): Promise<Account | null> {
        const result = await this.storage.get(this.getKey('accounts'));
        const accounts = result[this.getKey('accounts')] || {};
        const encryptedAccount = accounts[id];
        
        if (!encryptedAccount) return null;
        return decryptAccount(encryptedAccount, storageKey);
    }

    async loadAccounts(storageKey: Uint8Array): Promise<Account[]> {
        const result = await this.storage.get(this.getKey('accounts'));
        const accounts: Record<string, EncryptedAccount> = result[this.getKey('accounts')] || {};
        
        return Promise.all(
            Object.values(accounts).map(encrypted => 
                decryptAccount(encrypted, storageKey)
            )
        );
    }

    async deleteAccount(id: string): Promise<void> {
        const result = await this.storage.get(this.getKey('accounts'));
        const accounts = result[this.getKey('accounts')] || {};
        
        delete accounts[id];
        
        await this.storage.set({
            [this.getKey('accounts')]: accounts
        });
    }

    async saveActiveAccount(id: string | null): Promise<void> {
        await this.storage.set({
            [this.getKey('activeAccount')]: id
        });
    }

    async loadActiveAccount(): Promise<string | null> {
        const result = await this.storage.get(this.getKey('activeAccount'));
        return result[this.getKey('activeAccount')] || null;
    }

    async saveHighestIndex(index: number): Promise<void> {
        await this.storage.set({
            [this.getKey('highestIndex')]: index
        });
    }

    async loadHighestIndex(): Promise<number> {
        const result = await this.storage.get(this.getKey('highestIndex'));
        return result[this.getKey('highestIndex')] || -1;
    }

    async clear(): Promise<void> {
        const result = await this.storage.get();
        const keys = Object.keys(result).filter(key => key.startsWith(this.prefix));
        if (keys.length > 0) {
            await this.storage.remove(keys);
        }
    }
} 

function getStorageArea(): StorageArea {
    if (typeof browser !== 'undefined' && browser.storage) {
        return browser.storage.sync || browser.storage.local;
    }
    if (typeof chrome !== 'undefined' && chrome.storage) {
        return chrome.storage.sync || chrome.storage.local;
    }
    throw new Error('No extension storage API available');
}