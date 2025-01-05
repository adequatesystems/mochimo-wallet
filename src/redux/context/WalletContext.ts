import { HDWallet } from '../../core/HDWallet';

let walletInstance: HDWallet | null = null;

export const WalletProvider = {
    setWallet: (wallet: HDWallet) => {
        walletInstance = wallet;
    },
    getWallet: (): HDWallet | null => walletInstance,
    clear: () => {
        walletInstance = null;
    }
}; 