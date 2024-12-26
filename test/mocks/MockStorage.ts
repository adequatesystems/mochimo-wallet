import { Storage } from '../../src/types/storage';
import { EncryptedData } from '../../src/crypto/encryption';
import { AccountData } from '../../src/types/account';

export class MockStorage implements Storage {
    private masterSeed?: EncryptedData;
    private accounts: AccountData[] = [];
    private activeAccount?: AccountData;

    async clear(): Promise<void> {
        this.masterSeed = undefined;
        this.accounts = [];
        this.activeAccount = undefined;
        return Promise.resolve();
    }

    async saveMasterSeed(encrypted: EncryptedData): Promise<void> {
        this.masterSeed = encrypted;
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        return this.masterSeed || null;
    }

    async saveAccount(account: AccountData): Promise<void> {
        const index = this.accounts.findIndex(a => a.tag === account.tag);
        if (index >= 0) {
            this.accounts[index] = account;
        } else {
            this.accounts.push(account);
        }
    }

    async loadAccounts(): Promise<AccountData[]> {
        return this.accounts;
    }

    async saveActiveAccount(account: AccountData): Promise<void> {
        this.activeAccount = account;
    }

    async loadActiveAccount(): Promise<AccountData | null> {
        return this.activeAccount || null;
    }
} 