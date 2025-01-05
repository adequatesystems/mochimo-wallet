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
        const masterSeed = SessionManager.getInstance().getMasterSeed();
        if (!selectedAccount) {
            throw new Error('No active account');
        }

        dispatch(setLoading(true));
        dispatch(setError(null));
        const tagResolve = await NetworkProvider.getNetwork().resolveTag(selectedAccount.tag)
        const balance = BigInt(tagResolve.balanceConsensus)

        const destTagResolve = await NetworkProvider.getNetwork().resolveTag(params.to)
        const destAddress = (destTagResolve.addressConsensus)

        try {
            const { to, amount, tag } = params;
            const tx = await createTransaction(state, masterSeed, selectedAccount, Buffer.from(destAddress, 'hex'), amount, balance);
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
            dispatch(setError(error as Error));
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
    state: RootState,
    masterSeed: MasterSeed,
    account: Account,
    destination: Uint8Array,
    amount: bigint,
    balance: bigint = BigInt(0),
    options: TransactionOptions = {}
): { tx: Uint8Array, datagram: Uint8Array, nextWotsIndex: number } {
    if (!masterSeed) {
        throw new Error('Wallet is locked');
    }
    const currPair = selectCurrentWOTSKeyPair(state);
    const nextPair = selectNextWOTSKeyPair(state);
    // Create WOTS wallet for signing
    if (!currPair || !nextPair) {
        throw new Error('No current or next WOTS key pair');
    }
    const sourceAddress = currPair.address;
    const tag = account.tag;

    const seed = account.seed ? Buffer.from(account.seed, 'hex') : masterSeed.deriveAccountSeed(account.index!)
    const sourceSecret = Derivation.deriveWotsSeedAndAddress(seed, account.wotsIndex, tag)

    // Default fee if not specified
    const fee = options.fee || BigInt(500);  // Example default fee

    // Create change address from next WOTS index
    const changeWallet = Derivation.deriveWotsSeedAndAddress(seed, account.wotsIndex + 1, tag)
    const changeAddress = changeWallet.address;
    const changeAmount = balance - amount - fee;
    // Sign the transaction
    const { tx, datagram } = Transaction.sign(
        balance,  // Source balance (amount + fee)
        amount,        // Payment amount
        fee,          // Network fee
        changeAmount, // Change amount
        Buffer.from(sourceAddress, 'hex'),
        sourceSecret.secret,
        destination,
        changeAddress!
    );

    return { tx, datagram: datagram, nextWotsIndex: account.wotsIndex + 1 };
}