import { MochimoApiClient } from "mochimo-mesh-api-client";
import { Account } from "../types/account";
import {
    ActivityFetchOptions,
    NetworkService,
    PaginatedTransactionResponse,
    PaginationOptions,
    TagActivationResponse,
    TagResolveResponse,
    TransactionResponse,
    WalletTransaction
} from "../types/network";
export class MeshNetworkService implements NetworkService {
    public apiUrl: string;
    private apiClient: MochimoApiClient;
    
    getNetworkStatus(): Promise<{ height: number; nodes: any[]; }> {
        return this.apiClient.getNetworkStatus().then(res=>{
            return {
                height: parseInt(res?.current_block_identifier?.index?.toString() ?? '0'),
                nodes: []
            }
        })
    }
    constructor(apiUrl: string) {
        this.apiUrl = apiUrl;
        this.apiClient = new MochimoApiClient(apiUrl);
    }
    getBalance(tag: string): Promise<string> {
        return this.apiClient.getAccountBalance(tag).then(res=>{
            return res.balances[0].value
        }).catch(err=>{
            if(err.message.includes('Account not found')){
                return '0'
            }
            throw err
        })
    }

    resolveTag(tag: string): Promise<TagResolveResponse> {
        return this.apiClient.resolveTag("0x"+tag).then(res => {
            return {
                success: true,
                unanimous: true,
                addressConsensus: res.result.address,
                balanceConsensus: res.result.amount,
                quorum: []
            }
        })
    }

    async pushTransaction(transaction: string, recipients?: number): Promise<TransactionResponse> {
        try {
            const result = await this.apiClient.submit(transaction)
            return {
                status: 'success',
                data: {
                    sent: 0,
                    txid: result.transaction_identifier.hash,
                },
            }
        } catch (err) {
            return {
                status: 'error',
                error: 'Could not submit transaction'
            }
        }
    }

    activateTag(wotsAddress: string): Promise<TagActivationResponse> {
        return Promise.resolve({ status: 'success', data: { txid: '',amount: '' }, message: 'Successfully activated tag' })
    }

    /**
     * Fetches recent activity for an account with pagination support
     * @param account The account to fetch activity for
     * @param options Pagination and filtering options
     */
    async fetchRecentActivity(account: Account, options: ActivityFetchOptions = {}): Promise<PaginatedTransactionResponse> {
        const {
            limit = 20,
            offset = 0,
            includeMempool = true,
            includeConfirmed = true,
            maxBlock,
            status
        } = options;

        const currentAddress = '0x' + account.tag;
        let allTransactions: WalletTransaction[] = [];
        let hasMore = false;
        let totalCount = 0;

        // Fetch confirmed transactions if requested
        if (includeConfirmed) {
            try {
                const confirmedResult = await this.fetchConfirmedTransactions(currentAddress, {
                    limit,
                    offset,
                    maxBlock,
                    status
                });
                allTransactions.push(...confirmedResult.transactions);
                hasMore = confirmedResult.hasMore;
                totalCount = confirmedResult.totalCount || 0;
            } catch (error) {
                console.warn('Failed to fetch confirmed transactions:', error);
            }
        }

        // Fetch mempool transactions if requested
        if (includeMempool) {
            try {
                const mempoolTransactions = await this.fetchMempoolTransactions(currentAddress);
                allTransactions.push(...mempoolTransactions);
            } catch (error) {
                console.warn('Failed to fetch mempool transactions:', error);
            }
        }

        // Sort all transactions by timestamp (newest first)
        allTransactions.sort((a, b) => b.timestamp - a.timestamp);

        // For pagination, use the confirmed transactions hasMore since that's what supports pagination
        // Mempool transactions don't support pagination (they're fetched all at once)
        let finalHasMore = false;
        let nextOffset = offset + limit;
        
        if (includeConfirmed && !includeMempool) {
            // Only confirmed transactions - use the confirmed hasMore from API
            finalHasMore = hasMore;
        } else if (!includeConfirmed && includeMempool) {
            // Only mempool - no pagination support
            finalHasMore = false;
        } else {
            // Both confirmed and mempool - use confirmed pagination info
            // since mempool doesn't support pagination
            finalHasMore = hasMore;
        }

        return {
            transactions: allTransactions,
            totalCount: allTransactions.length,
            hasMore: finalHasMore,
            nextOffset: finalHasMore ? nextOffset : undefined
        };
    }

    /**
     * Fetches confirmed transactions for an account with pagination
     * @param address The account address
     * @param options Pagination options
     */
    async fetchConfirmedTransactions(address: string, options: PaginationOptions = {}): Promise<PaginatedTransactionResponse> {
        const { limit = 20, offset = 0, maxBlock, status } = options;
        
        try {
            const txResult = await (this.apiClient as any).searchTransactionsByAddress(address, {
                limit,
                offset,
                max_block: maxBlock,
                status
            });

            if (!txResult || !Array.isArray(txResult.transactions)) {
                return {
                    transactions: [],
                    hasMore: false,
                    totalCount: 0
                };
            }

            const transactions: WalletTransaction[] = [];
            
            for (const tx of txResult.transactions) {
                if (!tx.transaction_identifier?.hash || !tx.operations || !tx.block_identifier?.index) {
                    continue;
                }

                const blockNumber = tx.block_identifier?.index;
                const timestamp = tx.timestamp || Date.now();
                const txid = tx.transaction_identifier?.hash;
                let feeTotal = BigInt(0);
                
                if (tx.metadata && tx.metadata.fee_total) {
                    feeTotal = BigInt(tx.metadata.fee_total);
                }

                // Process SEND operations
                const sendOps = tx.operations.filter((op: any) =>
                    (op.type === 'SOURCE_TRANSFER') &&
                    op.account?.address?.toLowerCase() === address.toLowerCase()
                );

                for (const sendOp of sendOps) {
                    const senderAddress = sendOp.account?.address?.toLowerCase();
                    const destOps = tx.operations.filter((op: any) =>
                        op.type === 'DESTINATION_TRANSFER' &&
                        op.account?.address?.toLowerCase() !== senderAddress
                    );
                    
                    const feePerDest = destOps.length > 0 ? (feeTotal / BigInt(destOps.length)) : BigInt(0);
                    
                    for (const destOp of destOps) {
                        transactions.push({
                            type: 'send',
                            amount: destOp.amount?.value || '0',
                            timestamp,
                            address: destOp.account?.address,
                            txid,
                            blockNumber,
                            pending: false,
                            fee: feePerDest.toString(),
                            memo: destOp.metadata?.memo
                        });
                    }
                }

                // Process RECEIVE operations
                const recvOps = tx.operations.filter((op: any) =>
                    (op.type === 'DESTINATION_TRANSFER') &&
                    op.account?.address?.toLowerCase() === address.toLowerCase()
                );

                for (const recvOp of recvOps) {
                    const sourceOp = tx.operations.find((op: any) => op.type === 'SOURCE_TRANSFER');
                    if (sourceOp && sourceOp.account?.address?.toLowerCase() !== address.toLowerCase()) {
                        transactions.push({
                            type: 'receive',
                            amount: recvOp.amount?.value || '0',
                            timestamp,
                            address: sourceOp.account?.address || 'Unknown',
                            txid,
                            blockNumber,
                            pending: false,
                            memo: recvOp.metadata?.memo
                        });
                    }
                }
            }

            // Determine if there are more transactions using the API response
            // The API provides nextOffset and totalCount for proper pagination
            const hasMore = txResult.next_offset !== undefined && txResult.next_offset > 0;
            const totalCount = txResult.total_count || transactions.length;

            return {
                transactions,
                hasMore,
                totalCount,
                nextOffset: hasMore ? offset + limit : undefined
            };

        } catch (error) {
            console.error('Error fetching confirmed transactions:', error);
            return {
                transactions: [],
                hasMore: false,
                totalCount: 0
            };
        }
    }

    /**
     * Fetches mempool transactions for an account
     * @param address The account address
     */
    async fetchMempoolTransactions(address: string): Promise<WalletTransaction[]> {
        try {
            const mempoolRes = await this.apiClient.getMempoolTransactions();
            
            if (!mempoolRes || !Array.isArray(mempoolRes.transaction_identifiers)) {
                return [];
            }

            const mempoolTransactions: WalletTransaction[] = [];

            // Get individual mempool transactions
            for (const txIdentifier of mempoolRes.transaction_identifiers) {
                try {
                    const tx = await this.apiClient.getMempoolTransaction(txIdentifier.hash);
                    
                    if (!tx.transaction?.transaction_identifier?.hash || !tx.transaction?.operations) {
                        continue;
                    }

                    const timestamp = tx.metadata?.timestamp || Date.now();
                    const txid = tx.transaction.transaction_identifier.hash;
                    const operations = tx.transaction.operations;
                    
                    // Check if this transaction involves the account
                    const hasRelevantOps = operations.some((op: any) =>
                        op.account?.address?.toLowerCase() === address.toLowerCase()
                    );
                    
                    if (!hasRelevantOps) {
                        continue;
                    }

                    // Process outgoing transactions
                    const sendOps = operations.filter((op: any) =>
                        (op.type === 'SOURCE_TRANSFER') &&
                        op.account?.address?.toLowerCase() === address.toLowerCase()
                    );

                    for (const sendOp of sendOps) {
                        const destOps = operations.filter((op: any) =>
                            op.type === 'DESTINATION_TRANSFER' &&
                            op.account?.address?.toLowerCase() !== address.toLowerCase()
                        );

                        for (const destOp of destOps) {
                            mempoolTransactions.push({
                                type: 'send',
                                amount: destOp.amount?.value || '0',
                                timestamp,
                                address: destOp.account?.address,
                                txid,
                                pending: true,
                                memo: destOp.metadata?.memo
                            });
                        }
                    }

                    // Process incoming transactions
                    const recvOps = operations.filter((op: any) =>
                        (op.type === 'DESTINATION_TRANSFER') &&
                        op.account?.address?.toLowerCase() === address.toLowerCase()
                    );

                    for (const recvOp of recvOps) {
                        const sourceOp = operations.find((op: any) => op.type === 'SOURCE_TRANSFER');
                        if (sourceOp && sourceOp.account?.address?.toLowerCase() !== address.toLowerCase()) {
                            mempoolTransactions.push({
                                type: 'receive',
                                amount: recvOp.amount?.value || '0',
                                timestamp,
                                address: sourceOp.account?.address || 'Unknown',
                                txid,
                                pending: true,
                                memo: recvOp.metadata?.memo
                            });
                        }
                    }
                } catch (error) {
                    // Skip individual transaction if it fails to fetch
                    console.warn(`Failed to fetch mempool transaction ${txIdentifier.hash}:`, error);
                    continue;
                }
            }

            return mempoolTransactions;

        } catch (error) {
            console.error('Error fetching mempool transactions:', error);
            return [];
        }
    }

}