import { selectConfirmedTransactions, selectPendingTransactions, selectPendingPlusTopNConfirmed } from '../../../../src/redux/selectors/activitySelectors';

type Tx = {
  type: 'send' | 'receive';
  amount: string;
  timestamp: number;
  address: string;
  txid: string;
  blockNumber?: number;
  pending?: boolean;
  memo?: string;
};

type RootState = any;

const makeState = (transactions: Tx[]): RootState => ({
  transaction: {
    activity: {
      transactions,
      totalCount: transactions.length,
      hasMore: false,
      currentOffset: 0,
      lastFetchOptions: null,
      isLoading: false,
      error: null
    },
    accountActivity: {}
  }
});

describe('activitySelectors - pending + top N confirmed', () => {
  const now = Date.now();

  const txs: Tx[] = [
    // confirmed (older)
    { type: 'receive', amount: '10', timestamp: now - 60000, address: 'a', txid: 'c1', pending: false },
    // pending
    { type: 'send', amount: '5', timestamp: now - 30000, address: 'b', txid: 'p1', pending: true },
    { type: 'receive', amount: '7', timestamp: now - 20000, address: 'c', txid: 'p2', pending: true },
    // confirmed (newer)
    { type: 'send', amount: '3', timestamp: now - 10000, address: 'd', txid: 'c2', pending: false },
    { type: 'receive', amount: '4', timestamp: now - 5000, address: 'e', txid: 'c3', pending: false }
  ];

  it('returns all pending and top 3 confirmed sorted by timestamp desc', () => {
    const state = makeState(txs);

    // Sanity: base selectors work
    const pending = selectPendingTransactions(state);
    const confirmed = selectConfirmedTransactions(state);
    expect(pending.map((t: Tx) => t.txid)).toEqual(['p1', 'p2']);
    expect(confirmed.map((t: Tx) => t.txid).sort()).toEqual(['c1', 'c2', 'c3']);

    const selector = (selectPendingPlusTopNConfirmed as (n: number) => (s: RootState) => Tx[])(3);
    const result = selector(state);

    // Expect: pending first (order preserved among pending as per timestamp desc when combined),
    // followed by top 3 confirmed by timestamp desc: c3, c2, c1
    const ids = result.map(t => t.txid);
    expect(ids).toEqual(['p2', 'p1', 'c3', 'c2', 'c1']);
  });

  it('caps confirmed to N', () => {
    const state = makeState(txs);
    const selector = (selectPendingPlusTopNConfirmed as (n: number) => (s: RootState) => Tx[])(1);
    const result = selector(state);
    const ids = result.map(t => t.txid);
    // pending + top 1 confirmed (c3)
    expect(ids).toEqual(['p2', 'p1', 'c3']);
  });
});


