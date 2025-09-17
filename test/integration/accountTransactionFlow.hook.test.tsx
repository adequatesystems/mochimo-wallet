import { configureStore } from '@reduxjs/toolkit'
import { act, renderHook } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { NetworkProvider } from '../../src/redux/context/NetworkContext'
import { useAccountActivity } from '../../src/redux/hooks/useActivity'
import accountReducer from '../../src/redux/slices/accountSlice'
import transactionReducer from '../../src/redux/slices/transactionSlice'
import walletReducer from '../../src/redux/slices/walletSlice'
import { AppStore } from '../../src/redux/store'
import { WalletTransaction } from '../../src/types/network'

// Avoid pulling ESM deps from actions.
vi.mock('mochimo-mesh-api-client', () => ({
  isValidMemo: vi.fn(() => true),
  TransactionBuilder: class {
    constructor(_baseUrl?: string) {}
  }
}))

describe('Account Transaction Flow (hook style, in-memory, no cache)', () => {
  let store: AppStore
  let mockNetworkService: any

  const account = {
    name: 'Test Account',
    tag: '0'.repeat(40),
    type: 'standard' as const,
    faddress: '0'.repeat(64),
    balance: '1000000',
    index: 0,
    source: 'mnemonic' as const,
    wotsIndex: 0,
    seed: '0'.repeat(64)
  }

  beforeEach(() => {
    mockNetworkService = {
      fetchRecentActivity: vi.fn(),
      fetchConfirmedTransactions: vi.fn(),
      fetchMempoolTransactions: vi.fn()
    }

    NetworkProvider.setNetwork(mockNetworkService)

    store = configureStore({
      reducer: {
        wallet: walletReducer,
        accounts: accountReducer,
        transaction: transactionReducer
      },
      preloadedState: {
        wallet: {
          initialized: true,
          locked: false,
          hasWallet: true,
          network: 'mainnet',
          error: null,
          highestAccountIndex: 0
        },
        accounts: {
          accounts: { [account.tag]: account },
          selectedAccount: account.tag,
          loading: false,
          error: null
        },
        transaction: {
          isLoading: false,
          error: null,
          pendingTransactions: [],
          activity: {
            isLoading: false,
            error: null,
            transactions: [],
            totalCount: 0,
            hasMore: false,
            currentOffset: 0,
            lastFetchOptions: null
          },
          accountActivity: {}
        }
      }
    })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  )

  it('loads pending + top 3 confirmed initially', async () => {
    const now = Date.now()
    const confirmedTxs: WalletTransaction[] = Array.from({ length: 10 }, (_, i) => ({
      type: i % 2 === 0 ? 'receive' : 'send',
      amount: String(100 + i),
      timestamp: now - (600000 + i * 60000),
      address: '0x' + 'a'.repeat(40),
      txid: `confirmed-${i}`,
      blockNumber: 1000 + i,
      pending: false
    }))
    const pendingTxs: WalletTransaction[] = [
      { type: 'send', amount: '50', timestamp: now - 30000, address: '0x' + 'b'.repeat(40), txid: 'pending-1', pending: true },
      { type: 'receive', amount: '75', timestamp: now - 15000, address: '0x' + 'c'.repeat(40), txid: 'pending-2', pending: true }
    ]

    const initial = [...pendingTxs, ...confirmedTxs.slice(0, 3)].sort((a, b) => b.timestamp - a.timestamp)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: initial,
      totalCount: 12,
      hasMore: true,
      nextOffset: 3
    })

    const { result } = renderHook(() => useAccountActivity(account), { wrapper })

    await act(async () => {
      await result.current.fetchAccountActivity({ limit: 3, offset: 0, includeMempool: true, includeConfirmed: true })
    })

    expect(result.current.pendingTransactions.length).toBe(2)
    expect(result.current.confirmedTransactions.length).toBe(3)
    expect(result.current.transactions.length).toBe(5)
    expect(result.current.hasMore).toBe(true)
  })

  it('loads more confirmed on demand', async () => {
    const now = Date.now()
    const confirmedTxs: WalletTransaction[] = Array.from({ length: 10 }, (_, i) => ({
      type: i % 2 === 0 ? 'receive' : 'send',
      amount: String(100 + i),
      timestamp: now - (600000 + i * 60000),
      address: '0x' + 'a'.repeat(40),
      txid: `confirmed-${i}`,
      blockNumber: 1000 + i,
      pending: false
    }))
    const pendingTxs: WalletTransaction[] = [
      { type: 'send', amount: '50', timestamp: now - 30000, address: '0x' + 'b'.repeat(40), txid: 'pending-1', pending: true },
      { type: 'receive', amount: '75', timestamp: now - 15000, address: '0x' + 'c'.repeat(40), txid: 'pending-2', pending: true }
    ]

    const initial = [...pendingTxs, ...confirmedTxs.slice(0, 3)].sort((a, b) => b.timestamp - a.timestamp)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: initial,
      totalCount: 12,
      hasMore: true,
      nextOffset: 3
    })

    const { result } = renderHook(() => useAccountActivity(account), { wrapper })

    await act(async () => {
      await result.current.fetchAccountActivity({ limit: 3, offset: 0, includeMempool: true, includeConfirmed: true })
    })

    const nextBatch = confirmedTxs.slice(3, 6)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: nextBatch,
      totalCount: 12,
      hasMore: true,
      nextOffset: 6
    })

    await act(async () => {
      await result.current.loadMoreAccountActivity({ limit: 3, includeMempool: false })
    })

    expect(result.current.transactions.length).toBe(8)
    expect(result.current.pendingTransactions.length).toBe(2)
    expect(result.current.confirmedTransactions.length).toBe(6)
  })

  it('refreshes and shows newer transactions', async () => {
    const now = Date.now()
    const baseConfirmed: WalletTransaction[] = Array.from({ length: 3 }, (_, i) => ({
      type: i % 2 === 0 ? 'receive' : 'send',
      amount: String(100 + i),
      timestamp: now - (600000 + i * 60000),
      address: '0x' + 'a'.repeat(40),
      txid: `confirmed-${i}`,
      blockNumber: 1000 + i,
      pending: false
    }))
    const basePending: WalletTransaction[] = [
      { type: 'send', amount: '50', timestamp: now - 30000, address: '0x' + 'b'.repeat(40), txid: 'pending-1', pending: true }
    ]

    const initial = [...basePending, ...baseConfirmed].sort((a, b) => b.timestamp - a.timestamp)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: initial,
      totalCount: 4,
      hasMore: false,
      nextOffset: undefined
    })

    const { result } = renderHook(() => useAccountActivity(account), { wrapper })

    await act(async () => {
      await result.current.fetchAccountActivity({ limit: 3, offset: 0, includeMempool: true, includeConfirmed: true })
    })

    // Newer txs
    const newConfirmed: WalletTransaction = { type: 'receive', amount: '200', timestamp: now - 10000, address: '0x' + 'd'.repeat(40), txid: 'confirmed-new', pending: false, blockNumber: 2000 }
    const newPending: WalletTransaction = { type: 'send', amount: '150', timestamp: now - 5000, address: '0x' + 'e'.repeat(40), txid: 'pending-new', pending: true }

    const updated = [newPending, newConfirmed, ...basePending, ...baseConfirmed.slice(0, 2)].sort((a, b) => b.timestamp - a.timestamp)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: updated,
      totalCount: 5,
      hasMore: true,
      nextOffset: 3
    })

    await act(async () => {
      await result.current.fetchAccountActivity({ limit: 3, offset: 0, includeMempool: true, includeConfirmed: true })
    })

    expect(result.current.transactions.length).toBe(5)
    expect(result.current.pendingTransactions.length).toBe(2)
    expect(result.current.confirmedTransactions.length).toBe(3)
    expect(result.current.transactions[0].txid).toBe('pending-new')
  })

  it('loads more while new confirmations arrive, then refresh re-syncs correctly', async () => {
    const now = Date.now()

    // 10 confirmed (older), 2 pending (newer)
    const confirmedTxs: WalletTransaction[] = Array.from({ length: 10 }, (_, i) => ({
      type: i % 2 === 0 ? 'receive' : 'send',
      amount: String(100 + i),
      timestamp: now - (600000 + i * 60000),
      address: '0x' + 'a'.repeat(40),
      txid: `confirmed-${i}`,
      blockNumber: 2000 + i,
      pending: false
    }))
    const pendingTxs: WalletTransaction[] = [
      { type: 'send', amount: '50', timestamp: now - 30000, address: '0x' + 'b'.repeat(40), txid: 'pending-1', pending: true },
      { type: 'receive', amount: '75', timestamp: now - 15000, address: '0x' + 'c'.repeat(40), txid: 'pending-2', pending: true }
    ]

    // Initial: pending + top 3 confirmed
    const initial = [...pendingTxs, ...confirmedTxs.slice(0, 3)].sort((a, b) => b.timestamp - a.timestamp)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: initial,
      totalCount: 12,
      hasMore: true,
      nextOffset: 3
    })

    const { result } = renderHook(() => useAccountActivity(account), { wrapper })

    await act(async () => {
      await result.current.fetchAccountActivity({ limit: 3, offset: 0, includeMempool: true, includeConfirmed: true })
    })

    expect(result.current.transactions.length).toBe(5)
    expect(result.current.pendingTransactions.length).toBe(2)
    expect(result.current.confirmedTransactions.length).toBe(3)

    // While we plan to load more (older items), a NEW confirmed appears (newer than all prior)
    const newlyConfirmed: WalletTransaction = {
      type: 'receive', amount: '999', timestamp: now - 5000, address: '0x' + 'd'.repeat(40), txid: 'confirmed-new', pending: false, blockNumber: 9999
    }

    // loadMore should still return OLDER confirmed (next 3), not the new one
    const nextBatch = confirmedTxs.slice(3, 6)
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: nextBatch,
      totalCount: 12,
      hasMore: true,
      nextOffset: 6
    })

    await act(async () => {
      await result.current.loadMoreAccountActivity({ limit: 3, includeMempool: false })
    })

    // Verify older confirmed appended; new confirmed NOT included yet
    expect(result.current.transactions.length).toBe(8)
    expect(result.current.pendingTransactions.length).toBe(2)
    expect(result.current.confirmedTransactions.length).toBe(6)
    // Top remains pending/newer from initial set
    expect(result.current.transactions[0].txid).toBe('pending-2')

    // Now refresh to pick up the newly confirmed at top (account view keeps only pending + top 3 confirmed)
    const refreshed = [
      newlyConfirmed,
      ...pendingTxs,
      ...confirmedTxs.slice(0, 2) // Keep only 3 confirmed total with newlyConfirmed
    ].sort((a, b) => b.timestamp - a.timestamp)

    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: refreshed,
      totalCount: 5,
      hasMore: true,
      nextOffset: 3
    })

    await act(async () => {
      await result.current.fetchAccountActivity({ limit: 3, offset: 0, includeMempool: true, includeConfirmed: true })
    })

    // After refresh, account view shows pending + top 3 confirmed, with the new one at the very top
    expect(result.current.transactions.length).toBe(5)
    expect(result.current.pendingTransactions.length).toBe(2)
    expect(result.current.confirmedTransactions.length).toBe(3)
    expect(result.current.transactions[0].txid).toBe('confirmed-new')
  })
})


