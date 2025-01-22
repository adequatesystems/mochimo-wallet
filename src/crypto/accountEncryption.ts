import { Account } from '../types/account';
import { encrypt, decrypt, EncryptedData } from './webCrypto';

export interface EncryptedAccount {
    tag: string; // Keep unencrypted for lookups
    encryptedData: EncryptedData;
}

export const encryptAccount = async (
    account: Account, 
    storageKey: Uint8Array
): Promise<EncryptedAccount> => {
    const accountData = Buffer.from(JSON.stringify(account), 'utf-8');
    const encryptedData = await encrypt(accountData, Buffer.from(storageKey).toString('hex'));
    
    return {
        tag: account.tag,
        encryptedData
    };
};

export const decryptAccount = async (
    encryptedAccount: EncryptedAccount, 
    storageKey: Uint8Array
): Promise<Account> => {
    const decryptedData = await decrypt(encryptedAccount.encryptedData, Buffer.from(storageKey).toString('hex'));
    const decryptedString = Buffer.from(decryptedData).toString('utf-8');
    return JSON.parse(decryptedString );
}; 
