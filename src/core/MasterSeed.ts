import { generateSeed, wipeBytes } from '../crypto/random';
import { deriveAccountSeed, deriveAccountTag, createWOTSWallet } from '../crypto/kdf';
import { WOTSWallet } from 'mochimo-wots-v2';
import { encrypt, decrypt, EncryptedData } from '../crypto/encryption';

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { DigestRandomGenerator, wordArrayToBytes } from '@/crypto/digestRandomGenerator';

export interface EncryptedSeed {
    data: string;      // Base64 encrypted seed
    iv: string;        // Initialization vector
    salt: string;      // Salt for key derivation
}

export class MasterSeed {
    private seed?: Uint8Array;
    private entropy?: Uint8Array;  // Store original entropy for phrase generation
    private _isLocked: boolean = true;
    private encryptedSeed?: EncryptedData;  // Store encrypted seed for password verification

    private constructor(seed: Uint8Array, entropy?: Uint8Array) {
        this.seed = seed;
        this.entropy = entropy;
        this._isLocked = false;
    }

    /**
     * Creates a new master seed with random entropy
     */
    static async create(): Promise<MasterSeed> {
        const seed = generateSeed();
        return new MasterSeed(seed);
    }

    /**
     * Creates a master seed from a BIP39 mnemonic phrase
     */
    static async fromPhrase(phrase: string): Promise<MasterSeed> {
        try {
            // First validate the phrase
            const isValid = bip39.validateMnemonic(phrase, wordlist);
            if (!isValid) {
                throw new Error('Invalid seed phrase');
            }

            // Convert phrase to entropy first
            const entropy = bip39.mnemonicToEntropy(phrase, wordlist);

            // Then convert to seed
            const seed = await bip39.mnemonicToSeed(phrase);
            const masterSeed = new Uint8Array(seed.slice(0, 32));

            // Store both seed and original entropy
            return new MasterSeed(masterSeed, entropy);
        } catch (error) {
            if (error instanceof Error && error.message === 'Invalid seed phrase') {
                throw error;
            }
            console.error('Seed phrase error:', error);
            throw new Error('Failed to create master seed from phrase');
        }
    }

    /**
     * Exports the seed phrase for this master seed
     */
    async toPhrase(): Promise<string> {
        if (!this.seed) {
            throw new Error('Master seed is locked / does not exist');
        }

        try {
            // If we have original entropy, use it
            if (this.entropy) {
                return bip39.entropyToMnemonic(this.entropy, wordlist);
            }

            // Otherwise generate new entropy from seed
            const entropy = new Uint8Array(32);
            entropy.set(this.seed);
            return bip39.entropyToMnemonic(entropy, wordlist);
        } catch (error) {
            console.error('Phrase generation error:', error);
            throw new Error('Failed to generate seed phrase');
        }
    }

    /**
     * Locks the master seed by wiping it from memory
     */
    lock(): void {
        if (this.seed) {
            wipeBytes(this.seed);
            this.seed = undefined;
        }
        if (this.entropy) {
            wipeBytes(this.entropy);
            this.entropy = undefined;
        }
        this._isLocked = true;
    }

    /**
     * Checks if the master seed is locked
     */
    get isLocked(): boolean {
        return this._isLocked;
    }

    /**
     * Derives an account seed for the given index
     * @throws Error if the master seed is locked
     */
    async deriveAccountSeed(accountIndex: number): Promise<Uint8Array> {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return deriveAccountSeed(this.seed, accountIndex);
    }

    /**
     * Derives an account tag for the given index
     * @throws Error if the master seed is locked
     */
    async deriveAccountTag(accountIndex: number): Promise<Uint8Array> {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return deriveAccountTag(this.seed, accountIndex);
    }

    /**
     * Creates a WOTS wallet for the given account and WOTS indices
     * @throws Error if the master seed is locked
     */
    async createWOTSWallet(
        accountIndex: number,
        wotsIndex: number,
        name?: string
    ): Promise<WOTSWallet> {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return createWOTSWallet(this.seed, accountIndex, wotsIndex, name);
    }

    /**
     * Exports the master seed in encrypted form
     */
    async export(password: string): Promise<EncryptedData> {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }

        // If we have stored encrypted seed, verify password first
        if (this.encryptedSeed) {
            try {
                await decrypt(this.encryptedSeed, password);
            } catch (error) {
                throw new Error('Failed to decrypt master seed - invalid password');
            }
        }

        // Create new encrypted seed if needed
        const encrypted = await encrypt(this.seed, password);
        this.encryptedSeed = encrypted;  // Store for future verification
        return encrypted;
    }

    /**
     * Creates a MasterSeed instance from an encrypted seed
     */
    static async import(encrypted: EncryptedData, password: string): Promise<MasterSeed> {
        try {
            const seed = await decrypt(encrypted, password);
            // Validate seed length
            if (seed.length !== 32) {
                throw new Error('Invalid seed length');
            }

            const instance = new MasterSeed(seed);
            instance._isLocked = false;
            return instance;
        } catch (error) {
            throw new Error('Failed to decrypt master seed - invalid password');
        }
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



}

function intToBytes(num: number): number[] {
    return [
        (num >> 24) & 0xff,
        (num >> 16) & 0xff,
        (num >> 8) & 0xff,
        num & 0xff
    ];
}