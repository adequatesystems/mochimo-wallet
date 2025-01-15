import { generateSeed, wipeBytes } from '../crypto/random';

import { WOTS, WOTSWallet } from 'mochimo-wots';
import { EncryptedData } from '../crypto/encryption';

import * as bip39 from '@scure/bip39';
import { wordlist } from '@scure/bip39/wordlists/english';
import { Derivation } from '../redux/utils/derivation';
import CryptoJS from 'crypto-js';

const PBKDF2_ITERATIONS = process.env.NODE_ENV === 'test' ? 1000 : 100000;

export interface EncryptedSeed {
    data: string;      // Base64 encrypted seed
    iv: string;        // Initialization vector
    salt: string;      // Salt for key derivation
}

export class MasterSeed {
    private seed?: Uint8Array;
    private entropy?: Uint8Array;  // Store original entropy for phrase generation
    private _isLocked: boolean = true;

    public constructor(seed: Uint8Array, entropy?: Uint8Array) {
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

    deriveAccount(accountIndex: number): { tag: string, seed: Uint8Array, wotsSeed: Uint8Array, address: Uint8Array } {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }

        const tag = Derivation.deriveAccountTag(this.seed, accountIndex);
        const { secret: accountSeed, prng } = Derivation.deriveSeed(this.seed, accountIndex);
        //generate first address/public key
        const address = WOTS.generateRandomAddress(new Uint8Array(12).fill(1), accountSeed, (bytes) => {
            if (prng) {
                const len = bytes.length;
                const randomBytes = prng.nextBytes(len);
                bytes.set(randomBytes);
            }
        });

        return {
            tag: Buffer.from(tag).toString('hex'),
            seed: accountSeed,
            wotsSeed: accountSeed,
            address: address
        };
    }

    /**
     * Derives an account seed for the given index
     * @throws Error if the master seed is locked
     */
    deriveAccountSeed(accountIndex: number): Uint8Array {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return Derivation.deriveSeed(this.seed, accountIndex).secret;
    }

    /**
     * Derives an account tag for the given index
     * @throws Error if the master seed is locked
     */
    async deriveAccountTag(accountIndex: number): Promise<Uint8Array> {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return Derivation.deriveAccountTag(this.seed, accountIndex);
    }

    public static deriveWotsIndexFromWotsAddress(accountSeed: Uint8Array, wotsAddress: Uint8Array): number {
        if (!accountSeed) throw new Error('Account seed is empty');
        //tag bytes are the last 12 bytes of wotsaddress
        const tagBytes = wotsAddress.slice(-12);
        const tag = Buffer.from(tagBytes).toString('hex');

        let ret: number = -1
        for (let i = 0; i < 10000; i++) {
            console.log('Creating WOTS wallet for index', i);
            const w = Derivation.deriveWotsSeedAndAddress(accountSeed, i, tag);
            if (Buffer.from(w.address).toString('hex') === Buffer.from(wotsAddress).toString('hex')) {
                ret = i;
                break;
            }
        }
        return ret;
    }


    /**
     * Exports the master seed in encrypted form
     */
    async export(password: string): Promise<EncryptedData> {
        if (!this.seed) {
            throw new Error('No seed to export');
        }

        const salt = crypto.getRandomValues(new Uint8Array(16));
        const iv = crypto.getRandomValues(new Uint8Array(16));

        const key = await crypto.subtle.importKey(
            'raw',
            new TextEncoder().encode(password),
            'PBKDF2',
            false,
            ['deriveBits', 'deriveKey']
        );

        const derivedKey = await crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt,
                iterations: PBKDF2_ITERATIONS,
                hash: 'SHA-256'
            },
            key,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt']
        );

        // Encrypt the seed
        const encrypted = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            derivedKey,
            this.seed
        );

        return {
            data: Buffer.from(encrypted).toString('base64'),
            iv: Buffer.from(iv).toString('base64'),
            salt: Buffer.from(salt).toString('base64')
        };
    }

    /**
     * Creates a MasterSeed instance from an encrypted seed
     */
    static async import(encrypted: EncryptedData, password: string): Promise<MasterSeed> {
        try {
            const encryptedData = Buffer.from(encrypted.data, 'base64');
            const iv = Buffer.from(encrypted.iv, 'base64');
            const salt = Buffer.from(encrypted.salt, 'base64');

            // Derive key using same parameters
            const key = await crypto.subtle.importKey(
                'raw',
                new TextEncoder().encode(password),
                'PBKDF2',
                false,
                ['deriveBits', 'deriveKey']
            );

            const derivedKey = await crypto.subtle.deriveKey(
                {
                    name: 'PBKDF2',
                    salt,
                    iterations: PBKDF2_ITERATIONS,
                    hash: 'SHA-256'
                },
                key,
                { name: 'AES-GCM', length: 256 },
                false,
                ['decrypt']
            );

            // Decrypt the seed
            const decrypted = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv },
                derivedKey,
                encryptedData
            );

            return new MasterSeed(new Uint8Array(decrypted));
        } catch (error) {
            console.error('Decryption error:', error);
            throw new Error('Failed to decrypt master seed - invalid password');
        }
    }

    /**
     * Derives a storage key from the master seed using HKDF-like construction
     * Returns a 32-byte key suitable for AES-256
     */
    deriveStorageKey(): Uint8Array {
        if (this._isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }

        // Convert seed to WordArray
        const seedWordArray = CryptoJS.enc.Hex.parse(
            Buffer.from(this.seed).toString('hex')
        );

        // Initial hash with domain separator
        const initialHash = CryptoJS.SHA256(
            CryptoJS.enc.Utf8.parse('mochimo_storage_key_v1').concat(seedWordArray)
        );

        // HMAC extraction step
        const prk = CryptoJS.HmacSHA256(
            initialHash,
            'mochimo_storage_salt'
        );

        // Expansion step
        const storageKey = CryptoJS.HmacSHA256(
            'mochimo_storage_info',
            prk
        );

        // Convert WordArray to Uint8Array
        return new Uint8Array(
            Buffer.from(storageKey.toString(CryptoJS.enc.Hex), 'hex')
        );
    }
}
