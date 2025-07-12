import { Sidebar } from '@/components/ui/sidebar'
import { AccountView } from '@/components/wallet/AccountView'
import { useState, useEffect } from 'react'
import { HDWallet, useWallet, useAccounts } from 'mochimo-wallet'
import { AddAccountDialog } from './AddAccountDialog'
import { ManageAccountsDialog } from './ManageAccountsDialog'
import { SettingsDialog } from './SettingsDialog'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet");
interface WalletDashboardProps {
  wallet: HDWallet
  sidebarOpen: boolean
  onSidebarOpenChange: (open: boolean) => void
}

export function WalletDashboard({ 
  wallet, 
  sidebarOpen, 
  onSidebarOpenChange 
}: WalletDashboardProps) {

  const [loading, setLoading] = useState(false)
  const [addAccountOpen, setAddAccountOpen] = useState(false)
  const [manageAccountsOpen, setManageAccountsOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const w = useWallet()
  const acc = useAccounts()

  // Create new account
  const handleCreateAccount = async (name: string) => {
    try {
      setLoading(true)
      const account = await acc.createAccount(name)
      //select the new account
      acc.setSelectedAccount(account.tag)
    } catch (error) {
      logger.error('Error creating account:', error)
      throw error // Let the dialog handle the error
    } finally {
      setLoading(false)
    }
  }

  // Import account from MCM file
  const handleImportAccount = async (file: File) => {
    try {
      setLoading(true)
      // TODO: Implement MCM file import
      logger.info('Importing account from file:', file.name)
      throw new Error('MCM import not implemented yet')
    } catch (error) {
      logger.error('Error importing account:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }


  const accounts = acc.accounts
  const hasSelectedAccount = acc.selectedAccount !== null && acc.accounts.find(a=>a.tag === acc.selectedAccount)
  return (
    <div className="h-full w-full flex flex-col md:flex-row overflow-hidden">
      <Sidebar
        accounts={Object.values(accounts)}
        selectedAccount={acc.selectedAccount}
        onSelectAccount={a => acc.setSelectedAccount(a.tag)}
        onCreateAccount={() => setAddAccountOpen(true)}
        onManageAccounts={() => setManageAccountsOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        isOpen={sidebarOpen}
        onOpenChange={onSidebarOpenChange}
      />
      
      <AddAccountDialog
        isOpen={addAccountOpen}
        onClose={() => setAddAccountOpen(false)}
        onCreateAccount={handleCreateAccount}
        onImportAccount={handleImportAccount}
      />

      <ManageAccountsDialog
        isOpen={manageAccountsOpen}
        onClose={() => setManageAccountsOpen(false)}
      />

      <SettingsDialog
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />

      <main className="flex-1 h-full w-full overflow-auto">
        {hasSelectedAccount ? (
          <AccountView 
            account={accounts.find(a=>a.tag === acc.selectedAccount)!}
            onUpdate={(updated) => {
             logger.info('updated account view :: ', updated)
            }}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select an account or create a new one
          </div>
        )}
      </main>
    </div>
  )
}