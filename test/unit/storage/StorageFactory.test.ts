import { describe, expect, it } from 'vitest';
import { ExtensionStorage } from '../../../src/storage/ExtensionStorage';
import { LocalStorage } from '../../../src/storage/LocalStorage';
import { StorageFactory } from '../../../src/storage/StorageFactory';

describe('StorageFactory', () => {
    it('should create ExtensionStorage in extension environment', () => {
        // Mock extension environment
        (global as any).chrome = { storage: {} };
        
        const storage = StorageFactory.create();
        expect(storage).toBeInstanceOf(ExtensionStorage);
    });

    it('should fall back to LocalStorage when extension storage fails', () => {
        // Mock failed extension storage
        (global as any).chrome = {};
        
        const storage = StorageFactory.create();
        expect(storage).toBeInstanceOf(LocalStorage);
    });

    it('should create LocalStorage in browser environment', () => {
        // Mock browser environment (no chrome/browser globals)
        (global as any).chrome = undefined;
        (global as any).browser = undefined;
        
        const storage = StorageFactory.create();
        expect(storage).toBeInstanceOf(LocalStorage);
    });

    it('should pass prefix to storage implementations', () => {
        const prefix = 'test_prefix_';
        const storage = StorageFactory.create(prefix);
        
        // Implementation detail: check if prefix was passed
        // This assumes storage implementations expose prefix for testing
        expect((storage as any).prefix).toBe(prefix);
    });
}); 