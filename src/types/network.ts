/**
 * Network node information
 */
export interface NetworkNode {
    host: string;
    port: number;
    updateTime: string;
    // Add other node fields as needed
}

/**
 * Response from tag resolution
 */
export interface TagResolveResponse {
    success: boolean;
    unanimous: boolean;
    addressConsensus: string;
    balanceConsensus: string;
    quorum: Array<{
        node: NetworkNode;
        address: string;
        balance: string;
    }>;
}

/**
 * Response from transaction push
 */
export interface TransactionResponse {
    status: 'success' | 'error'
    data?: {
      sent: number
      txid: string
    }
    error?: string
  }

/**
 * Response from tag activation
 */
export interface TagActivationResponse {
    status: 'success' | 'error';
    message: string;
    data?: {
        txid?: string;
        amount?: string;
    };
}

/**
 * Wallet transaction interface
 */
export interface WalletTransaction {
    type: 'send' | 'receive' | 'mining';
    amount: string;
    timestamp: number;
    address: string;
    txid: string;
    blockNumber?: number;
    pending: boolean;
    fee?: string;
    memo?: string;
}

/**
 * Pagination options for transaction queries
 */
export interface PaginationOptions {
    limit?: number;
    offset?: number;
    maxBlock?: number;
    status?: string;
}

/**
 * Paginated response for transactions
 */
export interface PaginatedTransactionResponse {
    transactions: WalletTransaction[];
    totalCount?: number;
    hasMore: boolean;
    nextOffset?: number;
}

/**
 * Activity fetch options
 */
export interface ActivityFetchOptions extends PaginationOptions {
    includeMempool?: boolean;
    includeConfirmed?: boolean;
}

/**
 * Network service interface
 */
export interface NetworkService {
    apiUrl: string;
    /**
     * Resolves a tag to its current WOTS address and balance
     * @param tag The tag to resolve
     */
    resolveTag(tag: string): Promise<TagResolveResponse>;

    /**
     * Pushes a transaction to the network
     * @param transaction Serialized transaction
     * @param recipients Optional number of recipients
     */
    pushTransaction(transaction: string, recipients?: number): Promise<TransactionResponse>;

    /**
     * Activates a tag with its first WOTS address
     * @param wotsAddress The WOTS address to activate
     */
    activateTag(wotsAddress: string): Promise<TagActivationResponse>;

    /**
     * Gets the current network status
     */
    getNetworkStatus(): Promise<{
        height: number;
        nodes: NetworkNode[];
    }>;

    /**
     * Gets a tag's WOTS address balance
     * @param tag The tag to get the balance of
     */
    getBalance(tag: string): Promise<string>;

    /**
     * Fetches recent activity for an account with pagination support
     * @param account The account to fetch activity for
     * @param options Pagination and filtering options
     */
    fetchRecentActivity(account: any, options?: ActivityFetchOptions): Promise<PaginatedTransactionResponse>;

    /**
     * Fetches confirmed transactions for an account with pagination
     * @param address The account address
     * @param options Pagination options
     */
    fetchConfirmedTransactions(address: string, options?: PaginationOptions): Promise<PaginatedTransactionResponse>;

    /**
     * Fetches mempool transactions for an account
     * @param address The account address
     */
    fetchMempoolTransactions(address: string): Promise<WalletTransaction[]>;
} 
export interface NetworkState {
    blockHeight: number;
    isConnected: boolean;
    error: string | null;
}