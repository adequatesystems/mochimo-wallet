import { DigestRandomGenerator, intToBytes, wordArrayToBytes } from '../../crypto/digestRandomGenerator';
import { WOTS, WotsAddress } from "mochimo-wots-v2";
import CryptoJS from 'crypto-js';

export class Derivation {
    public static deriveAccountTag(masterSeed: Uint8Array, accountIndex: number): Uint8Array {

        const { secret, prng } = this.deriveSeed(masterSeed, accountIndex);
        const accountSeed = secret;
        //generate first address/public key
        const addr = WOTS.generateRandomAddress_(new Uint8Array(12).fill(1), accountSeed, (bytes) => {
            if (prng) {
                const len = bytes.length;
                const randomBytes = prng.nextBytes(len);
                bytes.set(randomBytes);
            }
        });
        const waddr = (WotsAddress.addrFromWots(addr)!);
        if (!waddr) {
            throw new Error('Failed to generate WOTS address for tag');
        }
        return waddr;
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

