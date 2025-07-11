import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2 } from 'lucide-react'
import { useAccounts } from 'mochimo-wallet'


interface LegacyKeypairImportDialogProps {
  isOpen: boolean
  onClose: () => void
  onImport: (name: string, publicKey: string, privateKey: string) => Promise<void>
}

const WOTS_ADDRESS_LENGTH = 2208 * 2 // *2 because hex string
const PRIVATE_KEY_LENGTH = 32 * 2 // *2 because hex string

export function LegacyKeypairImportDialog({
  isOpen,
  onClose,
  onImport
}: LegacyKeypairImportDialogProps) {
  const acc = useAccounts()
  const [name, setName] = useState(`Account ${acc.accounts.length + 1}`)
  const [publicKey, setPublicKey] = useState('')
  const [privateKey, setPrivateKey] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const validatePublicKey = (key: string): string | null => {
    const cleaned = key.trim().toLowerCase()
    if (!cleaned) return 'Public key is required'
    if (!/^[a-f0-9]+$/i.test(cleaned)) return 'Invalid public key format (must be hex)'
    if (cleaned.length !== WOTS_ADDRESS_LENGTH) {
      return `Invalid WOTS+ address length (expected ${WOTS_ADDRESS_LENGTH} hex chars)`
    }
    return null
  }

  const validatePrivateKey = (key: string): string | null => {
    const cleaned = key.trim().toLowerCase()
    if (!cleaned) return 'Private key is required'
    if (!/^[a-f0-9]+$/i.test(cleaned)) return 'Invalid private key format (must be hex)'
    if (cleaned.length !== PRIVATE_KEY_LENGTH) {
      return `Invalid private key length (expected ${PRIVATE_KEY_LENGTH} hex chars)`
    }
    return null
  }

  const handlePublicKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPublicKey(value)
    setError(validatePublicKey(value))
  }

  const handlePrivateKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setPrivateKey(value)
    setError(validatePrivateKey(value))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter an account name')
      return
    }

    const publicKeyError = validatePublicKey(publicKey)
    if (publicKeyError) {
      setError(publicKeyError)
      return
    }

    const privateKeyError = validatePrivateKey(privateKey)
    if (privateKeyError) {
      setError(privateKeyError)
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onImport(
        name.trim(),
        publicKey.trim().toLowerCase(),
        privateKey.trim().toLowerCase()
      )
      handleClose()
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to import keypair')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setName(`Account ${acc.accounts.length + 1}`)
    setPublicKey('')
    setPrivateKey('')
    setError(null)
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[340px] p-4">
        <DialogHeader>
          <DialogTitle>Import Legacy Keypair</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter account name"
              onKeyDown={handleKeyDown}
            />
          </div>

          <div className="space-y-2">
            <Label>WOTS+ Address (Public Key)</Label>
            <Input
              value={publicKey}
              onChange={handlePublicKeyChange}
              placeholder="Enter WOTS+ address"
              onKeyDown={handleKeyDown}
              className={error && error.includes('WOTS+') ? 'border-destructive' : ''}
            />
          </div>

          <div className="space-y-2">
            <Label>Private Key</Label>
            <Input
              value={privateKey}
              onChange={handlePrivateKeyChange}
              placeholder="Enter private key"
              onKeyDown={handleKeyDown}
              className={error && error.includes('private key') ? 'border-destructive' : ''}
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !name.trim() || !publicKey.trim() || !privateKey.trim() || !!error}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                'Import'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 