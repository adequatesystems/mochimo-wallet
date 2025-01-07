import { NetworkType } from '../../types/account';
import { Account } from '../../types/account';

export interface WalletState {
    initialized: boolean;
    locked: boolean;
    hasWallet: boolean;
    network: NetworkType;
    error: string | null;
    highestAccountIndex: number;
}

export interface AccountState {
    accounts: {
        [id: string]: Account;
    };
    selectedAccount: string | null;
    loading: boolean;
    error: string | null;
}

export interface RootState {
    wallet: WalletState;
    accounts: AccountState;
}
export interface NetworkState {
    isLoading: boolean;
    error: Error | null;
}
export interface TransactionState {
    isLoading: boolean;
    error: string | null;
    pendingTransactions: string[]; // Array of transaction hashes
}

// Add type guard to ensure imported accounts have seeds
export function isImportedAccount(account: Account): account is Account & { seed: string } {
    return account.source === 'mcm' && account.seed !== undefined;
} 