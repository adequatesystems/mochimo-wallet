import { generateSeed, wipeBytes } from '../crypto/random';
import { deriveAccountSeed, deriveAccountTag, createWOTSWallet } from '../crypto/kdf';
import { WOTSWallet } from 'mochimo-wots-v2';

export interface EncryptedSeed {
    data: string;      // Base64 encrypted seed
    iv: string;        // Initialization vector
    salt: string;      // Salt for key derivation
}

export class MasterSeed {
    private seed?: Uint8Array;
    private isLocked: boolean = true;

    /**
     * Creates a new master seed
     */
    static async create(): Promise<MasterSeed> {
        const instance = new MasterSeed();
        instance.seed = generateSeed();
        instance.isLocked = false;
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
        this.isLocked = true;
    }

    /**
     * Checks if the master seed is locked
     */
    isLocked(): boolean {
        return this.isLocked;
    }

    /**
     * Derives an account seed for the given index
     * @throws Error if the master seed is locked
     */
    async deriveAccountSeed(accountIndex: number): Promise<Uint8Array> {
        if (this.isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return deriveAccountSeed(this.seed, accountIndex);
    }

    /**
     * Derives an account tag for the given index
     * @throws Error if the master seed is locked
     */
    async deriveAccountTag(accountIndex: number): Promise<Uint8Array> {
        if (this.isLocked || !this.seed) {
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
        if (this.isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        return createWOTSWallet(this.seed, accountIndex, wotsIndex, name);
    }

    /**
     * Exports the master seed in encrypted form
     * @throws Error if the master seed is locked
     */
    async export(password: string): Promise<EncryptedSeed> {
        if (this.isLocked || !this.seed) {
            throw new Error('Master seed is locked');
        }
        // TODO: Implement encryption
        throw new Error('Not implemented');
    }

    /**
     * Creates a MasterSeed instance from an encrypted seed
     */
    static async import(encrypted: EncryptedSeed, password: string): Promise<MasterSeed> {
        // TODO: Implement decryption
        throw new Error('Not implemented');
    }
} 