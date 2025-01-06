import { MasterSeed } from '../../core/MasterSeed';
import { Storage } from '../../types/storage';
// Secure in-memory session manager
export class SessionManager {
    private static instance: SessionManager;
    private masterSeed: MasterSeed | null = null;

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
        } catch (error) {
            throw new Error('Invalid password');
        }
    }

     getMasterSeed(): MasterSeed {
        if (!this.masterSeed) throw new Error('Wallet is locked');
        return this.masterSeed;
    }

    lock(): void {
        if (this.masterSeed) {
            this.masterSeed.lock();
            this.masterSeed = null;
        }
    }

    setMasterSeed(masterSeed: MasterSeed): void {
        this.masterSeed = masterSeed;
    }
} 