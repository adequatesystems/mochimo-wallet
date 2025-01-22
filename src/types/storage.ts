import { Account } from './account';
import { EncryptedData } from '../crypto/webCrypto';

export interface Storage {
    saveMasterSeed(seed: EncryptedData): Promise<void>;
    loadMasterSeed(): Promise<EncryptedData | null>;
    
    // Storage layer handles encryption/decryption
    saveAccount(account: Account, storageKey: Uint8Array): Promise<void>;
    loadAccount(id: string, storageKey: Uint8Array): Promise<Account | null>;
    loadAccounts(storageKey: Uint8Array): Promise<Account[]>;
    deleteAccount(id: string): Promise<void>;
    
    saveActiveAccount(id: string | null): Promise<void>;
    loadActiveAccount(): Promise<string | null>;
    
    saveHighestIndex(index: number): Promise<void>;
    loadHighestIndex(): Promise<number>;
    
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