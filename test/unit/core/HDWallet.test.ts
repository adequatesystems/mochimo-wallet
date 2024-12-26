import { describe, it, expect } from 'vitest';
import { HDWalletImpl } from '../../../src/core/HDWallet';

describe('HDWallet', () => {
    it('should be defined', () => {
        const wallet = new HDWalletImpl();
        expect(wallet).toBeDefined();
    });
}); 