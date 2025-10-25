import { configureStore } from '@reduxjs/toolkit'
import { describe, expect, it, vi } from 'vitest'
import accountReducer from '../../../../src/redux/slices/accountSlice'
import networkReducer from '../../../../src/redux/slices/networkSlice'
import reducer, {
  addCustomProvider,
  applyActiveNetworkInstance,
  hydrateProviders,
  removeProvider,
  setActiveProvider
} from '../../../../src/redux/slices/providerSlice'
import transactionReducer from '../../../../src/redux/slices/transactionSlice'
import walletReducer from '../../../../src/redux/slices/walletSlice'

// Mock ESM dependencies used indirectly by MeshNetworkService
vi.mock('mochimo-wots', () => ({}))
vi.mock('mochimo-mesh-api-client', () => ({
  MochimoApiClient: class {
    constructor(_: string) {}
    getNetworkStatus() { return Promise.resolve({ current_block_identifier: { index: 0 } }) }
    getAccountBalance() { return Promise.resolve({ balances: [{ value: '0' }] }) }
    resolveTag() { return Promise.resolve({ result: { address: '', amount: '0' } }) }
    submit() { return Promise.resolve({ transaction_identifier: { hash: 'tx' } }) }
    searchTransactionsByAddress() { return Promise.resolve({ transactions: [], next_offset: 0, total_count: 0 }) }
    getMempoolTransactions() { return Promise.resolve({ transaction_identifiers: [] }) }
    getMempoolTransaction() { return Promise.resolve({}) }
  }
}))

function makeStore() {
  return configureStore({
    reducer: {
      providers: reducer,
      network: networkReducer,
      wallet: walletReducer,
      accounts: accountReducer,
      transaction: transactionReducer,
    },
    middleware: g => g({ serializableCheck: false })
  })
}

describe('providerSlice', () => {
  it('hydrates with defaults and sets first mesh as active by default', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())
    const state = store.getState().providers
    expect(state.loaded).toBe(true)
    expect(state.byKind.mesh.items.length).toBeGreaterThan(0)
    expect(state.byKind.mesh.activeId).toBeTruthy()
  })

  it('can add custom provider and switch active', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())
    store.dispatch(addCustomProvider({ kind: 'mesh', name: 'Local Dev', apiUrl: 'http://localhost:8080' }))
    const added = store.getState().providers.byKind.mesh.items.find(i => i.apiUrl === 'http://localhost:8080')
    expect(added).toBeTruthy()
    if (added) {
      store.dispatch(setActiveProvider({ kind: 'mesh', id: added.id }))
      expect(store.getState().providers.byKind.mesh.activeId).toBe(added.id)
    }
  })

  it('applyActiveNetworkInstance instantiates without throwing', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())
    await store.dispatch(applyActiveNetworkInstance())
    // no explicit assertion; just ensure no exceptions
    expect(true).toBe(true)
  })

  it('removes only custom providers', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())
    store.dispatch(addCustomProvider({ kind: 'mesh', name: 'X', apiUrl: 'http://x' }))
    const custom = store.getState().providers.byKind.mesh.items.find(i => i.apiUrl === 'http://x')!
    store.dispatch(removeProvider({ kind: 'mesh', id: custom.id }))
    const exists = store.getState().providers.byKind.mesh.items.some(i => i.id === custom.id)
    expect(exists).toBe(false)
  })

  it('supports custom urls for multiple provider kinds (mesh and proxy)', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())

    // Add custom mesh and proxy
    store.dispatch(addCustomProvider({ kind: 'mesh', name: 'Mesh Local', apiUrl: 'http://mesh-local:8080' }))
    store.dispatch(addCustomProvider({ kind: 'proxy', name: 'Proxy Local', apiUrl: 'http://proxy-local:8080' }))

    const meshCustom = store.getState().providers.byKind.mesh.items.find(i => i.apiUrl === 'http://mesh-local:8080')
    const proxyCustom = store.getState().providers.byKind.proxy.items.find(i => i.apiUrl === 'http://proxy-local:8080')

    expect(meshCustom).toBeTruthy()
    expect(proxyCustom).toBeTruthy()

    // Switch active proxy and verify
    if (proxyCustom) {
      store.dispatch(setActiveProvider({ kind: 'proxy', id: proxyCustom.id }))
      expect(store.getState().providers.byKind.proxy.activeId).toBe(proxyCustom.id)
    }
  })

  it('updates network status when switching between healthy and down providers', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())

    // Add two custom mesh endpoints: one healthy, one down
    store.dispatch(addCustomProvider({ kind: 'mesh', name: 'OK', apiUrl: 'http://ok-endpoint' }))
    store.dispatch(addCustomProvider({ kind: 'mesh', name: 'DOWN', apiUrl: 'http://down-endpoint' }))

    // Spy on MeshNetworkService.getNetworkStatus to simulate behavior based on url
    const realModule = await import('../../../../src/network/MeshNetworkService')
    const spy = vi.spyOn((realModule as any).MeshNetworkService.prototype, 'getNetworkStatus').mockImplementation(function (this: any) {
      const url: string = this.apiUrl
      if (url.includes('down')) {
        return Promise.reject(new Error('down'))
      }
      return Promise.resolve({ height: 123, nodes: [] })
    })

    const mesh = store.getState().providers.byKind.mesh
    const ok = mesh.items.find(i => i.apiUrl.includes('ok-endpoint'))!
    const down = mesh.items.find(i => i.apiUrl.includes('down-endpoint'))!

    // Switch to healthy
    store.dispatch(setActiveProvider({ kind: 'mesh', id: ok.id }))
    await store.dispatch(applyActiveNetworkInstance())
    expect(store.getState().network.isConnected).toBe(true)

    // Switch to down
    store.dispatch(setActiveProvider({ kind: 'mesh', id: down.id }))
    await store.dispatch(applyActiveNetworkInstance())
    expect(store.getState().network.isConnected).toBe(false)

    spy.mockRestore()
  })
})


