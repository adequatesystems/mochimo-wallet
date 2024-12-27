import { createContext, useContext, ReactNode, useCallback } from 'react'
import { useWalletStore } from '../store/walletStore'
import type { Account } from '../types/account'
import type { WalletExport } from '../types/wallet'

// Import the WalletState type from the store
import type { WalletState } from '../store/walletStore'

// Create a type for our context value
type WalletContextValue = WalletState

// Create the context with proper type
export const WalletContext = createContext<WalletContextValue | null>(null)

// Type guard to check if context exists
function assertContext(context: WalletContextValue | null): asserts context is WalletContextValue {
    if (!context) throw new Error('useWallet must be used within WalletProvider')
}

export function WalletProvider({ children }: { children: ReactNode }) {
    const store = useWalletStore()
    return (
        <WalletContext.Provider value={store}>
            {children}
        </WalletContext.Provider>
    )
}

// Base hook for accessing wallet context
export function useWallet(): WalletState {
    const context = useContext(WalletContext)
    assertContext(context)
    return context
}

// Specialized hooks for different wallet operations
export function useWalletStatus() {
    const { isLocked, isLoading, error } = useWallet()
    return { isLocked, isLoading, error }
}

export function useAccounts() {
    const { wallet, activeAccount, setActiveAccount, createAccount } = useWallet()
    
    const accounts = wallet?.getAccounts() || []
    
    const createNewAccount = useCallback(async (name: string) => {
        const account = await createAccount(name)
        return account
    }, [createAccount])

    return {
        accounts,
        activeAccount,
        setActiveAccount,
        createAccount: createNewAccount
    }
}

export function useWalletOperations() {
    const {
        createWallet,
        loadWallet,
        lockWallet,
        recoverWallet,
        exportSeedPhrase,
        exportWallet,
        importWallet
    } = useWallet()

    const initializeWallet = useCallback(async (password: string, create = false) => {
        if (create) {
            await createWallet(password)
        } else {
            await loadWallet(password)
        }
    }, [createWallet, loadWallet])

    const backupWallet = useCallback(async (password: string): Promise<WalletExport> => {
        return exportWallet(password)
    }, [exportWallet])

    const restoreWallet = useCallback(async (data: WalletExport, password: string) => {
        await importWallet(data, password)
    }, [importWallet])

    return {
        initializeWallet,
        lockWallet,
        recoverWallet,
        exportSeedPhrase,
        backupWallet,
        restoreWallet
    }
}

export function useTransactions() {
    const { sendTransaction, activateTag, networkService } = useWallet()

    const send = useCallback(async (destination: string, amount: bigint) => {
        await sendTransaction(destination, amount)
    }, [sendTransaction])

    const activate = useCallback(async (tag: string) => {
        await activateTag(tag)
    }, [activateTag])

    return {
        send,
        activate,
        networkService
    }
}

// Helper hook for error handling
export function useWalletError() {
    const { error, clearError } = useWallet()
    
    const handleError = useCallback((error: Error) => {
        console.error('Wallet error:', error)
        // You could add additional error handling here
    }, [])

    return { 
        error, 
        clearError,
        handleError
    }
}

export function useWalletInit() {
    const { hasWallet, createWallet, loadWallet, isLoading } = useWallet()

    const initializeWallet = useCallback(async (password: string) => {
        // Check if wallet exists first
        const exists = await hasWallet()
        
        if (exists) {
            await loadWallet(password)
        } else {
            await createWallet(password)
        }
    }, [hasWallet, loadWallet, createWallet])

    return {
        hasWallet,
        initializeWallet,
        isLoading
    }
}

export function useWOTS() {
    const { getCurrentWOTSAddress, activateTag, wallet, setActiveAccount } = useWallet()
    const { activeAccount } = useAccounts()

    const getAddress = useCallback(async (account?: Account) => {
        return getCurrentWOTSAddress(account)
    }, [getCurrentWOTSAddress])

    const activate = useCallback(async () => {
        if (!activeAccount) throw new Error('No active account')
        const address = await getCurrentWOTSAddress(activeAccount)
        if (!address) throw new Error('Could not generate WOTS address')
        
        await activateTag(address)
    }, [activeAccount, getCurrentWOTSAddress, activateTag])

    const updateWotsIndex = useCallback(async (newIndex: number, account?: Account) => {
        if (!wallet) throw new Error('No wallet loaded')
        const targetAccount = account || activeAccount
        if (!targetAccount) throw new Error('No account specified')

        // Update the account's WOTS index
        targetAccount.wotsIndex = newIndex

        // Save the updated account
        await wallet.storage?.saveAccount(targetAccount.toJSON())

        // If this is the active account, update it in the store
        if (targetAccount === activeAccount) {
            setActiveAccount(targetAccount)
        }
    }, [wallet, activeAccount, setActiveAccount])

    return {
        getAddress,
        activate,
        activeAccount,
        updateWotsIndex
    }
} 