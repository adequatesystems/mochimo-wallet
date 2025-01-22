import { MasterSeed } from '../../core/MasterSeed';
import { Storage } from '../../types/storage';
// Secure in-memory session manager
export class SessionManager {
    private static instance: SessionManager;
    private masterSeed: MasterSeed | null = null;
    private storageKey: Uint8Array | null = null;

    private constructor() {}

    static getInstance(): SessionManager {
        if (!this.instance) {
            this.instance = new SessionManager();
        }
        return this.instance;
    }

    async unlock(password: string, storage: Storage): Promise<void> {
        try {
            const masterSeed = await storage.loadMasterSeed();
            if (!masterSeed) throw new Error('No master seed found');
            
            this.masterSeed = await MasterSeed.import(masterSeed, password);
            // Derive and store the storage key
            this.storageKey = this.masterSeed.deriveStorageKey();
        } catch (error) {
            throw new Error('Invalid password');
        }
    }

    async unlockWithSeed(seed: string): Promise<void> {
        try {
            this.masterSeed = new MasterSeed(Buffer.from(seed, 'hex'));
            this.storageKey = this.masterSeed.deriveStorageKey();
        } catch (error) {
            throw new Error('Invalid seed');
        }
    }
    
    async unlockWithMnemonic(mnemonic: string): Promise<void> {
        try {
            this.masterSeed = await MasterSeed.fromPhrase(mnemonic);
            this.storageKey = this.masterSeed.deriveStorageKey();
        } catch (error) {
            throw new Error('Invalid mnemonic');
        }
    }

    async unlockWithDerivedKey(derivedKey: JsonWebKey, storage: Storage): Promise<void> {
        try {
            const masterSeed = await storage.loadMasterSeed();
            if (!masterSeed) throw new Error('No master seed found');
            
            this.masterSeed = await MasterSeed.importFromDerivedKeyJWK(masterSeed, derivedKey);
            this.storageKey = this.masterSeed.deriveStorageKey();
        } catch (error) {
            throw new Error('Invalid derived key');
        }
    }

    getMasterSeed(): MasterSeed {
        if (!this.masterSeed) throw new Error('Wallet is locked');
        return this.masterSeed;
    }

    getStorageKey(): Uint8Array {
        if (!this.storageKey) throw new Error('Wallet is locked');
        return this.storageKey;
    }

    lock(): void {
        if (this.masterSeed) {
            this.masterSeed.lock();
            this.masterSeed = null;
        }
        // Clear storage key
        if (this.storageKey) {
            this.storageKey.fill(0);
            this.storageKey = null;
        }
    }

    setMasterSeed(masterSeed: MasterSeed): void {
        this.masterSeed = masterSeed;
        // Derive new storage key
        this.storageKey = masterSeed.deriveStorageKey();
    }
} 