import { Storage } from '../types/storage';
import { LocalStorage } from './LocalStorage';
import { ExtensionStorage } from './ExtensionStorage';

export class StorageFactory {
    /**
     * Creates appropriate storage implementation based on environment
     */
    static create(prefix = 'mochimo_wallet_'): Storage {
        // Check if we're in a browser extension
        if (typeof browser !== 'undefined' || typeof chrome !== 'undefined') {
            try {
                return new ExtensionStorage(prefix);
            } catch (error) {
                console.warn('Extension storage not available, falling back to local storage');
            }
        }
        
        // Fall back to localStorage
        return new LocalStorage(prefix);
    }
} 