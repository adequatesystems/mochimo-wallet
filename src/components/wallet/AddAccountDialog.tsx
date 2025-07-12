import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, HeaderCloseButton } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus, Upload, Wallet, Loader2, Key } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { McmImportDialog } from './McmImportDialog'
import { useWallet } from 'mochimo-wallet'
import { LegacyKeypairImportDialog } from './LegacyKeypairImportDialog'


interface AddAccountDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreateAccount: (name: string) => Promise<void>
  onImportAccount: (file: File) => Promise<void>
}

type AddAccountView = 'select' | 'create' | 'import'

export function AddAccountDialog({
  isOpen,
  onClose,
  onCreateAccount,
  onImportAccount
}: AddAccountDialogProps) {
  const [view, setView] = useState<AddAccountView>('select')
  const [accountName, setAccountName] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [mcmImportOpen, setMcmImportOpen] = useState(false)
  const [legacyKeypairOpen, setLegacyKeypairOpen] = useState(false)

  const handleClose = () => {
    setView('select')
    setAccountName('')
    setSelectedFile(null)
    setError(null)
    onClose()
  }
  const wallet = useWallet()

  const handleCreateSubmit = async () => {
    if (!accountName.trim()) {
      setError('Please enter an account name')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onCreateAccount(accountName.trim())
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create account')
    } finally {
      setLoading(false)
    }
  }

  const handleImportSubmit = async () => {
    if (!selectedFile) {
      setError('Please select a file')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onImportAccount(selectedFile)
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import account')
    } finally {
      setLoading(false)
    }
  }

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loading && accountName.trim()) {
      handleCreateSubmit()
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-[340px] p-4 rounded-lg">
          <DialogHeader>
            <DialogTitle>Add Account</DialogTitle>
            <HeaderCloseButton />
          </DialogHeader>

          <AnimatePresence mode="wait">
            {view === 'select' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-2 py-2"
              >
                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => setView('create')}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Plus className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium mb-1">Create New Account</h3>
                      <p className="text-xs text-muted-foreground">
                        Add a new account to your HD wallet
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    handleClose()
                    setMcmImportOpen(true)
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Upload className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium mb-1">Import MCM File</h3>
                      <p className="text-xs text-muted-foreground">
                        Import accounts from an MCM file
                      </p>
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start h-auto p-4"
                  onClick={() => {
                    handleClose()
                    setLegacyKeypairOpen(true)
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-full bg-primary/10">
                      <Key className="h-4 w-4 text-primary" />
                    </div>
                    <div className="text-left">
                      <h3 className="font-medium mb-1">Import Legacy Keypair</h3>
                      <p className="text-xs text-muted-foreground">
                        Import account from WOTS+ keypair
                      </p>
                    </div>
                  </div>
                </Button>
              </motion.div>
            )}

            {view === 'create' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <form onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="accountName">Account Name</Label>
                    <Input
                      id="accountName"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Enter account name"
                      autoFocus
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <div className="flex justify-between">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setView('select')}
                    >
                      Back
                    </Button>
                    <Button
                      type="submit"
                      disabled={loading || !accountName.trim()}
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create Account'
                      )}
                    </Button>
                  </div>
                </form>
              </motion.div>
            )}

            {view === 'import' && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4 py-2"
              >
                <div className="space-y-2">
                  <Label>MCM File</Label>
                  <div className="border-2 border-dashed rounded-lg p-4 text-center">
                    <input
                      type="file"
                      accept=".mcm"
                      className="hidden"
                      id="mcm-file"
                      onChange={(e) => {
                        setError(null)
                        setSelectedFile(e.target.files?.[0] || null)
                      }}
                    />
                    <label
                      htmlFor="mcm-file"
                      className={cn(
                        "cursor-pointer flex flex-col items-center gap-2",
                        "text-sm text-muted-foreground hover:text-foreground transition-colors"
                      )}
                    >
                      <Upload className="h-8 w-8" />
                      {selectedFile ? (
                        <span>{selectedFile.name}</span>
                      ) : (
                        <span>Click to select MCM file</span>
                      )}
                    </label>
                  </div>
                </div>

                {error && (
                  <p className="text-sm text-red-500">
                    {error}
                  </p>
                )}

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setView('select')}
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleImportSubmit}
                    disabled={loading || !selectedFile}
                  >
                    {loading ? 'Importing...' : 'Import'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </DialogContent>
      </Dialog>

      <McmImportDialog
        isOpen={mcmImportOpen}
        onClose={() => setMcmImportOpen(false)}
        onImportAccounts={async (accounts, mcmData) => {
          const indicesToImport = new Set(accounts.filter(account => account.validation?.isValid).map(account => account.originalIndex))
          await wallet.importAccountsFromMcm(mcmData, (index) => {
            return indicesToImport.has(index)
          })
        }}
      />

      <LegacyKeypairImportDialog
        isOpen={legacyKeypairOpen}
        onClose={() => setLegacyKeypairOpen(false)}
        onImport={async (name, publicKey, privateKey) => {
          const data = {
            name,
            address: publicKey,
            secret: privateKey
          }
          await wallet.importAccountsFrom('keypair', { entries: [data] })
          handleClose()
        }}
      />
    </>
  )
}