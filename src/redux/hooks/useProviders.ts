import { useSelector } from 'react-redux'
import type { ProviderConfig, ProviderKind } from '../slices/providerSlice'
import type { RootState } from '../store'

export const useProviderBucket = (kind: ProviderKind) => {
  return useSelector((state: RootState) => state.providers.byKind[kind])
}

export const useActiveProvider = (kind: ProviderKind): ProviderConfig | null => {
  return useSelector((state: RootState) => {
    const bucket = state.providers.byKind[kind]
    return bucket.items.find(i => i.id === bucket.activeId) || null
  })
}

// Convenience: prefer mesh URL, fallback to proxy
export const useActiveNetworkUrl = (): string | null => {
  return useSelector((state: RootState) => {
    const meshBucket = state.providers.byKind.mesh
    const proxyBucket = state.providers.byKind.proxy
    const mesh = meshBucket.items.find(i => i.id === meshBucket.activeId)
    const proxy = proxyBucket.items.find(i => i.id === proxyBucket.activeId)
    return mesh?.apiUrl || proxy?.apiUrl || null
  })
}


