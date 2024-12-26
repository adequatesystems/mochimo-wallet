import { Storage } from '../types/storage';
import { EncryptedData } from '../crypto/encryption';
import { AccountData } from '../types/account';

export class LocalStorage implements Storage {
    private readonly prefix: string;

    constructor(prefix = 'mochimo_wallet_') {
        this.prefix = prefix;
    }

    async saveMasterSeed(encrypted: EncryptedData): Promise<void> {
        localStorage.setItem(
            `${this.prefix}master_seed`,
            JSON.stringify(encrypted)
        );
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        const data = localStorage.getItem(`${this.prefix}master_seed`);
        return data ? JSON.parse(data) : null;
    }

    async saveAccount(account: AccountData): Promise<void> {
        const accounts = await this.loadAccounts();
        const index = accounts.findIndex(a => a.tag === account.tag);
        
        if (index >= 0) {
            accounts[index] = account;
        } else {
            accounts.push(account);
        }

        localStorage.setItem(
            `${this.prefix}accounts`,
            JSON.stringify(accounts)
        );
    }

    async loadAccounts(): Promise<AccountData[]> {
        const data = localStorage.getItem(`${this.prefix}accounts`);
        return data ? JSON.parse(data) : [];
    }

    async saveActiveAccount(account: AccountData): Promise<void> {
        localStorage.setItem(
            `${this.prefix}active_account`,
            JSON.stringify(account)
        );
    }

    async loadActiveAccount(): Promise<AccountData | null> {
        const data = localStorage.getItem(`${this.prefix}active_account`);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Clears all wallet data from storage
     */
    async clear(): Promise<void> {
        localStorage.removeItem(`${this.prefix}master_seed`);
        localStorage.removeItem(`${this.prefix}accounts`);
        localStorage.removeItem(`${this.prefix}active_account`);
    }
} 