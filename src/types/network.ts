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
export interface TransactionPushResponse {
    status: 'success' | 'error';
    data: any;  // Can be made more specific based on API
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
 * Network service interface
 */
export interface NetworkService {
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
    pushTransaction(transaction: string, recipients?: number): Promise<TransactionPushResponse>;

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
} 