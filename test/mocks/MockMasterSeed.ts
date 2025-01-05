import { vi } from 'vitest';

export class MockMasterSeed {
    deriveAccount(index: number) {
        // Return a properly formatted tag that will work with WOTS
        const tag = Buffer.alloc(8);
        tag.writeUInt32LE(index);
        
        return {
            address: Buffer.from('0000000000000000000000000000000000000000', 'hex'),
            tag: tag,  // Return Buffer instead of string
            seed: Buffer.from('0000000000000000000000000000000000000000', 'hex')
        };
    }

    static async create() {
        return new MockMasterSeed();
    }

    static async fromPhrase(phrase: string) {
        return new MockMasterSeed();
    }

    async export(password: string) {
        return { 
            data: Buffer.from('encrypted-data'),
            salt: Buffer.from('salt'),
            iv: Buffer.from('iv')
        };
    }

    async toPhrase() {
        return 'test test test test';
    }
}

// Mock the MasterSeed import
vi.mock('../../src/core/MasterSeed', () => ({
    MasterSeed: MockMasterSeed
})); 