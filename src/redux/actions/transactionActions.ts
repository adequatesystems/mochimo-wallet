import { createAsyncThunk } from '@reduxjs/toolkit';
import { RootState } from '../store';
import { setLoading, setError, addPendingTransaction } from '../slices/transactionSlice';
import { selectCurrentWOTSKeyPair, selectNextWOTSKeyPair, selectSelectedAccount } from '../selectors/accountSelectors';
import { Account } from '@/types/account';
import { MasterSeed } from '@/core/MasterSeed';
import { Transaction } from 'mochimo-wots-v2';
import { Derivation } from '../utils/derivation';
import { SessionManager } from '../context/SessionContext';
import { NetworkProvider } from '../context/NetworkContext';

interface SendTransactionParams {
    to: string;
    amount: bigint;
    tag?: string;
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
        const tagResolve = await NetworkProvider.getNetwork().resolveTag(selectedAccount.tag)
        const balance = BigInt(tagResolve.balanceConsensus)

        const destTagResolve = await NetworkProvider.getNetwork().resolveTag(params.to)
        const destAddress = (destTagResolve.addressConsensus)

        try {
            const { amount } = params;
            const tx = createTransaction(senderKeyPair, changeKeyPair, Buffer.from(destAddress, 'hex'), amount, balance);
            // Send transaction
            const txHash = await NetworkProvider.getNetwork().pushTransaction(Buffer.from(tx.datagram).toString('base64'));
            if (txHash.status === 'success' && txHash.data?.txid) {
                // Add to pending transactions
                dispatch(addPendingTransaction(txHash.data?.txid!));
            } else {
                throw new Error("Failed to send transaction: " + txHash.error);
            }
            return txHash;

        } catch (error) {
            dispatch(setError(error instanceof Error ? error.message : 'Unknown error'));
            throw error;
        } finally {
            dispatch(setLoading(false));
        }
    }
);
export interface TransactionOptions {
    fee?: bigint;
    name?: string;  // Optional name for the WOTS wallet
}

 function createTransaction(
    senderKeyPair: { secret: string, address: string },
    changeKeyPair: { secret: string, address: string },
    destination: Uint8Array,
    amount: bigint,
    balance: bigint = BigInt(0),
    options: TransactionOptions = {}
): { tx: Uint8Array, datagram: Uint8Array } {
    if (!senderKeyPair || !destination || !changeKeyPair) {
        throw new Error('No current or next WOTS key pair');
    }
    const sourceAddress = Buffer.from(senderKeyPair.address, 'hex');
    const sourceSecret = Buffer.from(senderKeyPair.secret, 'hex');

    // Default fee if not specified
    const fee = options.fee || BigInt(500);  // Example default fee

    // Create change address from next WOTS index
    const changeAddress = changeKeyPair.address;
    const changeAmount = balance - amount - fee;
    // Sign the transaction
    const { tx, datagram } = Transaction.sign(
        balance,  // Source balance (amount + fee)
        amount,        // Payment amount
        fee,          // Network fee
        changeAmount, // Change amount
        sourceAddress,
        sourceSecret,
        destination,
        Buffer.from(changeAddress, 'hex')
    );

    return { tx, datagram: datagram };
}
