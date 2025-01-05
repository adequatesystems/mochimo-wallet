import { MasterSeed } from "@/core/MasterSeed";
import { DigestRandomGenerator, wordArrayToBytes } from "@/crypto/digestRandomGenerator";
import { WOTS } from "mochimo-wots-v2";

function intToBytes(num: number): number[] {
    return [
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        num & 0xff
    ];
}
export class Derivation {
    public static deriveAccountTag(masterSeed: MasterSeed, accountIndex: number): Promise<Uint8Array> {
        return masterSeed.deriveAccountTag(accountIndex);
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