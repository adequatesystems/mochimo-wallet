import { create } from 'zustand'
import { HDWallet } from '../core/HDWallet'
import { Account } from '../types/account'
import { NetworkService } from '../types/network'
import { ProxyNetworkService } from '@/network/proxyNetworkService'
import { WalletExport } from '@/types/wallet'
import { StorageFactory } from '../storage/StorageFactory'

// Export the state interface
export interface WalletState {
    // State
    wallet: HDWallet | null
    activeAccount: Account | null
    isLocked: boolean
    isLoading: boolean
    error: Error | null
    networkService: NetworkService

    // Wallet Actions
    createWallet: (password: string) => Promise<HDWallet | undefined>
    loadWallet: (password: string) => Promise<HDWallet | undefined>
    lockWallet: () => void
    recoverWallet: (seedPhrase: string, password: string) => Promise<void>
    exportSeedPhrase: (password: string) => Promise<string>

    // Account Actions
    createAccount: (name: string) => Promise<Account>
    setActiveAccount: (account: Account) => void
    getAccounts: () => Account[]

    // Transaction Actions
    sendTransaction: (destination: string, amount: bigint) => Promise<any>
    activateTag: (tag: string) => Promise<void>

    // Error handling
    clearError: () => void

    // Export/import actions
    exportWallet: (password: string) => Promise<WalletExport>
    importWallet: (data: WalletExport, password: string) => Promise<void>

    // Wallet existence check
    hasWallet: () => Promise<boolean>

    // WOTS operations
    getCurrentWOTSAddress: (account?: Account) => Promise<string | null>
}

// Create storage instance

const networkService = new ProxyNetworkService("http://localhost:9000/api")

export const useWalletStore = create<WalletState>()((set, get) => ({
    // Initial state
    wallet: null,
    activeAccount: null,
    isLocked: true,
    isLoading: false,
    error: null,
    networkService: networkService,

    // Wallet management
    createWallet: async (password) => {
        set({ isLoading: true, error: null })
        let w = undefined
        try {
            // Use storage directly in HDWallet
            const wallet = await HDWallet.createWithStorage(password)
            
            // Save active account if exists
            const accounts = wallet.getAccounts()
            if (accounts.length > 0) {
                await wallet.storage?.saveActiveAccount(accounts[0].toJSON())
            }

            set({ wallet, isLocked: false })
            w = wallet
        } catch (error) {
            set({ error: error as Error })
            throw error
        } finally {
            set({ isLoading: false })
        }
        return w
    },

    loadWallet: async (password) => {
        set({ isLoading: true, error: null })
        let w = undefined
        try {
            // Load wallet with our storage
            const wallet = await HDWallet.loadWithStorage(password)
            
            // Load active account from storage
            const activeAccountData = await wallet.storage?.loadActiveAccount()
            const activeAccount = activeAccountData 
                ? wallet.getAccount(activeAccountData.tag)
                : null

            set({ wallet, activeAccount, isLocked: false })
            w = wallet
        } catch (error) {
            set({ error: error as Error })
        } finally {
            set({ isLoading: false })
        }
        return w
    },

    lockWallet: () => {
        const { wallet } = get()
        wallet?.lock()
        set({ wallet: null, activeAccount: null, isLocked: true })
    },

    recoverWallet: async (seedPhrase, password) => {
        set({ isLoading: true, error: null })
        try {
            const wallet = await HDWallet.recover(seedPhrase, password, {
                scanAccounts: true,
                maxScan: 20
            })

            // Save first account as active if exists
            const accounts = wallet.getAccounts()
            if (accounts.length > 0) {
                await wallet.storage?.saveActiveAccount(accounts[0].toJSON())
                set({ activeAccount: accounts[0] })
            }

            set({ wallet, isLocked: false })
        } catch (error) {
            set({ error: error as Error })
        } finally {
            set({ isLoading: false })
        }
    },

    exportSeedPhrase: async (password) => {
        const { wallet } = get()
        if (!wallet) throw new Error('No wallet loaded')
        return wallet.exportSeedPhrase(password)
    },

    // Account management
    createAccount: async (name) => {
        const { wallet } = get()
        if (!wallet) throw new Error('No wallet loaded')

        set({ isLoading: true, error: null })
        try {
            const account = await wallet.createAccount(name)
            set({ activeAccount: account })
            return account
        } catch (error) {
            set({ error: error as Error })
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    setActiveAccount: async (account) => {
        const { wallet } = get()
        if (!wallet) throw new Error('No wallet loaded')

        // Save to storage when changing active account
        await wallet.storage?.saveActiveAccount(account.toJSON())
        set({ activeAccount: account })
    },

    getAccounts: () => {
        const { wallet } = get()
        return wallet?.getAccounts() || []
    },

    // Transaction operations
    sendTransaction: async (destination, amount) => {
        const { wallet, activeAccount, networkService } = get()
        if (!wallet || !activeAccount) {
            throw new Error('No wallet or active account')
        }

        const tagResolve = await networkService.resolveTag(activeAccount.tag)
        const balance = BigInt(tagResolve.balanceConsensus)
        let result = undefined
        set({ isLoading: true, error: null })
        try {
            const tx = await wallet.createTransaction(
                activeAccount,
                Buffer.from(destination, 'hex'),
                amount,
                balance
            )
            result = await networkService.pushTransaction(Buffer.from(tx.datagram).toString('base64'))
        } catch (error) {
            set({ error: error as Error })
            throw error
        } finally {
            set({ isLoading: false })
        }
        return result;
    },

    activateTag: async () => {
        const { wallet, activeAccount, networkService } = get()
        if (!wallet || !activeAccount) {
            throw new Error('No wallet or active account')
        }

        set({ isLoading: true, error: null })
        try {
            const wots = await wallet.createWOTSWallet(activeAccount)
            const address = wots.getAddress()
            if (!address) throw new Error('Failed to generate WOTS address')
            
            await networkService.activateTag(Buffer.from(address).toString('hex'))
        } catch (error) {
            set({ error: error as Error })
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    // Error handling
    clearError: () => set({ error: null }),

    // Add export/import actions
    exportWallet: async (password) => {
        const { wallet } = get()
        if (!wallet) throw new Error('No wallet loaded')

        set({ isLoading: true, error: null })
        try {
            const exportData = await wallet.export(password)
            return exportData
        } catch (error) {
            set({ error: error as Error })
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    importWallet: async (data, password) => {
        set({ isLoading: true, error: null })
        try {
            const wallet = await HDWallet.import(data, password)
            
            // Load active account if exists
            const accounts = wallet.getAccounts()
            if (accounts.length > 0) {
                await wallet.storage?.saveActiveAccount(accounts[0].toJSON())
                set({ activeAccount: accounts[0] })
            }

            set({ wallet, isLocked: false })
        } catch (error) {
            set({ error: error as Error })
            throw error
        } finally {
            set({ isLoading: false })
        }
    },

    hasWallet: async () => {
        try {
            // Try to load master seed from storage
            const storage = StorageFactory.create()
            const masterSeed = await storage.loadMasterSeed()
            
            // If masterSeed exists, wallet exists
            return masterSeed !== null
        } catch (error) {
            console.error('Error checking wallet existence:', error)
            return false
        }
    },

    getCurrentWOTSAddress: async (account?) => {
        const { wallet, activeAccount } = get()
        if (!wallet) throw new Error('No wallet loaded')
        
        const targetAccount = account || activeAccount
        if (!targetAccount) throw new Error('No account specified')

        try {
            // Create WOTS wallet without incrementing index
            const wots = await wallet.createWOTSWallet(targetAccount, { increment: false })
            const address = wots.getAddress()
            
            if (!address) return null
            return Buffer.from(address).toString('hex')
        } catch (error) {
            console.error('Error getting WOTS address:', error)
            return null
        }
    }
})) 