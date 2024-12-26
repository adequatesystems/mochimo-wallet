import { lib, SHA256, HmacSHA256 } from 'crypto-js';

/**
 * Converts Uint8Array to WordArray for crypto-js
 */
function uint8ArrayToWordArray(arr: Uint8Array): lib.WordArray {
    const words: number[] = [];
    for (let i = 0; i < arr.length; i += 4) {
        words.push(
            (arr[i] << 24) |
            ((arr[i + 1] || 0) << 16) |
            ((arr[i + 2] || 0) << 8) |
            (arr[i + 3] || 0)
        );
    }
    return lib.WordArray.create(words, arr.length);
}

/**
 * Converts WordArray to Uint8Array
 */
function wordArrayToUint8Array(wordArray: lib.WordArray): Uint8Array {
    const words = wordArray.words;
    const sigBytes = wordArray.sigBytes;
    const result = new Uint8Array(sigBytes);
    
    for (let i = 0; i < sigBytes; i++) {
        const byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        result[i] = byte;
    }
    
    return result;
}

/**
 * SHA256 hash function
 * @param data Input data as Uint8Array
 * @returns Hash as Uint8Array
 */
export function sha256(data: Uint8Array): Uint8Array {
    const wordArray = uint8ArrayToWordArray(data);
    const hash = SHA256(wordArray);
    return wordArrayToUint8Array(hash);
}

/**
 * HMAC-SHA256
 * @param key Key as Uint8Array
 * @param data Data to hash as Uint8Array
 * @returns HMAC as Uint8Array
 */
export function hmacSHA256(key: Uint8Array, data: Uint8Array): Uint8Array {
    const keyWordArray = uint8ArrayToWordArray(key);
    const dataWordArray = uint8ArrayToWordArray(data);
    const hash = HmacSHA256(dataWordArray, keyWordArray);
    return wordArrayToUint8Array(hash);
} 