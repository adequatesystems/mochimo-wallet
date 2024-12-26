import { EncryptedData } from '../crypto/encryption';
import { AccountData } from './account';

export interface Storage {
    saveMasterSeed(encrypted: EncryptedData): Promise<void>;
    loadMasterSeed(): Promise<EncryptedData | null>;
    saveAccount(account: AccountData): Promise<void>;
    loadAccounts(): Promise<AccountData[]>;
} 