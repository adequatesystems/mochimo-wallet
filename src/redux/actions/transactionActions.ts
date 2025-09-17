import { Account } from '@/types/account';
import { ActivityFetchOptions } from '@/types/network';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { selectCurrentWOTSKeyPair, selectNextWOTSKeyPair, selectSelectedAccount } from '../selectors/accountSelectors';
import {
    addPendingTransaction,
    appendAccountActivityData,
    appendActivityData,
    setAccountActivityData,
    setActivityData,
    setActivityError,
    setActivityLoading,
    setError,
    setLoading
} from '../slices/transactionSlice';
import { RootState } from '../store';

import { isValidMemo, TransactionBuilder } from 'mochimo-mesh-api-client';
import { WOTSWallet } from 'mochimo-wots';
import { NetworkProvider } from '../context/NetworkContext';

interface SendTransactionParams {
    to: string;
    amount: bigint;
    memo?:string;
}

export const sendTransactionAction = createAsyncThunk(
    'transaction/send',
    async (params: SendTransactionParams, { getState, dispatch }) => {
        const state = getState() as RootState;
        const selectedAccount = selectSelectedAccount(state);
        const senderKeyPair = selectCurrentWOTSKeyPair(state);
        const changeKeyPair = selectNextWOTSKeyPair(state);
        if (!selectedAccount || !senderKeyPair || !changeKeyPair) {
            throw new Error('No account selected');
        }

        dispatch(setLoading(true));
        dispatch(setError(null));

        try {
            const tagResolve = await NetworkProvider.getNetwork().resolveTag(selectedAccount.tag)
            const balance = BigInt(tagResolve.balanceConsensus)
            //validate memo
            if(params.memo){
                if(!isValidMemo(params.memo)){
                    throw new Error('Invalid memo');
                }
            }

            const { amount } = params;

            const tx = await createAndSendTransaction(
                senderKeyPair.wotsWallet!, 
                changeKeyPair.wotsWallet!, 
                Buffer.from(params.to, 'hex'), 
                amount, 
                balance,
                {memo: params.memo}
            );

            // Send transaction
            if (tx?.tx?.hash) {
                dispatch(addPendingTransaction(tx.tx.hash));
                return tx.tx.hash;
            } else {
                throw new Error('Failed to create transaction');
            }

        } catch (error) {
            console.error('Transaction error:', error);
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            dispatch(setError(errorMessage));
            throw new Error(errorMessage);
        } finally {
            dispatch(setLoading(false));
        }
    }
);
export interface TransactionOptions {
    fee?: bigint;
    memo?: string;

}

async function createAndSendTransaction(
    senderWotsWallet: WOTSWallet,
    changeWotsWallet: WOTSWallet,
    destAddrTag: Uint8Array,
    amount: bigint,
    balance: bigint = BigInt(0),
    options: TransactionOptions = {}
) {
    if (!senderWotsWallet || !destAddrTag || !changeWotsWallet) {
        throw new Error('No current or next WOTS key pair');
    }


    // Default fee if not specified
    const fee = options.fee || BigInt(500);  // Example default fee
    const builder = new TransactionBuilder(NetworkProvider.getNetwork().apiUrl);



    //build a signed tx
    const result = await builder.buildAndSignTransaction(
        senderWotsWallet,
        changeWotsWallet,
        "0x" + Buffer.from(destAddrTag).toString('hex'),
        amount,
        fee,
        options.memo||''
    );

    return { tx: result.submitResult?.transaction_identifier };
}

// ============================================================================
// ACTIVITY PAGINATION ACTIONS
// ============================================================================

/**
 * Fetch recent activity for the selected account with pagination
 */
export const fetchRecentActivityAction = createAsyncThunk(
    'transaction/fetchRecentActivity',
    async (options: ActivityFetchOptions = {}, { getState, dispatch }) => {
        const state = getState() as RootState;
        const selectedAccount = selectSelectedAccount(state);
        
        if (!selectedAccount) {
            throw new Error('No account selected');
        }

        dispatch(setActivityLoading(true));
        dispatch(setActivityError(null));

        try {
            const network = NetworkProvider.getNetwork();
            const result = await network.fetchRecentActivity(selectedAccount, options);

            dispatch(setActivityData({
                transactions: result.transactions,
                totalCount: result.totalCount || 0,
                hasMore: result.hasMore,
                currentOffset: result.nextOffset || 0,
                options
            }));

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch activity';
            dispatch(setActivityError(errorMessage));
            throw error;
        } finally {
            dispatch(setActivityLoading(false));
        }
    }
);

/**
 * Load more activity (append to existing data)
 */
export const loadMoreActivityAction = createAsyncThunk(
    'transaction/loadMoreActivity',
    async (options: ActivityFetchOptions = {}, { getState, dispatch }) => {
        const state = getState() as RootState;
        const selectedAccount = selectSelectedAccount(state);
        const currentOffset = state.transaction.activity.currentOffset;
        const lastOptions = state.transaction.activity.lastFetchOptions || {} as ActivityFetchOptions;
        
        if (!selectedAccount) {
            throw new Error('No account selected');
        }

        if (!state.transaction.activity.hasMore) {
            throw new Error('No more transactions to load');
        }

        dispatch(setActivityLoading(true));

        try {
            const network = NetworkProvider.getNetwork();
            const result = await network.fetchRecentActivity(selectedAccount, {
                // carry forward prior options (e.g., maxBlock, includeConfirmed),
                // and ensure we do not re-append mempool on subsequent pages
                ...lastOptions,
                ...options,
                includeMempool: false,
                offset: currentOffset
            });

            dispatch(appendActivityData({
                transactions: result.transactions,
                totalCount: result.totalCount || 0,
                hasMore: result.hasMore,
                currentOffset: result.nextOffset || currentOffset + (options.limit || 20)
            }));

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load more activity';
            dispatch(setActivityError(errorMessage));
            throw error;
        } finally {
            dispatch(setActivityLoading(false));
        }
    }
);

/**
 * Fetch activity for a specific account
 */
export const fetchAccountActivityAction = createAsyncThunk(
    'transaction/fetchAccountActivity',
    async ({ account, options = {} }: { account: Account; options?: ActivityFetchOptions }, { getState, dispatch }) => {
        const accountId = account.tag;

        dispatch(setActivityLoading(true));
        dispatch(setActivityError(null));

        try {
            const network = NetworkProvider.getNetwork();
            const result = await network.fetchRecentActivity(account, options);

            dispatch(setAccountActivityData({
                accountId,
                transactions: result.transactions,
                totalCount: result.totalCount || 0,
                hasMore: result.hasMore,
                currentOffset: result.nextOffset || 0,
                options
            }));

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch account activity';
            dispatch(setActivityError(errorMessage));
            throw error;
        } finally {
            dispatch(setActivityLoading(false));
        }
    }
);

/**
 * Load more activity for a specific account
 */
export const loadMoreAccountActivityAction = createAsyncThunk(
    'transaction/loadMoreAccountActivity',
    async ({ account, options = {} }: { account: Account; options?: ActivityFetchOptions }, { getState, dispatch }) => {
        const state = getState() as RootState;
        const accountId = account.tag;
        const cachedData = state.transaction.accountActivity[accountId];
        
        if (!cachedData || !cachedData.hasMore) {
            throw new Error('No more transactions to load for this account');
        }

        dispatch(setActivityLoading(true));

        try {
            const network = NetworkProvider.getNetwork();
            const result = await network.fetchRecentActivity(account, {
                ...options,
                offset: cachedData.currentOffset
            });

            dispatch(appendAccountActivityData({
                accountId,
                transactions: result.transactions,
                totalCount: result.totalCount || 0,
                hasMore: result.hasMore,
                currentOffset: result.nextOffset || cachedData.currentOffset + (options.limit || 20)
            }));

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to load more account activity';
            dispatch(setActivityError(errorMessage));
            throw error;
        } finally {
            dispatch(setActivityLoading(false));
        }
    }
);

/**
 * Refresh activity data (clear cache and fetch fresh data)
 */
export const refreshActivityAction = createAsyncThunk(
    'transaction/refreshActivity',
    async (options: ActivityFetchOptions = {}, { getState, dispatch }) => {
        const state = getState() as RootState;
        const selectedAccount = selectSelectedAccount(state);
        
        if (!selectedAccount) {
            throw new Error('No account selected');
        }

        // Clear existing data
        dispatch({ type: 'transaction/clearActivityData' });
        
        // Fetch fresh data
        return dispatch(fetchRecentActivityAction(options)).unwrap();
    }
);

/**
 * Fetch only confirmed transactions
 */
export const fetchConfirmedTransactionsAction = createAsyncThunk(
    'transaction/fetchConfirmedTransactions',
    async (options: ActivityFetchOptions = {}, { getState, dispatch }) => {
        const state = getState() as RootState;
        const selectedAccount = selectSelectedAccount(state);
        
        if (!selectedAccount) {
            throw new Error('No account selected');
        }

        return dispatch(fetchRecentActivityAction({
            ...options,
            includeMempool: false,
            includeConfirmed: true
        })).unwrap();
    }
);

/**
 * Fetch only mempool transactions
 */
export const fetchMempoolTransactionsAction = createAsyncThunk(
    'transaction/fetchMempoolTransactions',
    async (_, { getState, dispatch }) => {
        const state = getState() as RootState;
        const selectedAccount = selectSelectedAccount(state);
        
        if (!selectedAccount) {
            throw new Error('No account selected');
        }

        dispatch(setActivityLoading(true));
        dispatch(setActivityError(null));

        try {
            const network = NetworkProvider.getNetwork();
            const currentAddress = '0x' + selectedAccount.tag;
            const mempoolTransactions = await network.fetchMempoolTransactions(currentAddress);

            dispatch(setActivityData({
                transactions: mempoolTransactions,
                totalCount: mempoolTransactions.length,
                hasMore: false,
                currentOffset: 0,
                options: { includeMempool: true, includeConfirmed: false }
            }));

            return mempoolTransactions;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Failed to fetch mempool transactions';
            dispatch(setActivityError(errorMessage));
            throw error;
        } finally {
            dispatch(setActivityLoading(false));
        }
    }
);
