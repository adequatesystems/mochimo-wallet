import { Derivation } from '../../../../src/redux/utils/derivation';
import { DigestRandomGenerator } from '../../../../src/crypto/digestRandomGenerator';
import { vi } from 'vitest';
describe('Derivation', () => {
    // Test seed for consistency
    const TEST_SEED = new Uint8Array([
        1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16,
        17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32
    ]);

    describe('deriveSeed', () => {
        it('should derive deterministic seed and PRNG', () => {
            const accountIndex = 0;
            const result = Derivation.deriveSeed(TEST_SEED, accountIndex);

            expect(result.secret).toBeDefined();
            expect(result.secret.length).toBe(32);
            expect(result.prng).toBeInstanceOf(DigestRandomGenerator);

            // Test determinism - same inputs should give same outputs
            const result2 = Derivation.deriveSeed(TEST_SEED, accountIndex);
            expect(Buffer.from(result.secret)).toEqual(Buffer.from(result2.secret));
        });

        it('should derive different seeds for different indices', () => {
            const result1 = Derivation.deriveSeed(TEST_SEED, 0);
            const result2 = Derivation.deriveSeed(TEST_SEED, 1);

            expect(Buffer.from(result1.secret)).not.toEqual(Buffer.from(result2.secret));
        });
    });

    describe('deriveAccountTag', () => {
        it('should derive consistent account tags', () => {
            const accountIndex = 0;
            const tag1 = Derivation.deriveAccountTag(TEST_SEED, accountIndex);
            const tag2 = Derivation.deriveAccountTag(TEST_SEED, accountIndex);

            expect(tag1.length).toBe(12);
            expect(Buffer.from(tag1)).toEqual(Buffer.from(tag2));
        });

        it('should derive different tags for different accounts', () => {
            const tag1 = Derivation.deriveAccountTag(TEST_SEED, 0);
            const tag2 = Derivation.deriveAccountTag(TEST_SEED, 1);

            expect(Buffer.from(tag1)).not.toEqual(Buffer.from(tag2));
        });
    });

    describe('deriveWotsSeedAndAddress', () => {
        it('should derive WOTS seed and address', () => {
            const accountSeed = TEST_SEED;
            const wotsIndex = 0;
            const tag = '010101010101010101010101';

            const result = Derivation.deriveWotsSeedAndAddress(accountSeed, wotsIndex, tag);

            expect(result.secret).toBeDefined();
            expect(result.secret.length).toBe(32);
            expect(result.address).toBeDefined();
            expect(result.address.length).toBeGreaterThan(0);
        });

        it('should be deterministic', () => {
            const accountSeed = TEST_SEED;
            const wotsIndex = 0;
            const tag = '010101010101010101010101';

            const result1 = Derivation.deriveWotsSeedAndAddress(accountSeed, wotsIndex, tag);
            const result2 = Derivation.deriveWotsSeedAndAddress(accountSeed, wotsIndex, tag);

            expect(Buffer.from(result1.secret)).toEqual(Buffer.from(result2.secret));
            expect(Buffer.from(result1.address)).toEqual(Buffer.from(result2.address));
        });

        it('should derive different addresses for different indices', () => {
            const accountSeed = TEST_SEED;
            const tag = '010101010101010101010101';

            const result1 = Derivation.deriveWotsSeedAndAddress(accountSeed, 0, tag);
            const result2 = Derivation.deriveWotsSeedAndAddress(accountSeed, 1, tag);

            expect(Buffer.from(result1.secret)).not.toEqual(Buffer.from(result2.secret));
            expect(Buffer.from(result1.address)).not.toEqual(Buffer.from(result2.address));
        });

        it('should reject invalid wots index', () => {
            const accountSeed = TEST_SEED;
            const tag = '010101010101010101010101';

            expect(() => {
                Derivation.deriveWotsSeedAndAddress(accountSeed, -1, tag);
            }).toThrow('Invalid wots index');
        });

        it('should handle different tag values', () => {
            const accountSeed = TEST_SEED;
            const wotsIndex = 0;
            const tag1 = '010101010101010101010101';
            const tag2 = '020202020202020202020202';

            const result1 = Derivation.deriveWotsSeedAndAddress(accountSeed, wotsIndex, tag1);
            const result2 = Derivation.deriveWotsSeedAndAddress(accountSeed, wotsIndex, tag2);

            // Same secret for same index
            expect(Buffer.from(result1.secret)).toEqual(Buffer.from(result2.secret));
            // Different addresses for different tags
            expect(Buffer.from(result1.address)).not.toEqual(Buffer.from(result2.address));
        });
    });
}); 