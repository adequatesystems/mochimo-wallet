import { Account } from './account';
import { EncryptedData } from '../crypto/encryption';


export interface Signature {
    signature: Uint8Array;
    publicKey: Uint8Array;
    index: number;
}

export interface HDWallet {
    // Initialization
    create(password: string): Promise<void>;
    load(password: string): Promise<void>;
    import(exportData: string, password: string): Promise<void>;
    export(password: string): Promise<string>;

    // Account Management
    createAccount(name: string): Promise<Account>;
    getAccounts(): Array<Account>;
    setCurrentAccount(index: number): void;
    
    // WOTS Operations
    sign(message: Uint8Array): Promise<Signature>;
    verify(message: Uint8Array, signature: Signature, publicKey: Uint8Array): boolean;
    getNextPublicKey(): Uint8Array;
    
    // Security
    lock(): void;
    unlock(password: string): Promise<void>;
    changePassword(oldPassword: string, newPassword: string): Promise<void>;
}

export interface WalletExport {
    version: string;
    timestamp: number;
    encrypted: EncryptedData;
    accounts: Account[];
} 