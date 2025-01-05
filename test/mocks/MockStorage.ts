import { Storage } from '../../src/types/storage';
import { Account } from '../../src/redux/types/state';
import { EncryptedData } from '../../src/crypto/encryption';

export class MockStorage implements Storage {
    private data: {
        masterSeed?: EncryptedData;
        accounts: Account[];
        activeAccount?: string;
        highestIndex: number;
    } = {
        accounts: [],
        highestIndex: -1
    };

    async saveMasterSeed(encrypted: EncryptedData): Promise<void> {
        this.data.masterSeed = encrypted;
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        return this.data.masterSeed || null;
    }

    async saveAccount(account: Account): Promise<void> {
        const index = this.data.accounts.findIndex(a => a.tag === account.tag);
        if (index >= 0) {
            this.data.accounts[index] = account;
        } else {
            this.data.accounts.push(account);
        }
    }

    async loadAccounts(): Promise<Account[]> {
        return this.data.accounts;
    }

    async clear(): Promise<void> {
        this.data = {
            accounts: [],
            highestIndex: -1
        };
    }

    async saveActiveAccount(accountId: string): Promise<void> {
        this.data.activeAccount = accountId;
    }

    async loadActiveAccount(): Promise<string | null> {
        return this.data.activeAccount || null;
    }

    async saveHighestIndex(index: number): Promise<void> {
        this.data.highestIndex = index;
    }

    async loadHighestIndex(): Promise<number> {
        return this.data.highestIndex;
    }

    async loadAccount(id: string): Promise<Account | null> {
        const account = this.data.accounts.find(a => a.tag === id);
        return account || null;
    }
} 