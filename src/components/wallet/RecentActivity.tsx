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
  fee?: string // solo per send
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
        maxBlock = Math.max(...transactions.map(t => t.blockNumber || 0).filter(b => b > 0))
      }

      // Array per i diversi tipi di transazioni
      let sendReceiveTxs: Transaction[] = []
      let miningTxs: Transaction[] = []
      let mempoolTxs: Transaction[] = []
      let feeByBlock: Record<string, { fee: bigint, timestamp: number, blockNumber: number }> = {}
      let confirmedError = false
      
      // --- STEP 1: FETCH CONFIRMED TRANSACTIONS ---
      await fetchConfirmedTransactions()
      
      // --- STEP 2: FETCH MEMPOOL TRANSACTIONS ---
      // Sempre eseguito, anche se fetchConfirmedTransactions fallisce
      await fetchMempool()
      
      // --- STEP 3: UPDATE STATE ---
      updateTransactionState()
      
      // ------------- FUNZIONI INTERNE -------------
      
      // Funzione per recuperare le transazioni confermate
      async function fetchConfirmedTransactions() {
        try {
          logger.info(`Fetching confirmed transactions for ${currentAddress}, onlyNew=${onlyNew}, maxBlock=${maxBlock}`)
          const txResult = await network.searchTransactionsByAddress(currentAddress, { limit: 20 })
          if (!txResult || !Array.isArray(txResult.transactions)) {
            logger.error('Invalid transaction data format', txResult)
            confirmedError = true
            return
          }
          
          logger.info(`Found ${txResult.transactions.length} confirmed transactions`)
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

            // Prendi la fee totale dalla metadata
            let feeTotal = BigInt(0)
            if (tx.metadata && tx.metadata.fee_total) {
              feeTotal = BigInt(tx.metadata.fee_total)
            }

            // SEND: mostra solo i destinatari validi (no change)
            const sendOps = tx.operations.filter((op: any) =>
              (op.type === 'SOURCE_TRANSFER') &&
              op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
            )
            for (const sendOp of sendOps) {
              // Destinatari validi: DESTINATION_TRANSFER dove l'indirizzo NON è uguale al sender
              const senderAddress = sendOp.account?.address?.toLowerCase()
              const destOps = tx.operations.filter((op: any) =>
                op.type === 'DESTINATION_TRANSFER' &&
                op.account?.address?.toLowerCase() !== senderAddress
              )
              // Fee per destinatario
              const feePerDest = destOps.length > 0 ? (feeTotal / BigInt(destOps.length)) : BigInt(0)
              for (const destOp of destOps) {
                sendReceiveTxs.push({
                  type: 'send',
                  amount: destOp.amount?.value || '0',
                  timestamp: timestamp,
                  address: destOp.account?.address,
                  txid: tx.transaction_identifier?.hash,
                  blockNumber: blockNumber,
                  pending: false,
                  fee: feePerDest.toString()
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
              // Mostra solo se il sender è diverso dal destinatario
              if (sourceOp && sourceOp.account?.address?.toLowerCase() !== currentAddress.toLowerCase()) {
                sendReceiveTxs.push({
                  type: 'receive',
                  amount: recvOp.amount?.value || '0',
                  timestamp: timestamp,
                  address: sourceOp ? sourceOp.account?.address : 'Unknown',
                  txid: tx.transaction_identifier?.hash,
                  blockNumber: blockNumber
                })
              }
            }
          }
          
          // Per ogni nuovo blocco con FEE, carica il block e somma FEE+REWARD
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
        } catch (error) {
          logger.error('Error fetching confirmed transactions:', error)
          confirmedError = true
        }
      }
      
      // Funzione per recuperare le transazioni in mempool
      async function fetchMempool() {
        try {
          logger.info('Checking mempool for address:', currentAddress)
          const mempoolRes = await network.getMempoolTransactions()
          logger.info(`Mempool response contains ${mempoolRes?.transactions?.length || 0} transactions`)
          
          if (mempoolRes && Array.isArray(mempoolRes.transactions)) {
            for (const tx of mempoolRes.transactions) {
              if (!tx.transaction_identifier?.hash || !tx.operations) continue
              const timestamp = tx.timestamp || Date.now()
              const txid = tx.transaction_identifier?.hash
              
              // Verifica se questa tx ha operazioni rilevanti per questo indirizzo
              const hasRelevantOps = tx.operations.some(op => 
                op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
              )
              
              if (!hasRelevantOps) continue
              
              logger.info(`Found mempool tx ${txid} relevant to ${currentAddress}`)
              
              // Outgoing: QUANDO SIAMO NOI IL SOURCE_TRANSFER
              const sendOps = tx.operations.filter((op: any) =>
                (op.type === 'SOURCE_TRANSFER') &&
                op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
              )
              
              for (const sendOp of sendOps) {
                // Filtra per mostrare solo le destinazioni che non sono noi stessi (no change)
                const destOps = tx.operations.filter((op: any) => 
                  op.type === 'DESTINATION_TRANSFER' &&
                  op.account?.address?.toLowerCase() !== currentAddress.toLowerCase()
                )
                
                for (const destOp of destOps) {
                  // Aggiungi ogni destinazione come send
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
              
              // Incoming: QUANDO SIAMO NOI IL DESTINATION_TRANSFER
              const recvOps = tx.operations.filter((op: any) =>
                (op.type === 'DESTINATION_TRANSFER') &&
                op.account?.address?.toLowerCase() === currentAddress.toLowerCase()
              )
              
              for (const recvOp of recvOps) {
                const sourceOp = tx.operations.find((op: any) => op.type === 'SOURCE_TRANSFER')
                if (sourceOp && sourceOp.account?.address?.toLowerCase() !== currentAddress.toLowerCase()) {
                  // Aggiungi come receive solo se non è una transazione da noi a noi
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
          }
          logger.info(`Found ${mempoolTxs.length} pending transactions in mempool for address ${currentAddress}`)
        } catch (error) {
          logger.error('Error fetching mempool transactions:', error)
        }
      }
      
      // Funzione per aggiornare lo stato delle transazioni
      function updateTransactionState() {
        let allTxs: Transaction[] = []
        
        if (onlyNew) {
          // Filtra le transazioni esistenti per rimuovere quelle in mempool (che potrebbero essere state confermate)
          const existingConfirmedTxs = transactions.filter(t => !t.pending)
          allTxs = [...existingConfirmedTxs, ...sendReceiveTxs, ...miningTxs, ...mempoolTxs]
        } else {
          allTxs = [...sendReceiveTxs, ...miningTxs, ...mempoolTxs]
        }
        
        // Se ci sono errori con le transazioni confermate ma abbiamo transazioni nella mempool,
        // mostra comunque quelle della mempool
        if (confirmedError && sendReceiveTxs.length === 0 && miningTxs.length === 0) {
          logger.info(`Using only mempool transactions due to error with confirmed transactions`)
          // Non sovrascrivere se ci sono transazioni valide
          if (allTxs.length === 0 || (allTxs.every(t => t.pending))) {
            allTxs = [...mempoolTxs]
          }
        }
        
        // Ordina per timestamp (più recente prima)
        allTxs.sort((a, b) => b.timestamp - a.timestamp)
        logger.info(`Total transactions after update: ${allTxs.length} (${allTxs.filter(t => t.pending).length} pending)`)
        setTransactions(allTxs)
      }
    } catch (error) {
      logger.error('Error in fetchTransactions:', error)
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
                    {tx.type === 'send' && tx.fee && (
                      <span className="ml-1 text-xs text-muted-foreground">(fee: {formatBalance(tx.fee)})</span>
                    )}
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
