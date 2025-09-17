import { configureStore } from '@reduxjs/toolkit'
import { renderHook, waitFor } from '@testing-library/react'
import React from 'react'
import { Provider } from 'react-redux'
import { describe, expect, it, vi } from 'vitest'
import { useActiveNetworkUrl, useActiveProvider } from '../../../../src/redux/hooks/useProviders'
import providersReducer, { hydrateProviders, setActiveProvider } from '../../../../src/redux/slices/providerSlice'

// Mock ESM dependencies used indirectly by MeshNetworkService (through providerSlice apply)
vi.mock('mochimo-wots', () => ({}))
vi.mock('mochimo-mesh-api-client', () => ({
  MochimoApiClient: class {
    constructor(_: string) {}
  }
}))

function makeStore() {
  return configureStore({
    reducer: {
      providers: providersReducer,
    },
    middleware: g => g({ serializableCheck: false })
  })
}

describe('useProviders hooks', () => {
  it('returns active mesh provider and url', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    )

    const { result: activeUrlRes } = renderHook(() => useActiveNetworkUrl(), { wrapper })
    await waitFor(() => {
      expect(activeUrlRes.current).toBeTruthy()
    })

    const { result: activeMeshRes } = renderHook(() => useActiveProvider('mesh'), { wrapper })
    await waitFor(() => {
      expect(activeMeshRes.current?.kind).toBe('mesh')
    })
  })

  it('updates url when switching active provider', async () => {
    const store = makeStore()
    await store.dispatch(hydrateProviders())
    const mesh = store.getState().providers.byKind.mesh
    const second = mesh.items[1] || mesh.items[0]
    store.dispatch(setActiveProvider({ kind: 'mesh', id: second.id }))

    const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
      <Provider store={store}>{children}</Provider>
    )
    const { result } = renderHook(() => useActiveNetworkUrl(), { wrapper })
    await waitFor(() => {
      expect(result.current).toBe(second.apiUrl)
    })
  })
})


