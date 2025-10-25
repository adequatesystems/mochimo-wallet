import { configureStore } from '@reduxjs/toolkit';
import { vi } from 'vitest';

// Mock NetworkProvider before importing actions

import { fetchRecentActivityAction, loadMoreActivityAction } from '../../../../src/redux/actions/transactionActions';
import { NetworkProvider } from '../../../../src/redux/context/NetworkContext';
import accountReducer from '../../../../src/redux/slices/accountSlice';
import transactionReducer from '../../../../src/redux/slices/transactionSlice';

// Mock selected account selector via preloaded state shape used by actions
const makeStore = (preloaded?: any) => configureStore({
  reducer: {
    transaction: transactionReducer,
    accounts: accountReducer
  },
  preloadedState: {
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
    },
    accounts: {
      accounts: { 'acct1': { tag: 'acct1', name: 'A' } },
      selectedAccount: 'acct1',
      isLoading: false,
      error: null
    },
    ...(preloaded || {})
  }
});


// Mock mochimo-mesh-api-client to avoid loading ESM deps (mochimo-wots)
vi.mock('mochimo-mesh-api-client', () => ({
  isValidMemo: vi.fn(() => true),
  TransactionBuilder: class {
    constructor(_baseUrl?: string) {}
    async buildAndSignTransaction() {
      return { submitResult: { transaction_identifier: { hash: '0xtest' } } } as any;
    }
  }
}));

describe('transactionActions pagination behavior', () => {
  it('initial fetch stores lastFetchOptions and activity, hasMore/nextOffset', async () => {
    const store = makeStore({
      accounts: {
        accounts: { '123': { tag: '123', name: 'Test Account' } },
        selectedAccount: '123'
      }
    });
    
    const mockNetworkService = {
      fetchRecentActivity: vi.fn().mockResolvedValue({
        transactions: [{ txid: 'p1', pending: true, amount: '1', address: 'x', timestamp: 1 }],
        totalCount: 10,
        hasMore: true,
        nextOffset: 3
      })
    };
    
    NetworkProvider.setNetwork(mockNetworkService);

    await store.dispatch<any>(fetchRecentActivityAction({ limit: 3, includeMempool: true, includeConfirmed: true, maxBlock: 123 }));
    const state = store.getState();
    expect(state.transaction.activity.transactions.length).toBe(1);
    expect(state.transaction.activity.hasMore).toBe(true);
    expect(state.transaction.activity.currentOffset).toBe(3);
    expect(state.transaction.activity.lastFetchOptions).toMatchObject({ limit: 3, includeMempool: true, includeConfirmed: true, maxBlock: 123 });
  });

  it('load more merges lastFetchOptions and forces includeMempool=false', async () => {
    const store = makeStore({
      accounts: {
        accounts: { '123': { tag: '123', name: 'Test Account' } },
        selectedAccount: '123'
      },
      transaction: {
        isLoading: false,
        error: null,
        pendingTransactions: [],
        activity: {
          isLoading: false,
          error: null,
          transactions: [{ txid: 'p1', pending: true, amount: '1', address: 'x', timestamp: 1 }],
          totalCount: 10,
          hasMore: true,
          currentOffset: 3,
          lastFetchOptions: { limit: 3, includeMempool: true, includeConfirmed: true, maxBlock: 123 }
        },
        accountActivity: {}
      }
    });
    
    const mockNetworkService = {
      fetchRecentActivity: vi.fn().mockResolvedValue({
        transactions: [{ txid: 'c2', pending: false, amount: '2', address: 'y', timestamp: 2 }],
        totalCount: 10,
        hasMore: false,
        nextOffset: undefined
      })
    };
    
    NetworkProvider.setNetwork(mockNetworkService);

    await store.dispatch<any>(loadMoreActivityAction({}));

    // Called with merged options
    expect(mockNetworkService.fetchRecentActivity).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      limit: 3,
      includeConfirmed: true,
      includeMempool: false, // forced off on load more
      offset: 3,
      maxBlock: 123
    }));

    const state = store.getState();
    expect(state.transaction.activity.transactions.map((t: any) => t.txid)).toEqual(['p1', 'c2']);
    expect(state.transaction.activity.hasMore).toBe(false);
  });
});


