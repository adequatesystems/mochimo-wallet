import { Account } from "../types/account";
import { ActivityFetchOptions, NetworkService, PaginatedTransactionResponse, PaginationOptions, TagActivationResponse, TagResolveResponse, TransactionResponse, WalletTransaction } from "../types/network";

export class ProxyNetworkService implements NetworkService {
    public apiUrl: string;
    getNetworkStatus(): Promise<{ height: number; nodes: any[]; }> {
        throw new Error("Method not implemented.");
    }
    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
    }
    getBalance(tag: string): Promise<string> {
        throw new Error("Method not implemented.");
    }

    async resolveTag(tag: string): Promise<TagResolveResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/net/resolve/${tag}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error resolving tag:', error);
            throw error;
        }
    }
    async pushTransaction(transaction: string, recipients?: number): Promise<TransactionResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/push`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ transaction, recipients })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            return {
                status: 'success',
                data
            };
        } catch (error) {
            console.error('Error pushing transaction:', error);
            return {
                status: 'error',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    async activateTag(wotsAddress: string): Promise<TagActivationResponse> {
        try {
            const response = await fetch(`${this.apiUrl}/fund/${wotsAddress}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error activating tag:', error);
            throw error;
        }
    }

    // Pagination methods - not implemented for proxy service
    async fetchRecentActivity(account: Account, options?: ActivityFetchOptions): Promise<PaginatedTransactionResponse> {
        throw new Error("Pagination methods not supported by ProxyNetworkService. Use MeshNetworkService instead.");
    }

    async fetchConfirmedTransactions(address: string, options?: PaginationOptions): Promise<PaginatedTransactionResponse> {
        throw new Error("Pagination methods not supported by ProxyNetworkService. Use MeshNetworkService instead.");
    }

    async fetchMempoolTransactions(address: string): Promise<WalletTransaction[]> {
        throw new Error("Pagination methods not supported by ProxyNetworkService. Use MeshNetworkService instead.");
    }
}
