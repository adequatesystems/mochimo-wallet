import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit'
import { MeshNetworkService } from '../../network/MeshNetworkService'
import { ProxyNetworkService } from '../../network/proxyNetworkService'
import { NetworkProvider } from '../context/NetworkContext'
import { RootState } from '../store'

// Provider kinds supported (extensible)
export type ProviderKind = 'mesh' | 'proxy'

export interface ProviderConfig {
  id: string
  name: string
  kind: ProviderKind
  apiUrl: string
  isCustom?: boolean
}

export interface ProviderBucket {
  activeId: string | null
  items: ProviderConfig[]
}

export interface ProviderRegistryState {
  loaded: boolean
  byKind: Record<ProviderKind, ProviderBucket>
}

// Defaults for Mesh API service (order preserved)
const MESH_DEFAULTS: ProviderConfig[] = [
  { id: 'mesh-global', name: 'Mochimo Mesh API (Global)', kind: 'mesh', apiUrl: 'https://api.mochimo.org', isCustom: false },
  { id: 'mesh-dev', name: 'Dev Mesh API', kind: 'mesh', apiUrl: 'https://dev-api.mochiscan.org:8443', isCustom: false },
  { id: 'mesh-usc', name: 'US Central', kind: 'mesh', apiUrl: 'https://api-usc.mochimo.org', isCustom: false },
  { id: 'mesh-sgp', name: 'Singapore', kind: 'mesh', apiUrl: 'https://api-sgp.mochimo.org', isCustom: false },
  { id: 'mesh-deu', name: 'Germany', kind: 'mesh', apiUrl: 'https://api-deu.mochimo.org', isCustom: false },
  { id: 'mesh-aus', name: 'Australia', kind: 'mesh', apiUrl: 'http://api-aus.mochimo.org:8080', isCustom: false },
]

const PROXY_DEFAULTS: ProviderConfig[] = [
  { id: 'proxy-default', name: 'Legacy Proxy', kind: 'proxy', apiUrl: 'https://api.mochimo.org', isCustom: false }
]

const STORAGE_KEY = 'provider_registry_v1'

function getExtensionStorageArea(): any | null {
  if (typeof browser !== 'undefined' && (browser as any).storage?.local) return (browser as any).storage.local
  if (typeof chrome !== 'undefined' && chrome.storage?.local) return chrome.storage.local
  return null
}

type PersistedShape = {
  custom: Record<ProviderKind, ProviderConfig[]>
  active: Partial<Record<ProviderKind, string | null>>
}

const initialState: ProviderRegistryState = {
  loaded: false,
  byKind: {
    mesh: { activeId: null, items: MESH_DEFAULTS },
    proxy: { activeId: null, items: PROXY_DEFAULTS },
  }
}

export const hydrateProviders = createAsyncThunk<ProviderRegistryState, void, { state: RootState }>(
  'providers/hydrate',
  async () => {
    let persisted: PersistedShape | null = null
    try {
      const area = getExtensionStorageArea()
      if (area) {
        const raw = await area.get(STORAGE_KEY)
        persisted = raw?.[STORAGE_KEY] || null
      } else if (typeof localStorage !== 'undefined') {
        const json = localStorage.getItem(STORAGE_KEY)
        persisted = json ? JSON.parse(json) : null
      }
    } catch {
      // ignore
    }

    const state: ProviderRegistryState = {
      loaded: true,
      byKind: {
        mesh: {
          items: [...MESH_DEFAULTS, ...((persisted?.custom?.mesh ?? []).filter(c => c.kind === 'mesh'))],
          activeId: persisted?.active?.mesh ?? (MESH_DEFAULTS[0]?.id ?? null)
        },
        proxy: {
          items: [...PROXY_DEFAULTS, ...((persisted?.custom?.proxy ?? []).filter(c => c.kind === 'proxy'))],
          activeId: persisted?.active?.proxy ?? (PROXY_DEFAULTS[0]?.id ?? null)
        }
      }
    }

    return state
  }
)

function persist(state: ProviderRegistryState) {
  const toPersist: PersistedShape = {
    custom: {
      mesh: state.byKind.mesh.items.filter(i => i.isCustom),
      proxy: state.byKind.proxy.items.filter(i => i.isCustom)
    },
    active: {
      mesh: state.byKind.mesh.activeId,
      proxy: state.byKind.proxy.activeId
    }
  }
  try {
    const area = getExtensionStorageArea()
    if (area) {
      return area.set({ [STORAGE_KEY]: toPersist })
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toPersist))
    }
  } catch {
    // ignore persistence errors
  }
}

const slice = createSlice({
  name: 'providers',
  initialState,
  reducers: {
    setActiveProvider(state, action: PayloadAction<{ kind: ProviderKind, id: string }>) {
      const { kind, id } = action.payload
      const bucket = state.byKind[kind]
      if (bucket.items.some(i => i.id === id)) {
        bucket.activeId = id
        persist(state)
      }
    },
    addCustomProvider(state, action: PayloadAction<{ kind: ProviderKind, name: string, apiUrl: string, id?: string }>) {
      const { kind, name, apiUrl } = action.payload
      const id = action.payload.id || `${kind}-${Math.random().toString(36).slice(2, 8)}`
      const bucket = state.byKind[kind]
      const existingIndex = bucket.items.findIndex(i => i.id === id)
      const item: ProviderConfig = { id, name, kind, apiUrl, isCustom: true }
      if (existingIndex >= 0) bucket.items[existingIndex] = item; else bucket.items.push(item)
      persist(state)
    },
    updateCustomProvider(state, action: PayloadAction<{ kind: ProviderKind, id: string, name?: string, apiUrl?: string }>) {
      const { kind, id, name, apiUrl } = action.payload
      const bucket = state.byKind[kind]
      const item = bucket.items.find(i => i.id === id && i.isCustom)
      if (item) {
        if (name !== undefined) item.name = name
        if (apiUrl !== undefined) item.apiUrl = apiUrl
        persist(state)
      }
    },
    removeProvider(state, action: PayloadAction<{ kind: ProviderKind, id: string }>) {
      const { kind, id } = action.payload
      const bucket = state.byKind[kind]
      // Only allow removing custom items
      const item = bucket.items.find(i => i.id === id)
      if (!item?.isCustom) return
      bucket.items = bucket.items.filter(i => i.id !== id)
      if (bucket.activeId === id) bucket.activeId = bucket.items[0]?.id ?? null
      persist(state)
    }
  },
  extraReducers: builder => {
    builder.addCase(hydrateProviders.fulfilled, (state, action) => {
      state.loaded = true
      state.byKind = action.payload.byKind
    })
  }
})

export const { setActiveProvider, addCustomProvider, updateCustomProvider, removeProvider } = slice.actions
export default slice.reducer

// Selectors
export const selectProvidersByKind = (state: RootState, kind: ProviderKind) => state.providers.byKind[kind]
export const selectActiveProvider = (state: RootState, kind: ProviderKind) => {
  const bucket = state.providers.byKind[kind]
  return bucket.items.find(i => i.id === bucket.activeId) || null
}

// Effect helper to instantiate the active provider for mesh/proxy
export const applyActiveNetworkInstance = createAsyncThunk<void, void, { state: RootState }>(
  'providers/applyActiveInstance',
  async (_, { getState }) => {
    const state = getState()
    const mesh = selectActiveProvider(state, 'mesh')
    const proxy = selectActiveProvider(state, 'proxy')
    // Prefer mesh if available, else proxy
    const cfg = mesh || proxy
    if (!cfg) return
    const instance = cfg.kind === 'mesh' ? new MeshNetworkService(cfg.apiUrl) : new ProxyNetworkService(cfg.apiUrl)
    NetworkProvider.setNetwork(instance)
  }
)


