import { ExtensionStorage } from '../../storage/ExtensionStorage';
import { Storage } from '../../types/storage';
import { StorageFactory } from '../../storage/StorageFactory';

// Default to ExtensionStorage
let storageInstance: Storage = StorageFactory.create();

export const StorageProvider = {
    setStorage: (storage: Storage) => {
        storageInstance = storage;
    },
    getStorage: (): Storage => storageInstance
};

export type { Storage }; 