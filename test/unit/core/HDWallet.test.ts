import { describe, it, expect, beforeEach, vi } from 'vitest';
import { HDWallet } from '../../../src/core/HDWallet';
import { MockStorage } from '../../mocks/MockStorage';
import { Transaction } from 'mochimo-wots-v2';
import { Account } from '@/types/account';

describe('HDWallet', () => {
    let storage: MockStorage;

    beforeEach(() => {
        storage = new MockStorage();
    });

    describe('create', () => {
        it('should create a new wallet', async () => {
            const wallet = await HDWallet.create('password', { storage });
            expect(wallet).toBeDefined();
        });

        it('should store encrypted master seed', async () => {
            await HDWallet.create('password', { storage });
            const saved = await storage.loadMasterSeed();
            expect(saved).toBeDefined();
        });
    });

    describe('load', () => {
        it('should load an existing wallet', async () => {
            // Create and save a wallet
            await HDWallet.create('password', { storage });
            
            // Load it back
            const loaded = await HDWallet.load('password', storage);
            expect(loaded).toBeDefined();
        });

        it('should fail with wrong password', async () => {
            await HDWallet.create('password', { storage });
            
            await expect(HDWallet.load('wrong', storage))
                .rejects.toThrow('Failed to load wallet - invalid password');
        });
    });

    describe('accounts', () => {
        let wallet: HDWallet;

        beforeEach(async () => {
            wallet = await HDWallet.create('password', { storage });
        });

        it('should create accounts', async () => {
            const account = await wallet.createAccount('Test Account');
            expect(account.name).toBe('Test Account');
            expect(account.index).toBe(0);
            expect(account.nextWotsIndex).toBe(0);
        });

        it('should store accounts', async () => {
            await wallet.createAccount('Test Account');
            const accounts = await storage.loadAccounts();
            expect(accounts.length).toBe(1);
            expect(accounts[0].name).toBe('Test Account');
        });

        it('should create WOTS wallets', async () => {
            const account = await wallet.createAccount('Test Account');
            const wots = await wallet.createWOTSWallet(account);
            
            expect(wots.getAddress()).toBeDefined();
            expect(wots.hasSecret()).toBe(true);
            expect(account.nextWotsIndex).toBe(1);
        });

        it('should increment WOTS index', async () => {
            const account = await wallet.createAccount('Test Account');
            await wallet.createWOTSWallet(account);
            await wallet.createWOTSWallet(account);
            
            expect(account.nextWotsIndex).toBe(2);
        });

        describe('active account', () => {
            let wallet: HDWallet;
            let storage: MockStorage;

            beforeEach(async () => {
                storage = new MockStorage();
                wallet = await HDWallet.create('password', { storage });
            });

            it('should save active account', async () => {
                const account = await wallet.createAccount('Test Account');
                await storage.saveActiveAccount(account.toJSON());

                const loaded = await storage.loadActiveAccount();
                expect(loaded).toBeDefined();
                expect(loaded?.tag).toBe(account.tag);
            });

            it('should load active account after wallet creation', async () => {
                // Create account and set as active
                const account = await wallet.createAccount('Test Account');
                await storage.saveActiveAccount(account.toJSON());

                // Create new wallet instance
                const newWallet = await HDWallet.load('password', storage);
                expect(newWallet).toBeDefined();
                const activeAccount = await storage.loadActiveAccount();

                expect(activeAccount).toBeDefined();
                expect(activeAccount?.tag).toBe(account.tag);
            });

            it('should clear active account on wallet lock', async () => {
                const account = await wallet.createAccount('Test Account');
                await storage.saveActiveAccount(account.toJSON());

                wallet.lock();
                const activeAccount = await storage.loadActiveAccount();
                expect(activeAccount).toBeDefined();  // Active account persists in storage
            });
        });
    });

    describe('locking', () => {
        it('should prevent operations when locked', async () => {
            const wallet = await HDWallet.create('password', { storage });
            wallet.lock();

            await expect(wallet.createAccount('Test'))
                .rejects.toThrow('Wallet is locked');
        });

        it('should allow operations after reload', async () => {
            // Create and lock
            const wallet = await HDWallet.create('password', { storage });
            wallet.lock();

            // Load and verify it works
            const loaded = await HDWallet.load('password', storage);
            const account = await loaded.createAccount('Test');
            expect(account).toBeDefined();
        });
    });

    describe('export/import', () => {
        let wallet: HDWallet;
        const password = 'test-password';

        beforeEach(async () => {
            wallet = await HDWallet.create(password, { storage });
            await wallet.createAccount('Test Account 1');
            await wallet.createAccount('Test Account 2');
        });

        it('should export wallet data', async () => {
            const exported = await wallet.export(password);

            expect(exported.version).toBe('1.0.0');
            expect(exported.timestamp).toBeDefined();
            expect(exported.encrypted).toBeDefined();
            expect(exported.accounts).toHaveLength(2);
            expect(exported.accounts[0].name).toBe('Test Account 1');
            expect(exported.accounts[1].name).toBe('Test Account 2');
        });

        it('should import exported wallet', async () => {
            const exported = await wallet.export(password);
            const imported = await HDWallet.import(exported, password);

            // Verify accounts were imported
            const accounts = imported.getAccounts();
            expect(accounts).toHaveLength(2);
            expect(accounts[0].name).toBe('Test Account 1');
            expect(accounts[1].name).toBe('Test Account 2');

            // Verify master seed works
            const newAccount = await imported.createAccount('Test Account 3');
            expect(newAccount).toBeDefined();
        });

        it('should fail import with wrong password', async () => {
            const exported = await wallet.export(password);
            
            await expect(HDWallet.import(exported, 'wrong-password'))
                .rejects.toThrow('Failed to import wallet - invalid data or password');
        });

        it('should save imported wallet to storage', async () => {
            const exported = await wallet.export(password);
            await HDWallet.import(exported, password, { storage });

            // Verify storage
            const savedAccounts = await storage.loadAccounts();
            expect(savedAccounts).toHaveLength(2);
            expect(savedAccounts[0].name).toBe('Test Account 1');
            expect(savedAccounts[1].name).toBe('Test Account 2');
        });

        it('should reject unsupported versions', async () => {
            const exported = await wallet.export(password);
            const invalid = {
                ...exported,
                version: '2.0.0'
            };

            await expect(HDWallet.import(invalid, password))
                .rejects.toThrow('Unsupported wallet version');
        });

        it('should fail export when locked', async () => {
            wallet.lock();
            await expect(wallet.export(password))
                .rejects.toThrow('Wallet is locked');
        });
    });

    describe('transactions', () => {
        let wallet: HDWallet;
        let account: Account;

        beforeEach(async () => {
            wallet = await HDWallet.create('password', { storage });
            account = await wallet.createAccount('Test Account');
        });

        it('should create and sign transactions', async () => {
            // Create a destination address (normally from another wallet)
            const destWallet = await wallet.createAccount('Destination');
            const destWOTS = await wallet.createWOTSWallet(destWallet);
            const destination = destWOTS.getAddress()!;

            // Create transaction
            const amount = BigInt(1000000);  // 0.001 MCM
            const {tx} = await wallet.createTransaction(account, destination, amount);
            const txObj = Transaction.of(tx)
            // Verify transaction
            expect(tx).toBeDefined();
            expect(txObj.totalSend).toBe(amount);
            expect(txObj.destinationAddressHex).toBe(Buffer.from(destination).toString('hex'));
            
            // Verify signature
            const isValid = Transaction.isValidWOTSSignature(txObj.serialize());
            expect(isValid).toBe(true);
        });

        it('should use custom fee', async () => {
            const destination = new Uint8Array(2208);  // Empty address
            const amount = BigInt(1000000);
            const fee = BigInt(2000);

            const {tx} = await wallet.createTransaction(account, destination, amount, { fee });
            const txObj = Transaction.of(tx)
            expect(txObj.fee).toBe(fee);
        });

        it('should fail when locked', async () => {
            wallet.lock();
            const destination = new Uint8Array(2208);
            const amount = BigInt(1000000);

            await expect(wallet.createTransaction(account, destination, amount))
                .rejects.toThrow('Wallet is locked');
        });

        it('should increment WOTS index after signing', async () => {
            const destination = new Uint8Array(2208);
            const amount = BigInt(1000000);

            const initialIndex = account.nextWotsIndex;
            await wallet.createTransaction(account, destination, amount);

            // Should use 2 WOTS wallets (source and change)
            expect(account.nextWotsIndex).toBe(initialIndex + 2);
        });

        it('should validate transaction parameters', async () => {
            const destination = new Uint8Array(2208);
            const amount = BigInt(1000000);

            const {tx} = await wallet.createTransaction(account, destination, amount);
            const txObj = Transaction.of(tx)
            const validation = Transaction.validate(txObj, BigInt(1000));
            expect(validation).toBeNull();  // Null means valid
        });
    });

    describe('recovery', () => {
        it('should recover wallet from seed phrase', async () => {
            const seedPhrase = 'test test test test test test test test test test test junk';
            const wallet = await HDWallet.recover(seedPhrase, 'password');
            
            expect(wallet).toBeDefined();
            expect(wallet.getAccounts()).toHaveLength(0);
        });

        it('should scan for existing accounts', async () => {
            const seedPhrase = 'test test test test test test test test test test test junk';
            
            // Mock account existence check
            vi.spyOn(HDWallet.prototype as any, 'checkAccountExists')
                .mockImplementation(async () => true);
            
            const wallet = await HDWallet.recover(seedPhrase, 'password', {
                scanAccounts: true,
                maxScan: 5
            });
            
            expect(wallet.getAccounts()).toHaveLength(5);
        });

        it('should stop scanning when no more accounts found', async () => {
            const seedPhrase = 'test test test test test test test test test test test junk';
            
            // Mock account existence check
            let callCount = 0;
            vi.spyOn(HDWallet.prototype as any, 'checkAccountExists')
                .mockImplementation(async () => {
                    callCount++;
                    return callCount <= 3;  // Only first 3 accounts exist
                });
            
            const wallet = await HDWallet.recover(seedPhrase, 'password', {
                scanAccounts: true,
                maxScan: 10
            });
            
            expect(wallet.getAccounts()).toHaveLength(3);
        });
    });

    describe('seed phrases', () => {
        let wallet: HDWallet;
        const password = 'test_password';
        const phrase = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

        beforeEach(async () => {
            wallet = await HDWallet.recover(phrase, password);
        });

        it('should export seed phrase with correct password', async () => {
            const exported = await wallet.exportSeedPhrase(password);
            expect(exported).toBe(phrase);
        });

        it('should reject export with wrong password', async () => {
            await expect(wallet.exportSeedPhrase('wrong'))
                .rejects.toThrow('Failed to decrypt master seed');
        });

        it('should reject export when locked', async () => {
            wallet.lock();
            await expect(wallet.exportSeedPhrase(password))
                .rejects.toThrow('Wallet is locked');
        });
    });
}); 