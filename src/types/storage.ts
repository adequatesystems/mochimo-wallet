import { EncryptedData } from '../crypto/encryption';
import { AccountData } from './account';

export interface Storage {
    saveMasterSeed(encrypted: EncryptedData): Promise<void>;
    loadMasterSeed(): Promise<EncryptedData | null>;
    saveAccount(account: AccountData): Promise<void>;
    loadAccounts(): Promise<AccountData[]>;
    clear(): Promise<void>;
}

// Extension storage types
export interface StorageArea {
    get(keys?: string | string[] | object): Promise<{ [key: string]: any }>;
    set(items: object): Promise<void>;
    remove(keys: string | string[]): Promise<void>;
}

export interface StorageAPI {
    sync: StorageArea;
    local: StorageArea;
    managed?: StorageArea;
    session?: StorageArea;
    onChanged: {
        addListener(callback: StorageChangeCallback): void;
        removeListener(callback: StorageChangeCallback): void;
    };
}

export interface StorageChange {
    oldValue?: any;
    newValue?: any;
}

export interface StorageChanges {
    [key: string]: StorageChange;
}

export type StorageChangeCallback = (changes: StorageChanges, areaName: string) => void; 