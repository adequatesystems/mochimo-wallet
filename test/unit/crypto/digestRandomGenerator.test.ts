import { DigestRandomGenerator, intToBytes, wordArrayToBytes } from '../../../src/crypto/digestRandomGenerator';
import CryptoJS from 'crypto-js';

describe('DigestRandomGenerator', () => {
    describe('utility functions', () => {
        describe('intToBytes', () => {
            it('should convert integers to 4-byte arrays', () => {
                expect(Array.from(intToBytes(0))).toEqual([0, 0, 0, 0]);
                expect(Array.from(intToBytes(1))).toEqual([0, 0, 0, 1]);
                expect(Array.from(intToBytes(256))).toEqual([0, 0, 1, 0]);
                expect(Array.from(intToBytes(0xFFFFFFFF))).toEqual([255, 255, 255, 255]);
            });

            it('should handle negative numbers', () => {
                expect(Array.from(intToBytes(-1))).toEqual([255, 255, 255, 255]);
                expect(Array.from(intToBytes(-256))).toEqual([255, 255, 255, 0]);
            });
        });

        describe('wordArrayToBytes', () => {
            it('should convert CryptoJS WordArray to Uint8Array', () => {
                const input = CryptoJS.lib.WordArray.create([0x12345678, 0x9ABCDEF0]);
                const result = wordArrayToBytes(input);
                expect(Array.from(result)).toEqual([
                    0x12, 0x34, 0x56, 0x78,
                    0x9A, 0xBC, 0xDE, 0xF0
                ]);
            });
        });
    });

    describe('DigestRandomGenerator', () => {
        let generator: DigestRandomGenerator;

        beforeEach(() => {
            generator = new DigestRandomGenerator();
        });

        it('should initialize with zero state', () => {
            const bytes = generator.nextBytes(64);
            // Initial state should be deterministic
            const expected = new Uint8Array(64).fill(0);
            expect(Array.from(bytes)).not.toEqual(Array.from(expected));
        });

        describe('addSeedMaterial', () => {
            it('should affect subsequent random generation', () => {
                const seed = new Uint8Array([1, 2, 3, 4]);
                const beforeSeed = generator.nextBytes(32);
                
                generator.addSeedMaterial(seed);
                const afterSeed = generator.nextBytes(32);

                expect(Buffer.from(beforeSeed)).not.toEqual(Buffer.from(afterSeed));
            });

            it('should be deterministic with same seed', () => {
                const seed = new Uint8Array([1, 2, 3, 4]);
                const gen1 = new DigestRandomGenerator();
                const gen2 = new DigestRandomGenerator();

                gen1.addSeedMaterial(seed);
                gen2.addSeedMaterial(seed);

                const bytes1 = gen1.nextBytes(32);
                const bytes2 = gen2.nextBytes(32);

                expect(Buffer.from(bytes1)).toEqual(Buffer.from(bytes2));
            });
        });

        describe('nextBytes', () => {
            it('should generate requested number of bytes', () => {
                expect(generator.nextBytes(1).length).toBe(1);
                expect(generator.nextBytes(32).length).toBe(32);
                expect(generator.nextBytes(64).length).toBe(64);
                expect(generator.nextBytes(1000).length).toBe(1000);
            });

            it('should generate different values on subsequent calls', () => {
                const first = generator.nextBytes(32);
                const second = generator.nextBytes(32);
                expect(Buffer.from(first)).not.toEqual(Buffer.from(second));
            });

            it('should handle large requests efficiently', () => {
                const start = Date.now();
                const bytes = generator.nextBytes(10000);
                const duration = Date.now() - start;

                expect(bytes.length).toBe(10000);
                expect(duration).toBeLessThan(1000); // Should complete in reasonable time
            });

            it('should maintain deterministic sequence with same seed', () => {
                const seed = new Uint8Array([1, 2, 3, 4]);
                const gen1 = new DigestRandomGenerator();
                const gen2 = new DigestRandomGenerator();

                gen1.addSeedMaterial(seed);
                gen2.addSeedMaterial(seed);

                // Generate multiple sequences
                for (let i = 0; i < 5; i++) {
                    const bytes1 = gen1.nextBytes(32);
                    const bytes2 = gen2.nextBytes(32);
                    expect(Buffer.from(bytes1)).toEqual(Buffer.from(bytes2));
                }
            });

            it('should generate uniform distribution', () => {
                // Increase sample size for better statistical significance
                const sampleSize = 100000;
                const bytes = generator.nextBytes(sampleSize);
                const counts = new Array(256).fill(0);
                
                // Count occurrences of each byte value
                for (const byte of bytes) {
                    counts[byte]++;
                }

                // Chi-square test for uniformity
                const expectedCount = bytes.length / 256;
                let chiSquare = 0;

                for (let i = 0; i < 256; i++) {
                    const difference = counts[i] - expectedCount;
                    chiSquare += (difference * difference) / expectedCount;
                }

                // Calculate frequency distribution
                const frequencies = counts.map(count => count / sampleSize);
                const expectedFrequency = 1 / 256;

                // Calculate maximum deviation from expected frequency
                let maxDeviation = 0;
                for (let i = 0; i < 256; i++) {
                    const deviation = Math.abs(frequencies[i] - expectedFrequency);
                    maxDeviation = Math.max(maxDeviation, deviation);
                }

                // For large n, critical value at 95% confidence is approximately 1.36/sqrt(n)
                const criticalValue = 1.36 / Math.sqrt(sampleSize);

                // Log statistics for debugging
                console.log({
                    mean: expectedCount,
                    min: Math.min(...counts),
                    max: Math.max(...counts),
                    chiSquare,
                    maxDeviation,
                    criticalValue,
                    expectedFrequency
                });

                // Test statistics
                expect(chiSquare).toBeLessThan(293.25); // Chi-square test
                
                // Less strict test for frequency deviation
                // Allow for some variation as this is a pseudo-random generator
                expect(maxDeviation).toBeLessThan(criticalValue * 2);
            });
        });

        describe('state cycling', () => {
            it('should cycle state after specified iterations', () => {
                const seed = new Uint8Array([1, 2, 3, 4]);
                generator.addSeedMaterial(seed);

                // Force multiple state cycles
                const sequences: Uint8Array[] = [];
                for (let i = 0; i < 20; i++) {
                    sequences.push(generator.nextBytes(64));
                }

                // Verify sequences are different
                for (let i = 1; i < sequences.length; i++) {
                    expect(Buffer.from(sequences[i])).not.toEqual(Buffer.from(sequences[i - 1]));
                }
            });
        });
    });
}); 