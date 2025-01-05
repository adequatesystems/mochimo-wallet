import CryptoJS from 'crypto-js';
import { inflate } from 'pako';
import { WOTS, WOTSWallet } from 'mochimo-wots-v2';
import { DigestRandomGenerator, intToBytes, wordArrayToBytes } from './digestRandomGenerator';

export interface PublicHeader {
    'pbkdf2 salt': string;
    'pbkdf2 iteration': string;
    version: string;
}

export interface PrivateHeader {
    name: string;
}

export interface WOTSEntry {
    address: string;
    secret: string;
    name: string;
}

export class MCMDecoder {
    private static parseJavaByteArray(str: string): Uint8Array {
        const bytes = str.slice(1, -1).split(',').map(b => {
            let byte = parseInt(b.trim());
            if (byte < 0) byte += 256;
            return byte;
        });
        return new Uint8Array(bytes);
    }

    public static arrayBufferToWordArray(buffer: Uint8Array): CryptoJS.lib.WordArray {
        const words: number[] = [];
        let i = 0;
        const len = buffer.length;

        while (i < len) {
            words.push(
                (buffer[i++] << 24) |
                (buffer[i++] << 16) |
                (buffer[i++] << 8) |
                (buffer[i++])
            );
        }

        return CryptoJS.lib.WordArray.create(words, buffer.length);
    }

    public static wordArrayToUint8Array(wordArray: CryptoJS.lib.WordArray): Uint8Array {
        const words = wordArray.words;
        const sigBytes = wordArray.sigBytes;
        const u8 = new Uint8Array(sigBytes);
        let offset = 0;

        for (let i = 0; i < sigBytes; i += 4) {
            const word = words[i / 4];
            for (let j = 0; j < Math.min(4, sigBytes - i); j++) {
                u8[offset++] = (word >>> (24 - (j * 8))) & 0xff;
            }
        }

        return u8;
    }

    private static decryptData(
        encrypted: Uint8Array,
        iv: Uint8Array,
        key: CryptoJS.lib.WordArray
    ): Uint8Array {
        try {
            // Convert encrypted data to WordArray
            const encryptedWords = this.arrayBufferToWordArray(encrypted);
            const ivWords = this.arrayBufferToWordArray(iv);

            // Decrypt using raw binary data
            const decrypted = CryptoJS.AES.decrypt(
                CryptoJS.lib.CipherParams.create({
                    ciphertext: encryptedWords
                }),
                key,
                {
                    iv: ivWords,
                    mode: CryptoJS.mode.CBC,
                    padding: CryptoJS.pad.Pkcs7
                }
            );

            // Convert back to Uint8Array
            return this.wordArrayToUint8Array(decrypted);
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt data - invalid password');
        }
    }

    public static generateDeterministicSecret(deterministicSeed: Uint8Array, id: number, tag: string): { secret: Uint8Array, address: Uint8Array } {
        const secret = deriveSecret(deterministicSeed, id);
        const tagBytes = Buffer.from(tag, 'hex');
        console.log('Tag:', tag, 'TagBytes:', tagBytes.length);
        const address = WOTS.generateRandomAddress_(tagBytes, secret.secret, (bytes) => {
            if (secret.prng) {
                const len = bytes.length;
                const randomBytes = secret.prng.nextBytes(len);
                bytes.set(randomBytes);
            }
        });
        return { secret: secret.secret, address: address };
    }

    static async decode(mcmFile: ArrayBuffer, password: string): Promise<{
        publicHeader: PublicHeader;
        privateHeader: PrivateHeader;
        entries: WOTSEntry[];
    }> {
        try {
            let fp = 0;
            const data = new Uint8Array(mcmFile);

            // Read integrity hash
            const integrityHash = Buffer.from(data.slice(0, 32)).toString('hex');
            fp += 32;
            console.log('Integrity Hash:', integrityHash);

            // Read public header length
            const publicHeaderLength = new DataView(data.buffer).getUint32(fp);
            fp += 4;

            // Read and parse public header
            const publicHeaderData = data.slice(fp, fp + publicHeaderLength);
            const publicHeader = JSON.parse(
                new TextDecoder().decode(publicHeaderData)
            ) as PublicHeader;
            fp += publicHeaderLength;

            console.log('Public Header:', publicHeader);

            // Derive key from password
            const salt = this.parseJavaByteArray(publicHeader['pbkdf2 salt']);
            const key = CryptoJS.PBKDF2(password,
                this.arrayBufferToWordArray(salt),
                {
                    keySize: 128 / 32,
                    iterations: parseInt(publicHeader['pbkdf2 iteration']),
                    hasher: CryptoJS.algo.SHA1
                }
            );

            console.log('Key derived, salt length:', salt.length);
            console.log('Key:', key.toString());

            // Read private header
            const headerIv = data.slice(fp, fp + 16);
            fp += 16;
            const headerLength = new DataView(data.buffer).getUint32(fp);
            fp += 4;
            const encryptedHeader = data.slice(fp, fp + headerLength);
            fp += headerLength;

            console.log('Header IV length:', headerIv.length);
            console.log('Encrypted header length:', encryptedHeader.length);

            // Decrypt and parse private header
            const decryptedHeaderBytes = this.decryptData(encryptedHeader, headerIv, key);
            console.log('Decrypted header bytes:', decryptedHeaderBytes.slice(0, 16));

            // Find the end of JSON by looking for }
            let jsonEnd = 0;
            while (jsonEnd < decryptedHeaderBytes.length && decryptedHeaderBytes[jsonEnd] !== 0x7d) { // 0x7d is '}'
                jsonEnd++;
            }
            jsonEnd++;

            const privateHeader = JSON.parse(
                new TextDecoder().decode(decryptedHeaderBytes.slice(0, jsonEnd))
            ) as PrivateHeader;
            console.log('Private Header:', privateHeader);
            // Read entries
            const entries: WOTSEntry[] = [];
            while (fp < data.length) {
                const iv = data.slice(fp, fp + 16);
                fp += 16;
                const entryLength = new DataView(data.buffer).getUint32(fp);
                fp += 4;
                const encryptedEntry = data.slice(fp, fp + entryLength);
                fp += entryLength;

                // Decrypt entry
                const decryptedEntryBytes = this.decryptData(encryptedEntry, iv, key);

                // Decompress and parse
                const decompressed = inflate(decryptedEntryBytes);

                // Find JSON end
                let entryJsonEnd = 0;
                while (entryJsonEnd < decompressed.length && decompressed[entryJsonEnd] !== 0x7d) {
                    entryJsonEnd++;
                }
                entryJsonEnd++;

                const entry = JSON.parse(
                    new TextDecoder().decode(decompressed.slice(0, entryJsonEnd))
                ) as WOTSEntry;

                // Convert Java byte arrays to hex strings
                entry.address = Buffer.from(
                    this.parseJavaByteArray(entry.address)
                ).toString('hex');
                entry.secret = Buffer.from(
                    this.parseJavaByteArray(entry.secret)
                ).toString('hex');
                entries.push(entry);
            }

            return { publicHeader, privateHeader, entries };
        } catch (error) {
            console.error('MCM decoding error:', error);
            if (error instanceof Error) {
                throw new Error(`Failed to decode MCM file: ${error.message}`);
            }
            throw new Error('Failed to decode MCM file');
        }
    }
}





export function deriveSecret(
    deterministicSeed: Uint8Array,
    id: number,
): { secret: Uint8Array, prng: DigestRandomGenerator } {
    const idBytes = intToBytes(id);
    const input = [...deterministicSeed, ...idBytes];
    const wordArray = CryptoJS.lib.WordArray.create(new Uint8Array(input));
    const localSeedArray = CryptoJS.SHA512(wordArray);
    const localSeed = wordArrayToBytes(localSeedArray);
    const prng = new DigestRandomGenerator();
    prng.addSeedMaterial(localSeed);
    const secret = new Uint8Array(prng.nextBytes(32));


    return { secret, prng };
}


