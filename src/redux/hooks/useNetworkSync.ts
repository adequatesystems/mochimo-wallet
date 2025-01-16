import { useEffect, useRef, useState, useCallback } from 'react';
import { useAccounts } from './useAccounts';
import { NetworkProvider } from '../context/NetworkContext';
import { useAppDispatch } from './useStore';
import { updateAccount } from '../slices/accountSlice';
import { setBlockHeight } from '../slices/networkSlice';

interface BalanceCache {
    [blockHeight: number]: {
        [tag: string]: string;
    };
}

export const useNetworkSync = (interval: number = 10000) => {
    const { accounts } = useAccounts();
    const dispatch = useAppDispatch();
    const timeoutRef = useRef<NodeJS.Timeout>();
    const [lastBlockHeight, setLastBlockHeight] = useState<number>(0);
    const [balanceCache, setBalanceCache] = useState<BalanceCache>({});
    const [consecutiveErrors, setConsecutiveErrors] = useState(0);
    const isUpdatingRef = useRef(false);
    const cacheRef = useRef(balanceCache);

    // Keep cacheRef in sync with balanceCache
    useEffect(() => {
        cacheRef.current = balanceCache;
    }, [balanceCache]);

    const updateBalances = async (currentHeight: number) => {
        const currentCache = cacheRef.current[currentHeight] || {};
        
        const updates = await Promise.all(accounts.map(async (account) => {
            if (!account?.tag || currentCache[account.tag]) {
                return null;
            }

            try {
                const balance = await NetworkProvider.getNetwork()
                    .getBalance("0x" + account.tag);

                if (!/^\d+$/.test(balance)) {
                    throw new Error('Invalid balance format received');
                }
                
                return { tag: account.tag, balance };
            } catch (error) {
                console.error(`Balance fetch error for account ${account.tag}:`, error);
                return null;
            }
        }).filter(Boolean));

        if (updates.length > 0) {
            setBalanceCache(prevCache => {
                const newCache = { ...prevCache };
                newCache[currentHeight] = { ...currentCache };
                
                updates.forEach(update => {
                    if (update) {
                        newCache[currentHeight][update.tag] = update.balance;
                        dispatch(updateAccount({
                            id: update.tag,
                            updates: { balance: update.balance }
                        }));
                    }
                });

                return newCache;
            });
        }
    };

    const pollBalances = useCallback(async () => {
        if (!accounts.length || isUpdatingRef.current) {
            timeoutRef.current = setTimeout(pollBalances, interval);
            return;
        }

        try {
            isUpdatingRef.current = true;

            const status = await NetworkProvider.getNetwork().getNetworkStatus();
            if (!status?.height || typeof status.height !== 'number') {
                throw new Error('Invalid network status response');
            }

            const currentHeight = status.height;
            if (currentHeight < 0) {
                throw new Error('Invalid block height received');
            }

            // Update network state with new block height
            dispatch(setBlockHeight(currentHeight));

            const needsUpdate = currentHeight > lastBlockHeight || 
                              accounts.some(account => !cacheRef.current[currentHeight]?.[account.tag]);

            if (needsUpdate) {
                await updateBalances(currentHeight);
                setLastBlockHeight(currentHeight);
            }

            setConsecutiveErrors(0);
        } catch (error) {
            console.error('Balance polling error:', error);
            setConsecutiveErrors(prev => prev + 1);
        } finally {
            isUpdatingRef.current = false;
            timeoutRef.current = setTimeout(pollBalances, interval);
        }
    }, [accounts, interval, lastBlockHeight]);

    useEffect(() => {
        pollBalances();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = undefined;
            }
        };
    }, [pollBalances]);
}; 