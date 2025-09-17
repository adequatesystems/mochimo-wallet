import { Account } from '../types/account';
import { ActivityFetchOptions, NetworkService, PaginatedTransactionResponse, PaginationOptions, TagActivationResponse, TagResolveResponse, TransactionResponse, WalletTransaction } from '../types/network';

export abstract class BaseNetworkService implements NetworkService {
    getBalance(tag: string): Promise<string> {
        throw new Error('Method not implemented.');
    }
    public abstract apiUrl: string;

    async resolveTag(tag: string): Promise<TagResolveResponse> {
        throw new Error("Method not implemented.");
    }

    async pushTransaction(transaction: string, recipients?: number): Promise<TransactionResponse> {
       throw new Error("Method not implemented.");
    }

    async activateTag(wotsAddress: string): Promise<TagActivationResponse> {
        throw new Error("Method not implemented.");
    }

    abstract getNetworkStatus(): Promise<{ height: number; nodes: any[] }>;

    // Pagination methods - throw errors by default, to be implemented by subclasses
    async fetchRecentActivity(account: Account, options?: ActivityFetchOptions): Promise<PaginatedTransactionResponse> {
        throw new Error("Method not implemented.");
    }

    async fetchConfirmedTransactions(address: string, options?: PaginationOptions): Promise<PaginatedTransactionResponse> {
        throw new Error("Method not implemented.");
    }

    async fetchMempoolTransactions(address: string): Promise<WalletTransaction[]> {
        throw new Error("Method not implemented.");
    }
} 