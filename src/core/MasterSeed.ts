import { generateSeed, wipeBytes } from '../crypto/random';
import { deriveAccountSeed, deriveAccountTag, createWOTSWallet } from '../crypto/kdf';
import { WOTSWallet } from 'mochimo-wots-v2';
import { encrypt, decrypt, EncryptedData } from '../crypto/encryption';

export interface EncryptedSeed {
    data: string;      // Base64 encrypted seed
    iv: string;        // Initialization vector
    salt: string;      // Salt for key derivation
}

export class MasterSeed {
    private seed?: Uint8Array;
    private _isLocked: boolean = true;

    /**
     * Creates a new master seed
     */
    static async create(): Promise<MasterSeed> {
        const instance = new MasterSeed();
        instance.seed = generateSeed();
        instance._isLocked = false;
        return instance;
    }

    /**
     * Locks the master seed by wiping it from memory
     */
    lock(): void {
        if (this.seed) {
            wipeBytes(this.seed);
            this.seed = undefined;
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
        return encrypt(this.seed, password);
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
            
            const instance = new MasterSeed();
            instance.seed = seed;
            instance._isLocked = false;
            return instance;
        } catch (error) {
            throw new Error('Failed to decrypt master seed - invalid password');
        }
    }
} 