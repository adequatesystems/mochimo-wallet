import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Clock, Coins, RefreshCcw, Send, Tag as TagIcon } from 'lucide-react'
import { Account, NetworkProvider, useNetwork } from 'mochimo-wallet' 
import { motion } from 'framer-motion' 
import { cn } from '@/lib/utils'
import { env } from '@/config/env'
import { log } from '@/lib/utils/logging'

const logger = log.getLogger("wallet");

// Transaction interface for recent activity
interface Transaction {
  type: 'send' | 'receive' | 'mining'
  amount: string
  timestamp: number
  address: string
  txid?: string
  blockNumber?: number
}

interface RecentActivityProps {
  account: Account
  onRefresh?: () => void
}

export function RecentActivity({ account, onRefresh }: RecentActivityProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const network = useNetwork()

  // Format balance to MCM with better readability
  const formatBalance = (balanceStr: string | null): string => {
    if (!balanceStr) return '0'
    try {
      const balance = BigInt(balanceStr)
      const whole = balance / BigInt(1e9)
      const fraction = (balance % BigInt(1e9)).toString().padStart(9, '0')
      const fractionFormatted = fraction.replace(/0+$/, '') // Remove trailing zeros
      return fractionFormatted ? `${whole}.${fractionFormatted}` : `${whole}`
    } catch (error) {
      logger.error('Error formatting balance:', error, balanceStr)
      return balanceStr
    }
  }

  // Fetch account transactions and parse them into our Transaction type
  const fetchTransactions = async () => {
    try {
      setLoadingTransactions(true)
      logger.info('Fetching transactions for account:', account.tag)
      const network = NetworkProvider.getNetwork()

      // Usa l'indirizzo dell'account corrente
      //const currentAddress = "0x" + account.tag;
        const currentAddress = "0xbc3d128f41aa7a4097b7c0176999adb104758b0b";
      if (typeof network.searchTransactionsByAddress !== 'function') {
        logger.error('searchTransactionsByAddress is not a function on the current network provider. Assicurati che MeshNetworkService sia usato come provider di rete.')
        setLoadingTransactions(false)
        return
      }
      
      const txResult = await network.searchTransactionsByAddress(currentAddress, { limit: 20 })
      if (!txResult || !Array.isArray(txResult.transactions)) {
        logger.error('Invalid transaction data format', txResult)
        setLoadingTransactions(false)
        return
      }
      
      const processedTransactions: Transaction[] = []
      
      // Raggruppa le operazioni per blocco per aggregare i mining rewards
      const blockRewards: Record<string, { rewards: bigint, timestamp: number, blockNumber: number }> = {}
      
      for (const tx of txResult.transactions) {
        // Verifica che abbiamo le informazioni necessarie
        if (!tx.transaction_identifier?.hash || !tx.operations || !tx.block_identifier?.index) {
          logger.warn('Skipping transaction with incomplete data', tx)
          continue
        }
        
        const blockId = tx.block_identifier?.index.toString()
        const timestamp = tx.timestamp || Date.now()
        
        // SEND: tutte le operazioni dove l'utente è sender
        const sendOps = tx.operations.filter((op: any) =>
          (op.type === 'SOURCE_TRANSFER') &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        
        for (const sendOp of sendOps) {
          // Trova tutte le destinazioni per questa transazione
          const destOps = tx.operations.filter((op: any) => op.type === 'DESTINATION_TRANSFER')
          for (const destOp of destOps) {
            processedTransactions.push({
              type: 'send',
              amount: destOp.amount?.value || '0',
              timestamp: timestamp,
              address: destOp.account?.address,
              txid: tx.transaction_identifier?.hash,
              blockNumber: tx.block_identifier?.index
            })
          }
        }

        // RECEIVE: tutte le operazioni dove l'utente è receiver
        const recvOps = tx.operations.filter((op: any) =>
          (op.type === 'DESTINATION_TRANSFER') &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        
        for (const recvOp of recvOps) {
          const sourceOp = tx.operations.find((op: any) => op.type === 'SOURCE_TRANSFER')
          processedTransactions.push({
            type: 'receive',
            amount: recvOp.amount?.value || '0',
            timestamp: timestamp,
            address: sourceOp ? sourceOp.account?.address : 'Unknown',
            txid: tx.transaction_identifier?.hash,
            blockNumber: tx.block_identifier?.index
          })
        }

        // Raccoglie sia FEE che REWARD per blocco
        // FEE operations - commissioni di transazioni
        const feeOps = tx.operations.filter((op: any) =>
          op.type === 'FEE' &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        
        for (const feeOp of feeOps) {
          try {
            const value = feeOp.amount?.value || '0'
            const blockNumber = tx.block_identifier?.index
            
            // Aggiungi al totale per questo blocco
            if (!blockRewards[blockId]) {
              blockRewards[blockId] = { rewards: BigInt(0), timestamp, blockNumber }
            }
            
            blockRewards[blockId].rewards += BigInt(value)
          } catch (error) {
            logger.error('Error processing fee operation:', error)
          }
        }
        
        // REWARD operations - premi di mining del blocco
        const rewardOps = tx.operations.filter((op: any) =>
          op.type === 'REWARD' &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        
        for (const rewardOp of rewardOps) {
          try {
            const value = rewardOp.amount?.value || '0'
            const blockNumber = tx.block_identifier?.index
            
            // Aggiungi al totale per questo blocco
            if (!blockRewards[blockId]) {
              blockRewards[blockId] = { rewards: BigInt(0), timestamp, blockNumber }
            }
            
            blockRewards[blockId].rewards += BigInt(value)
          } catch (error) {
            logger.error('Error processing reward operation:', error)
          }
        }
      }
      
      // Aggiungi le ricompense di mining aggregate ai risultati
      for (const [blockId, data] of Object.entries(blockRewards)) {
        if (data.rewards > BigInt(0)) {
          processedTransactions.push({
            type: 'mining',
            amount: data.rewards.toString(),
            timestamp: data.timestamp,
            address: 'Mining Reward',
            txid: blockId, // Usa il blockId come txid per questi aggregati
            blockNumber: data.blockNumber
          })
        }
      }
      
      processedTransactions.sort((a, b) => b.timestamp - a.timestamp)
      setTransactions(processedTransactions)
    } catch (error) {
      logger.error('Error fetching transactions:', error)
    } finally {
      setLoadingTransactions(false)
    }
  }

  // Fetch transactions when the component mounts or when the account changes
  useEffect(() => {
    if (account && account.tag) {
      fetchTransactions()
    }
  }, [account.tag, network.blockHeight])

  // Handle refresh button
  const handleRefresh = () => {
    fetchTransactions()
    if (onRefresh) onRefresh()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
      className="bg-card rounded-xl border-2 border-border/50"
    >
      <div className="p-4 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-foreground">Recent Activity</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs hover:text-primary hover:bg-primary/10"
          onClick={handleRefresh}
          disabled={loadingTransactions}
        >
          {loadingTransactions ? (
            <>
              <RefreshCcw className="h-3 w-3 mr-1 animate-spin" />
              Refreshing...
            </>
          ) : (
            'Refresh'
          )}
        </Button>
      </div>
      
      {/* Transactions list */}
      <div className="divide-y divide-border/50">
        {loadingTransactions && transactions.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <RefreshCcw className="h-5 w-5 animate-spin mx-auto mb-2" />
            <p>Loading transactions...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground">
            <p>No transactions found</p>
            <p className="text-xs mt-1">Transactions will appear here once you send or receive MCM</p>
          </div>
        ) : (
          transactions.slice(0, 5).map((tx, index) => (
            <div key={tx.txid || index} className="p-4 hover:bg-muted/20 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "p-2 rounded-full shrink-0",
                    tx.type === 'send' ? "bg-red-500/10" : 
                    tx.type === 'receive' ? "bg-green-500/10" : "bg-blue-500/10"
                  )}>
                    {tx.type === 'send' ? (
                      <Send className="h-3.5 w-3.5 text-red-500" />
                    ) : tx.type === 'receive' ? (
                      <Coins className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <TagIcon className="h-3.5 w-3.5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {tx.type === 'send' ? 'Sent to ' : 
                       tx.type === 'receive' ? 'Received from ' : 'Mining Reward'}
                      {tx.type !== 'mining' && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {tx.address.substring(0, 6)}...{tx.address.substring(tx.address.length - 4)}
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(tx.timestamp).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={cn(
                    "font-mono font-medium",
                    tx.type === 'send' ? "text-red-500" : "text-green-500"
                  )}>
                    {tx.type === 'send' ? '-' : '+'}{formatBalance(tx.amount)} MCM
                  </p>
                  {tx.blockNumber && (
                    <p className="text-xs text-muted-foreground">
                      Block #{tx.blockNumber}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </motion.div>
  )
}
