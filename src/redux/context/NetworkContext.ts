import { ExtensionStorage } from '../../storage/ExtensionStorage';
import { Storage } from '../../types/storage';
import { StorageFactory } from '../../storage/StorageFactory';
import { NetworkService } from '@/types/network';
import { ProxyNetworkService } from '../../network/proxyNetworkService';

// Default to ExtensionStorage
let networkInstance: NetworkService = new ProxyNetworkService('https://api.mochimo.org');

export const NetworkProvider = {
    setNetwork: (network: NetworkService) => {
        networkInstance = network;
    },
    getNetwork: (): NetworkService => networkInstance
};

export type { NetworkService }; 