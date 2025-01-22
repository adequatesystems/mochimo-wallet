import { Storage } from '../types/storage';
import { Account } from '../types/account';
import { EncryptedData } from '../crypto/webCrypto';
import { encryptAccount, decryptAccount, EncryptedAccount } from '../crypto/accountEncryption';

export class LocalStorage implements Storage {
    private readonly prefix: string;

    constructor(prefix = 'mochimo_wallet_') {
        this.prefix = prefix;
    }

    private getKey(key: string): string {
        return `${this.prefix}${key}`;
    }

    async saveMasterSeed(encrypted: EncryptedData): Promise<void> {
        localStorage.setItem(
            this.getKey('masterSeed'),
            JSON.stringify(encrypted)
        );
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        const data = localStorage.getItem(this.getKey('masterSeed'));
        return data ? JSON.parse(data) : null;
    }

    async saveAccount(account: Account, storageKey: Uint8Array): Promise<void> {
        const data = localStorage.getItem(this.getKey('accounts'));
        const accounts: Record<string, EncryptedAccount> = data ? JSON.parse(data) : {};
        
        accounts[account.tag] = await encryptAccount(account, storageKey);
        
        localStorage.setItem(
            this.getKey('accounts'),
            JSON.stringify(accounts)
        );
    }

    async loadAccount(id: string, storageKey: Uint8Array): Promise<Account | null> {
        const data = localStorage.getItem(this.getKey('accounts'));
        const accounts: Record<string, EncryptedAccount> = data ? JSON.parse(data) : {};
        const encryptedAccount = accounts[id];
        
        if (!encryptedAccount) return null;
        return decryptAccount(encryptedAccount, storageKey);
    }

    async loadAccounts(storageKey: Uint8Array): Promise<Account[]> {
        const data = localStorage.getItem(this.getKey('accounts'));
        const accounts: Record<string, EncryptedAccount> = data ? JSON.parse(data) : {};
        
        return Promise.all(
            Object.values(accounts).map(encrypted => 
                decryptAccount(encrypted, storageKey)
            )
        );
    }

    async deleteAccount(id: string): Promise<void> {
        const data = localStorage.getItem(this.getKey('accounts'));
        const accounts: Record<string, EncryptedAccount> = data ? JSON.parse(data) : {};
        
        delete accounts[id];
        
        localStorage.setItem(
            this.getKey('accounts'),
            JSON.stringify(accounts)
        );
    }

    async saveActiveAccount(id: string | null): Promise<void> {
        localStorage.setItem(
            this.getKey('activeAccount'),
            JSON.stringify(id)
        );
    }

    async loadActiveAccount(): Promise<string | null> {
        const data = localStorage.getItem(this.getKey('activeAccount'));
        return data ? JSON.parse(data) : null;
    }

    async saveHighestIndex(index: number): Promise<void> {
        localStorage.setItem(
            this.getKey('highestIndex'),
            JSON.stringify(index)
        );
    }

    async loadHighestIndex(): Promise<number> {
        const data = localStorage.getItem(this.getKey('highestIndex'));
        return data ? JSON.parse(data) : -1;
    }

    async clear(): Promise<void> {
        const keys = Object.keys(localStorage).filter(key => 
            key.startsWith(this.prefix)
        );
        keys.forEach(key => localStorage.removeItem(key));
    }
} 