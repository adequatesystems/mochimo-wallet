import { Storage } from '../../src/types/storage';
import { EncryptedData } from '../../src/crypto/encryption';
import { Account } from '../../src/types';

export class MockStorage implements Storage {
    private data: { 
        masterSeed?: EncryptedData;
        activeAccount?: string;
        accounts: Record<string, Account>;
        highestIndex: number;
    } = {
        accounts: {},
        highestIndex: -1
    };

    async saveAccount(account: Account): Promise<void> {
        if (!account.tag) throw new Error('Account must have a tag');
        this.data.accounts[account.tag] = account;
    }

    async loadAccount(id: string): Promise<Account | null> {
        return this.data.accounts[id] || null;
    }

    async loadAccounts(): Promise<Account[]> {
        return Object.values(this.data.accounts);
    }

    async saveHighestIndex(index: number): Promise<void> {
        this.data.highestIndex = index;
    }

    async loadHighestIndex(): Promise<number> {
        return this.data.highestIndex;
    }

    async deleteAccount(id: string): Promise<void> {
        delete this.data.accounts[id];
    }

    async saveMasterSeed(encryptedSeed: EncryptedData): Promise<void> {
        this.data.masterSeed = encryptedSeed;
    }

    async loadMasterSeed(): Promise<EncryptedData | null> {
        return this.data.masterSeed || null;
    }

    async saveActiveAccount(tag: string): Promise<void> {
        this.data.activeAccount = tag;
    }

    async loadActiveAccount(): Promise<string | null> {
        return this.data.activeAccount || null;
    }

    async clear(): Promise<void> {
        this.data = {
            accounts: {},
            highestIndex: -1
        };
    }
} 