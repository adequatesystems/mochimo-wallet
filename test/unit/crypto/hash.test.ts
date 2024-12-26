import { describe, it, expect } from 'vitest';
import { sha256, hmacSHA256 } from '../../../src/crypto/hash';

describe('Hash Functions', () => {
    describe('sha256', () => {
        it('should produce consistent hashes', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            const hash1 = sha256(data);
            const hash2 = sha256(data);
            
            expect(hash1).toEqual(hash2);
            expect(hash1.length).toBe(32); // SHA-256 produces 32 bytes
        });

        it('should produce different hashes for different inputs', () => {
            const data1 = new Uint8Array([1, 2, 3, 4]);
            const data2 = new Uint8Array([1, 2, 3, 5]);
            
            const hash1 = sha256(data1);
            const hash2 = sha256(data2);
            
            expect(hash1).not.toEqual(hash2);
        });
    });

    describe('hmacSHA256', () => {
        it('should produce consistent HMACs', () => {
            const key = new Uint8Array([1, 2, 3]);
            const data = new Uint8Array([4, 5, 6]);
            
            const hmac1 = hmacSHA256(key, data);
            const hmac2 = hmacSHA256(key, data);
            
            expect(hmac1).toEqual(hmac2);
            expect(hmac1.length).toBe(32);
        });

        it('should produce different HMACs with different keys', () => {
            const key1 = new Uint8Array([1, 2, 3]);
            const key2 = new Uint8Array([1, 2, 4]);
            const data = new Uint8Array([4, 5, 6]);
            
            const hmac1 = hmacSHA256(key1, data);
            const hmac2 = hmacSHA256(key2, data);
            
            expect(hmac1).not.toEqual(hmac2);
        });
    });
}); 