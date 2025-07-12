import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Eye, EyeOff, Lock, Loader2, ArrowLeft, AlertCircle, FileJson, Upload } from 'lucide-react'
import { useWallet } from 'mochimo-wallet'
import { log } from "@/lib/utils/logging"
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const logger = log.getLogger("wallet-modal");

interface ImportJsonWalletProps {
    onWalletImported: (wallet: any, jwk: JsonWebKey) => void
    onBack: () => void
}

export function ImportJsonWallet({ onWalletImported, onBack }: ImportJsonWalletProps) {
    const [password, setPassword] = useState('')
    const [file, setFile] = useState<File | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [showPassword, setShowPassword] = useState(false)
    const [isDragging, setIsDragging] = useState(false)
    const w = useWallet()

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(true)
    }, [])

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
    }, [])

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
    }, [])

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault()
        e.stopPropagation()
        setIsDragging(false)
        setError(null)

        const files = Array.from(e.dataTransfer.files)
        if (files.length > 0) {
            const file = files[0]
            if (file.type === 'application/json' || file.name.endsWith('.json')) {
                setFile(file)
            } else {
                setError('Please upload a JSON file')
            }
        }
    }, [])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0]
        if (selectedFile) {
            setFile(selectedFile)
            setError(null)
        }
    }

    const handleImport = async () => {
        if (!file) {
            setError('Please select a backup file')
            return
        }

        try {
            setLoading(true)
            setError(null)

            // Read file content
            const fileContent = await file.text()
            let jsonData: any

            try {
                jsonData = JSON.parse(fileContent)
            } catch (e) {
                setError('Invalid backup file format')
                return
            }

            // Import wallet
            await w.importWalletJSON(jsonData, password)
            const { jwk } = await w.unlockWallet(password)
            if (!jwk) {
                setError('Failed to unlock wallet')
                return
            }
            onWalletImported(w, jwk)
        } catch (error) {
            logger.error('Error importing wallet:', error)
            setError(error instanceof Error ? error.message : 'Failed to import wallet')
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        handleImport()
    }

    return (
        <div className="absolute inset-0 flex flex-col">
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
                <h2 className="font-semibold">Import Backup</h2>
                <div className="w-8" /> {/* Spacer for alignment */}
            </div>

            {/* Main Content - Scrollable */}
            <div className="flex-1 overflow-auto p-4">
                <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
                    {/* Info Message */}
                    <div className="flex items-start gap-2 p-3 bg-blue-500/10 text-blue-500 rounded-lg text-xs">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <p>
                            Restore your wallet from a backup file. You'll need the password used to create the backup.
                        </p>
                    </div>

                    {/* File Upload Area */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Backup File</label>
                        <div
                            className={cn(
                                "border-2 border-dashed rounded-lg p-8 transition-colors",
                                isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25",
                                "relative"
                            )}
                            onDragEnter={handleDragEnter}
                            onDragLeave={handleDragLeave}
                            onDragOver={handleDragOver}
                            onDrop={handleDrop}
                        >
                            <input
                                type="file"
                                accept=".json"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center justify-center gap-2 text-center">
                                <div className="p-3 bg-primary/10 rounded-full">
                                    <Upload className="h-6 w-6 text-primary" />
                                </div>
                                {file ? (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">{file.name}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Click or drag and drop to change file
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium">Drop your backup file here</p>
                                        <p className="text-xs text-muted-foreground">
                                            or click to select file
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Password Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                type={showPassword ? 'text' : 'password'}
                                className="pl-9 pr-9"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value)
                                    setError(null)
                                }}
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Error Message */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="flex items-center gap-2 text-sm text-destructive"
                            >
                                <AlertCircle className="h-4 w-4" />
                                {error}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Import Button */}
                    <Button
                        type="submit"
                        className="w-full"
                        disabled={loading || !file || !password}
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
                </form>
            </div>
        </div>
    )
} 