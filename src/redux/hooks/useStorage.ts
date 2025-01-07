import { useEffect, useState } from 'react';
import { StorageProvider } from '../context/StorageContext';

export const useStorage = () => {
    const [hasWallet, setHasWallet] = useState<boolean>(false);
    useEffect(() => {
        const checkWallet = async () => {
            const masterSeed = await StorageProvider.getStorage().loadMasterSeed();
            setHasWallet(Boolean(masterSeed));
        };
        checkWallet();
    }, []);

    return {
        hasWallet
    };
};