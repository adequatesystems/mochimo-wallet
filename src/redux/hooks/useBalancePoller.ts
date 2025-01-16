import { useEffect, useRef, useState } from 'react';
import { useAccounts } from './useAccounts';
import { NetworkProvider } from '../context/NetworkContext';
import { useAppDispatch } from './useStore';
import { updateAccount } from '../slices/accountSlice';

export const useBalancePoller = (interval: number = 10000) => {
    const { accounts } = useAccounts();
    const dispatch = useAppDispatch();
    const timeoutRef = useRef<NodeJS.Timeout>();
    const [lastBlockHeight, setLastBlockHeight] = useState<number>(0);

    const pollBalances = async () => {
        try {
            // Check network status first
            const status = await NetworkProvider.getNetwork().getNetworkStatus();
            
            // Only update balances if block height has changed
            if (status.height > lastBlockHeight) {
                setLastBlockHeight(status.height);
                
                // Update balances for all accounts
                await Promise.all(accounts.map(async (account) => {
                    const balance = await NetworkProvider.getNetwork().getBalance(account.tag);
                    if (balance !== account.balance) {
                        dispatch(updateAccount({
                            id: account.tag,
                            updates: {
                                balance: balance
                            }
                        }));
                    }
                }));
            }
        } catch (error) {
            console.error('Balance polling error:', error);
        } finally {
            timeoutRef.current = setTimeout(pollBalances, interval);
        }
    };

    useEffect(() => {
        pollBalances();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [accounts.length]);
}; 