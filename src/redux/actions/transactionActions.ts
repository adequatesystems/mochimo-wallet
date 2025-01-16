import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { setLoading, setError, addPendingTransaction } from '../slices/transactionSlice';
import { selectCurrentWOTSKeyPair, selectNextWOTSKeyPair, selectSelectedAccount } from '../selectors/accountSelectors';
import { Account } from '@/types/account';
import { MasterSeed } from '@/core/MasterSeed';

import { Derivation } from '../utils/derivation';
import { SessionManager } from '../context/SessionContext';
import { NetworkProvider } from '../context/NetworkContext';
import { TransactionBuilder } from 'mochimo-mesh-api-client';
import { WOTSWallet } from 'mochimo-wots';

interface SendTransactionParams {
    to: string;
    amount: bigint;
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


            const { amount } = params;

            const tx = await createAndSendTransaction(
                senderKeyPair.wotsWallet!, 
                changeKeyPair.wotsWallet!, 
                Buffer.from(params.to, 'hex'), 
                amount, 
                balance
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
