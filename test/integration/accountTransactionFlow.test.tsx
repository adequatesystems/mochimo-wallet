import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { Provider } from 'react-redux';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { NetworkProvider } from '../../src/redux/context/NetworkContext';
import { useAccountActivity } from '../../src/redux/hooks/useActivity';
import accountReducer from '../../src/redux/slices/accountSlice';
import networkReducer from '../../src/redux/slices/networkSlice';
import transactionReducer from '../../src/redux/slices/transactionSlice';
import walletReducer from '../../src/redux/slices/walletSlice';

// Mock mochimo-mesh-api-client to avoid ESM issues
vi.mock('mochimo-mesh-api-client', () => ({
  isValidMemo: vi.fn(() => true),
  TransactionBuilder: class {
    constructor(_baseUrl?: string) {}
    async buildAndSignTransaction() {
      return { submitResult: { transaction_identifier: { hash: '0xtest' } } } as any;
    }
  }
}));

// Test component that uses the hook
const TestAccountTransactionList: React.FC<{ account: any }> = ({ account }) => {
  const {
    transactions,
    isLoading,
    error,
    hasMore,
    fetchAccountActivity,
    loadMoreAccountActivity,
    pendingTransactions,
    confirmedTransactions
  } = useAccountActivity(account);

  React.useEffect(() => {
    if (account) {
      // Simulate account view: top 3 confirmed + all pending
      fetchAccountActivity({ 
        limit: 3, 
        offset: 0, 
        includeMempool: true, 
        includeConfirmed: true 
      });
    }
  }, [account?.tag, fetchAccountActivity]);

  const handleLoadMore = () => {
    loadMoreAccountActivity({ 
      limit: 3, 
      includeMempool: false // Only load more confirmed, not pending
    });
  };

  if (isLoading && transactions.length === 0) {
    return <div data-testid="loading">Loading transactions...</div>;
  }

  if (error) {
    return <div data-testid="error">Error: {error}</div>;
  }

  return (
    <div data-testid="transaction-list">
      <div data-testid="summary">
        <span data-testid="total-count">Total: {transactions.length}</span>
        <span data-testid="pending-count">Pending: {pendingTransactions.length}</span>
        <span data-testid="confirmed-count">Confirmed: {confirmedTransactions.length}</span>
      </div>
      
      <div data-testid="transactions">
        {transactions.map((tx: any, index: number) => (
          <div key={`${tx.txid}-${index}`} data-testid={`transaction-${index}`}>
            <span data-testid={`tx-id-${index}`}>{tx.txid}</span>
            <span data-testid={`tx-status-${index}`}>{tx.pending ? 'pending' : 'confirmed'}</span>
            <span data-testid={`tx-amount-${index}`}>{tx.amount}</span>
            <span data-testid={`tx-timestamp-${index}`}>{tx.timestamp}</span>
          </div>
        ))}
      </div>

      {hasMore && (
        <button 
          data-testid="load-more" 
          onClick={handleLoadMore}
          disabled={isLoading}
        >
          {isLoading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};

describe('Account Transaction Flow Integration', () => {
  let store: any;
  let mockNetworkService: any;
  
  const testAccount = {
    name: 'Test Account',
    tag: '0'.repeat(40),
    type: 'standard' as const,
    faddress: '0'.repeat(64),
    balance: '1000000',
    index: 0,
    source: 'mnemonic' as const,
    wotsIndex: 0,
    seed: '0'.repeat(64)
  };

  // Helper to create transactions with timestamps
  const createTransaction = (id: string, pending: boolean, timestamp: number, amount: string = '100') => ({
    txid: id,
    pending,
    amount,
    timestamp,
    address: '0x' + 'a'.repeat(40),
    type: pending ? 'send' : 'receive',
    blockNumber: pending ? undefined : Math.floor(timestamp / 1000)
  });

  beforeEach(() => {
    store = configureStore({
      reducer: {
        wallet: walletReducer,
        accounts: accountReducer,
        network: networkReducer,
        transaction: transactionReducer
      },
      preloadedState: {
        accounts: {
          accounts: { [testAccount.tag]: testAccount },
          selectedAccount: testAccount.tag,
          isLoading: false,
          error: null
        }
      }
    });

    mockNetworkService = {
      fetchRecentActivity: vi.fn(),
      fetchConfirmedTransactions: vi.fn(),
      fetchMempoolTransactions: vi.fn()
    };

    NetworkProvider.setNetwork(mockNetworkService);
  });

  it('should show top 3 confirmed + all pending transactions initially', async () => {
    // Setup: 10 confirmed transactions (oldest first by timestamp) + 2 pending (newest)
    const now = Date.now();
    const confirmedTxs = Array.from({ length: 10 }, (_, i) => 
      createTransaction(`confirmed-${i}`, false, now - (600000 + i * 60000), `${100 + i}`) // much older
    );
    const pendingTxs = [
      createTransaction('pending-1', true, now - 30000, '50'),
      createTransaction('pending-2', true, now - 15000, '75') // newest
    ];

    // Mock API response: top 3 confirmed + all pending (sorted by timestamp desc)
    const expectedTransactions = [...pendingTxs, ...confirmedTxs.slice(0, 3)]
      .sort((a, b) => b.timestamp - a.timestamp);

    mockNetworkService.fetchRecentActivity.mockResolvedValue({
      transactions: expectedTransactions,
      totalCount: 12, // 10 confirmed + 2 pending
      hasMore: true, // More confirmed transactions available
      nextOffset: 3
    });

    render(
      <Provider store={store}>
        <TestAccountTransactionList account={testAccount} />
      </Provider>
    );

    // Should show loading initially
    expect(screen.getByTestId('loading')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
    });

    // Verify correct number of transactions
    expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 5'); // 2 pending + 3 confirmed
    expect(screen.getByTestId('pending-count')).toHaveTextContent('Pending: 2');
    expect(screen.getByTestId('confirmed-count')).toHaveTextContent('Confirmed: 3');

    // Verify transactions are in correct order (newest first)
    expect(screen.getByTestId('tx-id-0')).toHaveTextContent('pending-2'); // newest pending
    expect(screen.getByTestId('tx-id-1')).toHaveTextContent('pending-1');
    expect(screen.getByTestId('tx-id-2')).toHaveTextContent('confirmed-0'); // newest confirmed
    expect(screen.getByTestId('tx-id-3')).toHaveTextContent('confirmed-1');
    expect(screen.getByTestId('tx-id-4')).toHaveTextContent('confirmed-2');

    // Verify statuses
    expect(screen.getByTestId('tx-status-0')).toHaveTextContent('pending');
    expect(screen.getByTestId('tx-status-1')).toHaveTextContent('pending');
    expect(screen.getByTestId('tx-status-2')).toHaveTextContent('confirmed');

    // Should show load more button since hasMore is true
    expect(screen.getByTestId('load-more')).toBeInTheDocument();

    // Verify API was called with correct parameters
    expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(
      testAccount,
      expect.objectContaining({
        limit: 3,
        offset: 0,
        includeMempool: true,
        includeConfirmed: true
      })
    );
  });

  it('should load more confirmed transactions when "Load More" is clicked', async () => {
    const now = Date.now();
    const confirmedTxs = Array.from({ length: 10 }, (_, i) => 
      createTransaction(`confirmed-${i}`, false, now - (600000 + i * 60000), `${100 + i}`) // much older
    );
    const pendingTxs = [
      createTransaction('pending-1', true, now - 30000, '50'),
      createTransaction('pending-2', true, now - 15000, '75') // newest
    ];

    // Initial load: top 3 confirmed + all pending
    const initialTransactions = [...pendingTxs, ...confirmedTxs.slice(0, 3)]
      .sort((a, b) => b.timestamp - a.timestamp);

    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: initialTransactions,
      totalCount: 12,
      hasMore: true,
      nextOffset: 3
    });

    render(
      <Provider store={store}>
        <TestAccountTransactionList account={testAccount} />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('transaction-list')).toBeInTheDocument();
    });

    // Verify initial state
    expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 5');

    // Mock load more response: next 3 confirmed transactions
    const loadMoreTransactions = confirmedTxs.slice(3, 6); // confirmed-3, confirmed-4, confirmed-5
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: loadMoreTransactions,
      totalCount: 12,
      hasMore: true, // Still more available
      nextOffset: 6
    });

    // Click load more
    act(() => {
      screen.getByTestId('load-more').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 8'); // 2 pending + 6 confirmed
    });

    // Verify load more API call
    expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(
      testAccount,
      expect.objectContaining({
        limit: 3,
        includeMempool: false, // Should not include pending on load more
        offset: 3
      })
    );

    // Verify confirmed count increased
    expect(screen.getByTestId('confirmed-count')).toHaveTextContent('Confirmed: 6');
    expect(screen.getByTestId('pending-count')).toHaveTextContent('Pending: 2'); // Unchanged

    // Verify new transactions are appended (pending still at top)
    expect(screen.getByTestId('tx-id-0')).toHaveTextContent('pending-2'); // Still newest
    expect(screen.getByTestId('tx-id-5')).toHaveTextContent('confirmed-3'); // First new confirmed
    expect(screen.getByTestId('tx-id-6')).toHaveTextContent('confirmed-4');
    expect(screen.getByTestId('tx-id-7')).toHaveTextContent('confirmed-5');
  });

  it('should refresh account activity when manually triggered', async () => {
    const now = Date.now();
    const initialConfirmed = Array.from({ length: 3 }, (_, i) => 
      createTransaction(`confirmed-${i}`, false, now - (600000 + i * 60000), `${100 + i}`) // much older
    );
    const initialPending = [
      createTransaction('pending-1', true, now - 30000, '50')
    ];

    // Initial load
    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: [...initialPending, ...initialConfirmed].sort((a, b) => b.timestamp - a.timestamp),
      totalCount: 4,
      hasMore: false,
      nextOffset: undefined
    });

    const TestRefreshComponent = () => {
      const {
        transactions,
        isLoading,
        error,
        hasMore,
        fetchAccountActivity,
        pendingTransactions,
        confirmedTransactions
      } = useAccountActivity(testAccount);

      const [refreshCount, setRefreshCount] = React.useState(0);

      React.useEffect(() => {
        if (testAccount) {
          fetchAccountActivity({ 
            limit: 3, 
            offset: 0, 
            includeMempool: true, 
            includeConfirmed: true 
          });
        }
      }, [testAccount?.tag, fetchAccountActivity, refreshCount]);

      const handleRefresh = () => {
        setRefreshCount(c => c + 1);
      };

      if (isLoading && transactions.length === 0) {
        return <div data-testid="loading">Loading transactions...</div>;
      }

      if (error) {
        return <div data-testid="error">Error: {error}</div>;
      }

      return (
        <div data-testid="transaction-list">
          <button data-testid="refresh-button" onClick={handleRefresh}>
            Refresh
          </button>
          <div data-testid="summary">
            <span data-testid="total-count">Total: {transactions.length}</span>
            <span data-testid="pending-count">Pending: {pendingTransactions.length}</span>
            <span data-testid="confirmed-count">Confirmed: {confirmedTransactions.length}</span>
          </div>
          
          <div data-testid="transactions">
            {transactions.map((tx: any, index: number) => (
              <div key={`${tx.txid}-${index}`} data-testid={`transaction-${index}`}>
                <span data-testid={`tx-id-${index}`}>{tx.txid}</span>
                <span data-testid={`tx-status-${index}`}>{tx.pending ? 'pending' : 'confirmed'}</span>
                <span data-testid={`tx-amount-${index}`}>{tx.amount}</span>
                <span data-testid={`tx-timestamp-${index}`}>{tx.timestamp}</span>
              </div>
            ))}
          </div>

          {hasMore && (
            <button data-testid="load-more">Load More</button>
          )}
        </div>
      );
    };

    render(
      <Provider store={store}>
        <TestRefreshComponent />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 4');
    });

    // Verify initial state
    expect(screen.getByTestId('pending-count')).toHaveTextContent('Pending: 1');
    expect(screen.getByTestId('confirmed-count')).toHaveTextContent('Confirmed: 3');

    // Setup new data for refresh
    const newConfirmed = createTransaction('confirmed-new', false, now - 15000, '200');
    const newPending = createTransaction('pending-new', true, now - 10000, '150');

    const updatedTransactions = [
      newPending,
      newConfirmed,
      ...initialPending,
      ...initialConfirmed.slice(0, 2) // Only keep top 2 old confirmed (total 3 confirmed)
    ].sort((a, b) => b.timestamp - a.timestamp);

    mockNetworkService.fetchRecentActivity.mockResolvedValueOnce({
      transactions: updatedTransactions,
      totalCount: 5,
      hasMore: true,
      nextOffset: 3
    });

    // Trigger refresh by clicking the refresh button
    act(() => {
      screen.getByTestId('refresh-button').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 5');
    }, { timeout: 2000 });

    // Verify new transactions are present and sorted correctly
    expect(screen.getByTestId('tx-id-0')).toHaveTextContent('pending-new'); // Newest pending
    expect(screen.getByTestId('tx-id-1')).toHaveTextContent('confirmed-new'); // Newest confirmed
    expect(screen.getByTestId('tx-id-2')).toHaveTextContent('pending-1'); // Original pending

    // Verify counts updated
    expect(screen.getByTestId('pending-count')).toHaveTextContent('Pending: 2');
    expect(screen.getByTestId('confirmed-count')).toHaveTextContent('Confirmed: 3');

    // Should show load more again
    expect(screen.getByTestId('load-more')).toBeInTheDocument();

    // Verify that the network service was called twice (initial + refresh)
    expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledTimes(2);
  });

  it('should handle the case when all confirmed transactions fit in initial load', async () => {
    const now = Date.now();
    // Only 2 confirmed transactions (less than limit of 3)
    const confirmedTxs = [
      createTransaction('confirmed-1', false, now - 60000, '100'),
      createTransaction('confirmed-2', false, now - 120000, '150')
    ];
    const pendingTxs = [
      createTransaction('pending-1', true, now - 30000, '50')
    ];

    mockNetworkService.fetchRecentActivity.mockResolvedValue({
      transactions: [...pendingTxs, ...confirmedTxs].sort((a, b) => b.timestamp - a.timestamp),
      totalCount: 3,
      hasMore: false, // No more transactions
      nextOffset: undefined
    });

    render(
      <Provider store={store}>
        <TestAccountTransactionList account={testAccount} />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 3');
    });

    // Should not show load more button
    expect(screen.queryByTestId('load-more')).not.toBeInTheDocument();

    // Verify all transactions are shown
    expect(screen.getByTestId('pending-count')).toHaveTextContent('Pending: 1');
    expect(screen.getByTestId('confirmed-count')).toHaveTextContent('Confirmed: 2');
  });

  it('should handle empty state gracefully', async () => {
    mockNetworkService.fetchRecentActivity.mockResolvedValue({
      transactions: [],
      totalCount: 0,
      hasMore: false,
      nextOffset: undefined
    });

    render(
      <Provider store={store}>
        <TestAccountTransactionList account={testAccount} />
      </Provider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('total-count')).toHaveTextContent('Total: 0');
    });

    expect(screen.getByTestId('pending-count')).toHaveTextContent('Pending: 0');
    expect(screen.getByTestId('confirmed-count')).toHaveTextContent('Confirmed: 0');
    expect(screen.queryByTestId('load-more')).not.toBeInTheDocument();
  });
});
