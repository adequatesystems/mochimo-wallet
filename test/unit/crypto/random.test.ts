import { describe, it, expect } from 'vitest';
import { getRandomBytes, generateSeed, wipeBytes, getRandomRange } from '../../../src/crypto/random';

describe('Random Functions', () => {
    describe('getRandomBytes', () => {
        it('should generate specified number of bytes', () => {
            const bytes = getRandomBytes(32);
            expect(bytes.length).toBe(32);
        });

        it('should generate different values each time', () => {
            const bytes1 = getRandomBytes(32);
            const bytes2 = getRandomBytes(32);
            expect(bytes1).not.toEqual(bytes2);
        });
    });

    describe('generateSeed', () => {
        it('should generate 32 bytes by default', () => {
            const seed = generateSeed();
            expect(seed.length).toBe(32);
        });

        it('should generate specified length', () => {
            const seed = generateSeed(64);
            expect(seed.length).toBe(64);
        });
    });

    describe('wipeBytes', () => {
        it('should clear all bytes to zero', () => {
            const data = new Uint8Array([1, 2, 3, 4]);
            wipeBytes(data);
            expect(Array.from(data)).toEqual([0, 0, 0, 0]);
        });
    });

    describe('getRandomRange', () => {
        it('should generate numbers within range', () => {
            for (let i = 0; i < 100; i++) {
                const num = getRandomRange(5, 10);
                expect(num).toBeGreaterThanOrEqual(5);
                expect(num).toBeLessThan(10);
            }
        });

        it('should handle small ranges', () => {
            const num = getRandomRange(1, 2);
            expect(num).toBe(1);
        });
    });
}); 