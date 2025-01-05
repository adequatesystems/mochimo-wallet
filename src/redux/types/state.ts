import { AccountType, NetworkType } from '../../types/account';

export interface WalletState {
    initialized: boolean;
    locked: boolean;
    hasWallet: boolean;
    network: NetworkType;
    error: string | null;
    highestAccountIndex: number;
    activeAccount: string | null;
}

export interface Account {
    name: string;
    type: AccountType;
    address: string;
    balance: string;
    tag: string;
    index?: number;  // Required for HD wallet accounts (account index)
    seed?: string;   // Required for imported accounts (MCM)
    source: 'mnemonic' | 'mcm';
    order?: number;
    wotsIndex: number;  // Track next WOTS key index
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

// Add type guard to ensure imported accounts have seeds
export function isImportedAccount(account: Account): account is Account & { seed: string } {
    return account.source === 'mcm' && account.seed !== undefined;
} 