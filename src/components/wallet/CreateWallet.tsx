import { useState } from 'react'
import { usePlatform } from '@/lib/utils/usePlatform'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Logo } from '../ui/logo'
import { MasterSeed, useAccounts, useWallet } from 'mochimo-wallet'
import { MnemonicBackup } from './MnemonicBackup'
import { log } from "@/lib/utils/logging"
const logger = log.getLogger("wallet");

interface CreateWalletProps {
  onWalletCreated: (wallet: any, jwk: JsonWebKey) => void
}

export function CreateWallet({ onWalletCreated }: CreateWalletProps) {
  const { isMobile, safeAreaInsets } = usePlatform();
  const [step, setStep] = useState<'password' | 'backup'>('password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [masterSeed, setMasterSeed] = useState<MasterSeed | null>(null)
  const [mnemonic, setMnemonic] = useState<string>('')

  const w = useWallet()
  const ac = useAccounts()
  const handleCreateWallet = async (e: React.FormEvent) => {
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

    try {
      setLoading(true)
      const ms = await MasterSeed.create()
      setMasterSeed(ms)
      setMnemonic(await ms.toPhrase())
      setStep('backup')
    } catch (error) {
      logger.error('Error creating wallet:', error)
      setError('Failed to create wallet')
    } finally {
      setLoading(false)
    }
  }

  const handleBackupComplete = async () => {
    try {
      setLoading(true)
      if (!masterSeed) throw new Error('No master seed')

      const wallet = await w.createWallet(password, await masterSeed.toPhrase())

      const { jwk } = await w.unlockWallet(password)
      if (!jwk) throw new Error('Failed to unlock wallet')
      //create a first account
      const a = await ac.createAccount("Account 1")
      ac.setSelectedAccount(a.tag)
      onWalletCreated(wallet, jwk)
    } catch (error) {
      logger.error('Error saving wallet:', error)
      setError('Failed to save wallet')
      setLoading(false)
    }
  }

  const handleRefreshMnemonic = async () => {
    try {
      setLoading(true)
      if (masterSeed) masterSeed.lock()
      const ms = await MasterSeed.create()
      setMasterSeed(ms)
      setMnemonic(await ms.toPhrase())
    } catch (error) {
      logger.error('Error regenerating mnemonic:', error)
      setError('Failed to generate new recovery phrase')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'backup') {
    return (
      <MnemonicBackup
        mnemonic={mnemonic}
        onComplete={handleBackupComplete}
        onBack={() => setStep('password')}
        onRefreshMnemonic={handleRefreshMnemonic}
      />
    )
  }

  return (
    <div
      className={
        isMobile
          ? 'flex flex-col items-center min-h-full pt-8 px-4' // align to top with margin
          : 'flex flex-col items-center justify-center min-h-full p-8' // center on web
      }
      style={isMobile ? { paddingTop: safeAreaInsets.top ? safeAreaInsets.top + 16 : 32 } : {}}
    >
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="flex flex-col items-center space-y-4">
          <Logo size="lg" animated />
          <h1 className="text-2xl font-bold text-center">Create New Wallet</h1>
          <p className="text-sm text-muted-foreground text-center">
            Set a strong password to protect your wallet. Make sure to remember it as it cannot be recovered.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleCreateWallet} className="space-y-6">
          <div className="space-y-4">
            {/* Password Input */}
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password Input */}
            <div className="space-y-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-4 w-4" />
                Confirm Password
              </label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pr-10"
                  placeholder="Confirm your password"
                />
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={loading}
          >
            {loading ? 'Creating Wallet...' : 'Create Wallet'}
          </Button>
        </form>
      </div>
    </div>
  )
} 