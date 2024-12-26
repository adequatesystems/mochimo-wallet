import type { StorageAPI } from './storage';

declare global {
    const browser: {
        storage: StorageAPI;
    };
    
    const chrome: {
        storage: StorageAPI;
    };
}

export {}; 