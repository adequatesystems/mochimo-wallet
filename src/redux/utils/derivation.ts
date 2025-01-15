import { DigestRandomGenerator, intToBytes, wordArrayToBytes } from '../../crypto/digestRandomGenerator';
import { WOTS, WotsAddress, WOTSWallet } from "mochimo-wots";
import CryptoJS from 'crypto-js';

export class Derivation {
    public static deriveAccountTag(masterSeed: Uint8Array, accountIndex: number): Uint8Array {
        const { secret, prng } = this.deriveSeed(masterSeed, accountIndex);
        const ww = WOTSWallet.create('', secret, undefined, (bytes)=>{
            if (prng) {
                const len = bytes.length;
                const randomBytes = prng.nextBytes(len);
                bytes.set(randomBytes);
            }
        })
        return ww.getAddrTag()!
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

    public static deriveWotsSeedAndAddress(accountSeed: Uint8Array, wotsIndex: number, tag: string): { secret: Uint8Array, address: Uint8Array, wotsWallet: WOTSWallet } {
        if (wotsIndex < 0) {
            throw new Error('Invalid wots index');
        }
        const tagBytes = Buffer.from(tag, 'hex')
        if(tagBytes.length!==20) throw new Error('Invalid tag');
        const secret = this.deriveSeed(accountSeed, wotsIndex);
        const ww = WOTSWallet.create('', secret.secret, tagBytes, (bytes)=>{
            if (secret.prng) {
                const len = bytes.length;
                const randomBytes = secret.prng.nextBytes(len);
                bytes.set(randomBytes);
            }
        } )

        return { secret: ww.getSecret()!, address: ww.getAddress()!, wotsWallet: ww };
    }

}

