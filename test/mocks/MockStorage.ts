import { Storage } from '../../src/types/storage';
import { EncryptedData } from '../../src/crypto/encryption';
import { Account } from '../../src/types';
import { decryptAccount, encryptAccount, EncryptedAccount } from '../../src/crypto/accountEncryption';
export class MockStorage implements Storage {
    private data: { 
        masterSeed?: EncryptedData;
        activeAccount?: string;
        accounts: Record<string, EncryptedAccount>;
        highestIndex: number;
    } = {
        accounts: {},
        highestIndex: -1
    };

    async saveAccount(account: Account, storageKey: Uint8Array): Promise<void> {
        if (!account.tag) throw new Error('Account must have a tag');
        this.data.accounts[account.tag] = await encryptAccount(account, storageKey);
    }

    async loadAccount(id: string, storageKey: Uint8Array): Promise<Account | null> {
        const account = this.data.accounts[id];
        if (!account) return null;
        return decryptAccount(account, storageKey);
    }

    async loadAccounts(storageKey: Uint8Array): Promise<Account[]> {
        return Promise.all(Object.values(this.data.accounts).map(account => decryptAccount(account, storageKey)));
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
