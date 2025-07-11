import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Eye, EyeOff, Lock, Loader2, ArrowLeft, AlertCircle } from 'lucide-react'
import { MasterSeed, useWallet, useAccounts } from 'mochimo-wallet'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet-modal");

interface ImportWalletProps {
  onWalletImported: (wallet: any, jwk: JsonWebKey) => void
  onBack: () => void
}

export function ImportWallet({ onWalletImported, onBack }: ImportWalletProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [mnemonic, setMnemonic] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const w = useWallet()
  const acc = useAccounts()

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!mnemonic.trim()) {
      setError('Please enter your recovery phrase')
      return
    }

    try {
      setLoading(true)
      // Create and unlock wallet
      const wallet = await w.createWallet(password, mnemonic)
      const { jwk } = await w.unlockWallet(password)
      if (!jwk) {
        throw new Error('Failed to unlock wallet')
      }
      // Create first 5 accounts
      let firstTag = ''
      for (let i = 0; i < 5; i++) {
        const a = await acc.createAccount(`Account ${i + 1}`)
        if (!firstTag) firstTag = a.tag
      }

      // Set first account as selected
      acc.setSelectedAccount(firstTag)

      onWalletImported(wallet, jwk)
    } catch (error) {
      logger.error('Error importing wallet:', error)
      setError('Invalid recovery phrase')
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onBack}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold">Import Wallet</h2>
        <div className="w-8" />
      </div>

      {/* Main Content - Scrollable */}
      <div className="flex-1 overflow-auto p-4">
        <form onSubmit={handleImport} className="space-y-4">
          {/* Info Message */}
          <div className="flex items-start gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-lg text-xs">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>
              The first 5 accounts will be created automatically. Additional accounts can be added later using the "Add Account" feature.
            </p>
          </div>

          {/* Recovery Phrase */}
          <div className="space-y-2">
            <label className="text-xs font-medium">
              Recovery Phrase
            </label>
            <Textarea
              value={mnemonic}
              onChange={(e) => setMnemonic(e.target.value)}
              placeholder="Enter your 24-word recovery phrase"
              rows={3}
              className="text-sm resize-none"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-2">
              <Lock className="h-3 w-3" />
              Password
            </label>
            <div className="relative">
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-8 h-8 text-sm"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-3 w-3" />
                ) : (
                  <Eye className="h-3 w-3" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-2">
            <label className="text-xs font-medium flex items-center gap-2">
              <Lock className="h-3 w-3" />
              Confirm Password
            </label>
            <Input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-8 text-sm"
              placeholder="Confirm password"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-xs text-red-500 text-center">
              {error}
            </div>
          )}
        </form>
      </div>

      {/* Fixed Footer */}
      <div className="p-4 border-t">
        <Button
          onClick={handleImport}
          className="w-full"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing...
            </>
          ) : (
            'Import Wallet'
          )}
        </Button>
      </div>
    </div>
  )
} 