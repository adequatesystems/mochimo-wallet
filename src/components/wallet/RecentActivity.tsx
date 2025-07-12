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
  pending?: boolean
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


  // Ottimizzato: carica solo nuovi blocchi/transazioni

  const fetchTransactions = async (onlyNew = false) => {
    try {
      setLoadingTransactions(true)
      logger.info('Fetching transactions for account:', account.tag)
      const network = NetworkProvider.getNetwork()
      const currentAddress = "0x" + account.tag;

      if (typeof network.searchTransactionsByAddress !== 'function' || typeof network.getBlock !== 'function' || typeof network.getMempoolTransactions !== 'function') {
        logger.error('searchTransactionsByAddress, getBlock, or getMempoolTransactions is not a function on the current network provider. Assicurati che MeshNetworkService sia usato come provider di rete.')
        setLoadingTransactions(false)
        return
      }

      // Trova il blockNumber massimo già presente
      let maxBlock = 0
      if (onlyNew && transactions.length > 0) {
        maxBlock = Math.max(...transactions.map(t => t.blockNumber || 0))
      }

      // Chiedi solo transazioni con blockNumber > maxBlock se onlyNew
      const txResult = await network.searchTransactionsByAddress(currentAddress, onlyNew ? { limit: 20, min_block: maxBlock + 1 } : { limit: 20 })
      if (!txResult || !Array.isArray(txResult.transactions)) {
        logger.error('Invalid transaction data format', txResult)
        setLoadingTransactions(false)
        return
      }

      const feeByBlock: Record<string, { fee: bigint, timestamp: number, blockNumber: number }> = {}
      const sendReceiveTxs: Transaction[] = []

      for (const tx of txResult.transactions) {
        if (!tx.transaction_identifier?.hash || !tx.operations || !tx.block_identifier?.index) {
          logger.warn('Skipping transaction with incomplete data', tx)
          continue
        }
        const blockId = tx.block_identifier?.index.toString()
        const blockNumber = tx.block_identifier?.index
        const timestamp = tx.timestamp || Date.now()

        // Se il blocco è già presente, salta (solo se onlyNew)
        if (onlyNew && blockNumber <= maxBlock) continue

        // SEND
        const sendOps = tx.operations.filter((op: any) =>
          (op.type === 'SOURCE_TRANSFER') &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        for (const sendOp of sendOps) {
          const destOps = tx.operations.filter((op: any) => op.type === 'DESTINATION_TRANSFER')
          for (const destOp of destOps) {
            sendReceiveTxs.push({
              type: 'send',
              amount: destOp.amount?.value || '0',
              timestamp: timestamp,
              address: destOp.account?.address,
              txid: tx.transaction_identifier?.hash,
              blockNumber: blockNumber
            })
          }
        }

        // RECEIVE
        const recvOps = tx.operations.filter((op: any) =>
          (op.type === 'DESTINATION_TRANSFER') &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        for (const recvOp of recvOps) {
          const sourceOp = tx.operations.find((op: any) => op.type === 'SOURCE_TRANSFER')
          sendReceiveTxs.push({
            type: 'receive',
            amount: recvOp.amount?.value || '0',
            timestamp: timestamp,
            address: sourceOp ? sourceOp.account?.address : 'Unknown',
            txid: tx.transaction_identifier?.hash,
            blockNumber: blockNumber
          })
        }

        // FEE
        const feeOps = tx.operations.filter((op: any) =>
          op.type === 'FEE' &&
          op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
        )
        for (const feeOp of feeOps) {
          try {
            const value = feeOp.amount?.value || '0'
            if (!feeByBlock[blockId]) {
              feeByBlock[blockId] = { fee: BigInt(0), timestamp, blockNumber }
            }
            feeByBlock[blockId].fee += BigInt(value)
          } catch (error) {
            logger.error('Error processing fee operation:', error)
          }
        }
      }

      // Per ogni nuovo blocco con FEE, carica il block e somma FEE+REWARD
      const miningTxs: Transaction[] = []
      for (const [blockId, data] of Object.entries(feeByBlock)) {
        try {
          const blockRes = await network.getBlock({ index: data.blockNumber })
          const block = blockRes?.block
          if (!block || !Array.isArray(block.transactions)) continue
          let reward = BigInt(0)
          for (const btx of block.transactions) {
            if (!Array.isArray(btx.operations)) continue
            for (const op of btx.operations) {
              if (op.type === 'REWARD' && op.account?.address?.toLowerCase() === currentAddress.toLowerCase()) {
                reward += BigInt(op.amount?.value || '0')
              }
            }
          }
          const total = data.fee + reward
          if (total > BigInt(0)) {
            miningTxs.push({
              type: 'mining',
              amount: total.toString(),
              timestamp: data.timestamp,
              address: 'Mining Reward',
              txid: blockId,
              blockNumber: data.blockNumber
            })
          }
        } catch (error) {
          logger.error('Error fetching block or processing reward:', error)
        }
      }

      // --- MEMPOOL ---
      const mempoolTxs: Transaction[] = []
      try {
        const mempoolRes = await network.getMempoolTransactions()
        if (mempoolRes && Array.isArray(mempoolRes.transactions)) {
          for (const tx of mempoolRes.transactions) {
            if (!tx.transaction_identifier?.hash || !tx.operations) continue
            const timestamp = tx.timestamp || Date.now()
            // Outgoing
            const sendOps = tx.operations.filter((op: any) =>
              (op.type === 'SOURCE_TRANSFER') &&
              op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
            )
            for (const sendOp of sendOps) {
              const destOps = tx.operations.filter((op: any) => op.type === 'DESTINATION_TRANSFER')
              for (const destOp of destOps) {
                mempoolTxs.push({
                  type: 'send',
                  amount: destOp.amount?.value || '0',
                  timestamp,
                  address: destOp.account?.address,
                  txid: tx.transaction_identifier?.hash,
                  pending: true
                })
              }
            }
            // Incoming
            const recvOps = tx.operations.filter((op: any) =>
              (op.type === 'DESTINATION_TRANSFER') &&
              op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
            )
            for (const recvOp of recvOps) {
              const sourceOp = tx.operations.find((op: any) => op.type === 'SOURCE_TRANSFER')
              mempoolTxs.push({
                type: 'receive',
                amount: recvOp.amount?.value || '0',
                timestamp,
                address: sourceOp ? sourceOp.account?.address : 'Unknown',
                txid: tx.transaction_identifier?.hash,
                pending: true
              })
            }
          }
        }
      } catch (error) {
        logger.error('Error fetching mempool transactions:', error)
      }

      // Aggiorna solo con i nuovi
      let allTxs: Transaction[] = []
      if (onlyNew) {
        allTxs = [...transactions, ...sendReceiveTxs, ...miningTxs, ...mempoolTxs]
      } else {
        allTxs = [...sendReceiveTxs, ...miningTxs, ...mempoolTxs]
      }
      allTxs.sort((a, b) => b.timestamp - a.timestamp)
      setTransactions(allTxs)
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
    fetchTransactions(true)
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
            tx.type === 'receive' ? "bg-green-500/10" : "bg-blue-500/10",
            tx.pending ? "border-2 border-yellow-400" : ""
          )}>
            {tx.type === 'send' ? (
              <Send className={cn("h-3.5 w-3.5", tx.pending ? "text-yellow-500" : "text-red-500")} />
            ) : tx.type === 'receive' ? (
              <Coins className={cn("h-3.5 w-3.5", tx.pending ? "text-yellow-500" : "text-green-500")} />
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
                      {tx.pending && (
                        <span className="ml-2 text-xs text-yellow-500 font-semibold">(pending)</span>
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
                    tx.type === 'send' ? (tx.pending ? "text-yellow-500" : "text-red-500") : (tx.pending ? "text-yellow-500" : "text-green-500")
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
