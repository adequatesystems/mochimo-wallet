import { MasterSeed } from "@/core/MasterSeed";
import { DigestRandomGenerator, wordArrayToBytes } from '../../crypto/digestRandomGenerator';
import { WOTS } from "mochimo-wots-v2";
import CryptoJS from 'crypto-js';
function intToBytes(num: number): number[] {
    return [
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        num & 0xff
    ];
}
export class Derivation {
    public static deriveAccountTag(masterSeed: Uint8Array, accountIndex: number): Uint8Array {
        // First generate the WOTS public key
        const { secret } = this.deriveSeed(masterSeed, accountIndex);
        const tagBytes = new Uint8Array(12).fill(1); // Pre-allocate tag buffer
        //create first wots address
        const { address } = this.deriveWotsSeedAndAddress(secret, 0, Buffer.from(tagBytes).toString('hex'));
        // Generate WOTS public key
        const wotsPK = address
        // Hash the public key with SHA3-512
        const sha3Hash = CryptoJS.SHA3(
            CryptoJS.lib.WordArray.create(address),
            { outputLength: 512 }
        );

        // Hash the SHA3 result with RIPEMD160
        const ripemd = CryptoJS.RIPEMD160(sha3Hash);

        // Convert to bytes and take first 12
        const hashBytes = wordArrayToBytes(ripemd);
        const tag = hashBytes.slice(0, 12);

        return tag;
    }

    static deriveSeed(
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

    public static deriveWotsSeedAndAddress(accountSeed: Uint8Array, wotsIndex: number, tag: string): { secret: Uint8Array, address: Uint8Array } {
        if (wotsIndex < 0) {
            throw new Error('Invalid wots index');
        }
        const secret = this.deriveSeed(accountSeed, wotsIndex);
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
}

export function generateNextWOTSKey(seed: string, tag: string, wotsIndex: number) {
    const seedBytes = Buffer.from(seed, 'hex');
    const tagBytes = Buffer.from(tag, 'hex');

    // Pre-allocate random bytes
    const prng = new DigestRandomGenerator();
    prng.addSeedMaterial(seedBytes);

    // Pre-allocate buffer for random bytes
    const randomBuffer = prng.nextBytes(32 * 256);
    let offset = 0;

    const address = WOTS.generateRandomAddress_(tagBytes, seedBytes, (bytes) => {
        bytes.set(randomBuffer.subarray(offset, offset + bytes.length));
        offset += bytes.length;
    });

    return { address: Buffer.from(address).toString('hex') };
}   