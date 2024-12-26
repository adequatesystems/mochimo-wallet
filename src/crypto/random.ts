/**
 * Generates cryptographically secure random bytes
 * @param length Number of bytes to generate
 * @returns Uint8Array of random bytes
 */
export function getRandomBytes(length: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(length));
}

/**
 * Generates a random seed of specified length
 * @param length Length of the seed in bytes (default: 32)
 * @returns Uint8Array containing the random seed
 */
export function generateSeed(length: number = 32): Uint8Array {
    return getRandomBytes(length);
}

/**
 * Securely wipes a Uint8Array by overwriting with zeros
 * @param data Uint8Array to wipe
 */
export function wipeBytes(data: Uint8Array): void {
    data.fill(0);
}

/**
 * Generates a random value within a range
 * @param min Minimum value (inclusive)
 * @param max Maximum value (exclusive)
 * @returns Random number within the specified range
 */
export function getRandomRange(min: number, max: number): number {
    const range = max - min;
    const bitsNeeded = Math.ceil(Math.log2(range));
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    const maxValid = Math.pow(2, bitsNeeded) - 1;

    let value: number;
    do {
        value = 0;
        const randomBytes = getRandomBytes(bytesNeeded);
        for (let i = 0; i < bytesNeeded; i++) {
            value = (value << 8) | randomBytes[i];
        }
        value = value & maxValid;
    } while (value >= range);

    return min + value;
} 