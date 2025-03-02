export type NetworkType = 'mainnet' | 'testnet' | 'devnet';

export type AccountType = 'standard' | 'imported' | 'hardware';

export interface Account {
    name: string;
    type: AccountType;
    balance: string;
    tag: string;
    index?: number;
    source?: 'mnemonic' | 'mcm' | 'keypair';
    order?: number;
    wotsIndex: number; //starts from -1
    seed: string;
    faddress: string;// first address generated for this account
    avatar?: string;
    isDeleted?: boolean;
} 