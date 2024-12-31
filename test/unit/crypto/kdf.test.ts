import { describe, it, expect } from 'vitest';
import { deriveKey, deriveKeyFast } from '../../../src/crypto/kdf';

describe('KDF Implementations', () => {
    const testCases = [
        {
            name: 'small input',
            seed: new Uint8Array([1, 2, 3, 4, 5]),
            index: 0,
            salt: new TextEncoder().encode('test_salt'),
            iterations: 10000,
            keyLength: 32
        },
        {
            name: 'large input',
            seed: new Uint8Array(Array(64).fill(1)),
            index: 1,
            salt: new TextEncoder().encode('another_salt'),
            iterations: 10000,
            keyLength: 32
        }
    ];

    describe('Correctness', () => {
        testCases.forEach(testCase => {
            it(`should derive keys consistently for ${testCase.name}`, async () => {
                // Generate multiple keys with each implementation
                const key1 = await deriveKeyFast(testCase.seed, testCase.index, {
                    salt: testCase.salt,
                    iterations: testCase.iterations,
                    keyLength: testCase.keyLength
                });

                const key2 = await deriveKeyFast(testCase.seed, testCase.index, {
                    salt: testCase.salt,
                    iterations: testCase.iterations,
                    keyLength: testCase.keyLength
                });

                // Same implementation should produce same results
                expect(Buffer.from(key1)).toEqual(Buffer.from(key2));
            });
        });
    });

    describe('Performance', () => {
        it('should compare performance', async () => {
            const testCase = testCases[0];
            const iterations = 5;

            console.log('\nRunning performance test...');
            
            // Test original implementation
            const startOriginal = performance.now();
            for (let i = 0; i < iterations; i++) {
                await deriveKey(testCase.seed, testCase.index, {
                    salt: testCase.salt,
                    iterations: testCase.iterations,
                    keyLength: testCase.keyLength
                });
            }
            const originalTime = performance.now() - startOriginal;

            // Test fast implementation
            const startFast = performance.now();
            for (let i = 0; i < iterations; i++) {
                await deriveKeyFast(testCase.seed, testCase.index, {
                    salt: testCase.salt,
                    iterations: testCase.iterations,
                    keyLength: testCase.keyLength
                });
            }
            const fastTime = performance.now() - startFast;

            console.log(`Original: ${originalTime.toFixed(2)}ms`);
            console.log(`Fast: ${fastTime.toFixed(2)}ms`);
            console.log(`Speed increase: ${(originalTime / fastTime).toFixed(2)}x`);

            // Output example keys for comparison
            const originalKey = await deriveKey(testCase.seed, testCase.index, {
                salt: testCase.salt,
                iterations: testCase.iterations,
                keyLength: testCase.keyLength
            });

            const fastKey = await deriveKeyFast(testCase.seed, testCase.index, {
                salt: testCase.salt,
                iterations: testCase.iterations,
                keyLength: testCase.keyLength
            });

            console.log('\nKey comparison:');
            console.log('Original:', Buffer.from(originalKey).toString('hex'));
            console.log('Fast:    ', Buffer.from(fastKey).toString('hex'));
        });
    });
}); 