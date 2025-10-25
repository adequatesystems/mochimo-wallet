import { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { NetworkProvider } from '../context/NetworkContext';
import { updateAccount } from '../slices/accountSlice';
import { setBlockHeight, setNetworkStatus } from '../slices/networkSlice';
import type { RootState } from '../store';
import { useAccounts } from './useAccounts';
import { useAppDispatch } from './useStore';

interface BalanceCache {
    [blockHeight: number]: {
        [tag: string]: string;
    };
}

export const useNetworkSync = (interval: number = 10000) => {
    const { accounts } = useAccounts();
    const dispatch = useAppDispatch();
    // Track active provider change to force immediate re-poll on switch
    const providerKey = useSelector((state: RootState) => {
        const mesh = state.providers?.byKind?.mesh?.activeId || '';
        const proxy = state.providers?.byKind?.proxy?.activeId || '';
        return `${mesh}|${proxy}`;
    });
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
        if (isUpdatingRef.current) {
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

            // Update network state with new block height and mark connected
            dispatch(setBlockHeight(currentHeight));
            dispatch(setNetworkStatus({ isConnected: true }));

            const needsUpdate = accounts.length > 0 && (currentHeight > lastBlockHeight || 
                              accounts.some(account => !cacheRef.current[currentHeight]?.[account.tag]));

            if (needsUpdate) {
                await updateBalances(currentHeight);
                setLastBlockHeight(currentHeight);
            }

            setConsecutiveErrors(0);
        } catch (error) {
            console.error('Balance polling error:', error);
            setConsecutiveErrors(prev => prev + 1);
            const message = error instanceof Error ? error.message : 'Network unreachable';
            dispatch(setNetworkStatus({ isConnected: false, error: message }));
        } finally {
            isUpdatingRef.current = false;
            timeoutRef.current = setTimeout(pollBalances, interval);
        }
    }, [accounts, interval, lastBlockHeight, providerKey]);

    useEffect(() => {
        // On provider change, restart polling immediately
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = undefined;
        }
        pollBalances();
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
                timeoutRef.current = undefined;
            }
        };
    }, [pollBalances, providerKey]);
}; 