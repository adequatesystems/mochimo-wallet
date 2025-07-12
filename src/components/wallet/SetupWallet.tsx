import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useWallet } from 'mochimo-wallet'


export function SetupWallet() {
  const [step, setStep] = useState<'password' | 'confirm' | 'mnemonic'>('password')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [wallet, setWallet] = useState<any>(null)

  const w = useWallet()
  const handleCreateWallet = async () => {
    try {
      if (password.length < 8) {
        setError('Password must be at least 8 characters')
        return
      }

      if (step === 'password') {
        setStep('confirm')
        return
      }

      if (step === 'confirm') {
        if (password !== confirmPassword) {
          setError('Passwords do not match')
          return
        }

        // Create new wallet
        const newWallet = await w.createWallet(password)
        setWallet(newWallet)
        
        
        setStep('mnemonic')
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create wallet')
    }
  }

  if (step === 'mnemonic' && wallet) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-bold">Backup Your Recovery Phrase</h2>
        <p className="text-sm text-gray-500">
          Write down these 24 words in order and keep them safe. You'll need them to recover your wallet.
        </p>
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm font-mono break-all">{wallet.mnemonic}</p>
        </div>
        <Button onClick={() => window.location.reload()}>
          I've Saved My Recovery Phrase
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">
        {step === 'password' ? 'Create Password' : 'Confirm Password'}
      </h2>
      <div className="space-y-2">
        <Input
          type="password"
          placeholder={step === 'password' ? 'Enter password' : 'Confirm password'}
          value={step === 'password' ? password : confirmPassword}
          onChange={(e) => {
            setError(null)
            if (step === 'password') {
              setPassword(e.target.value)
            } else {
              setConfirmPassword(e.target.value)
            }
          }}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>
      <Button onClick={handleCreateWallet} className="w-full">
        {step === 'password' ? 'Continue' : 'Create Wallet'}
      </Button>
    </div>
  )
} 