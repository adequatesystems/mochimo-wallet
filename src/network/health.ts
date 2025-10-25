import type { ProviderConfig } from '../redux/slices/providerSlice'
import { MeshNetworkService } from './MeshNetworkService'
import { ProxyNetworkService } from './proxyNetworkService'

export type HealthResult = {
  ok: boolean
  height?: number
  latencyMs?: number
  error?: string
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timeout')), ms)
    promise.then(
      (val) => { clearTimeout(timer); resolve(val) },
      (err) => { clearTimeout(timer); reject(err) }
    )
  })
}

export async function checkServiceHealth(cfg: ProviderConfig, timeoutMs = 4000): Promise<HealthResult> {
  const start = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
  try {
    const service = cfg.kind === 'mesh' ? new MeshNetworkService(cfg.apiUrl) : new ProxyNetworkService(cfg.apiUrl)
    const status = await withTimeout(service.getNetworkStatus(), timeoutMs)
    const height = Number((status as any)?.height ?? 0)
    if (!Number.isFinite(height) || height < 0) throw new Error('Invalid height')
    const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
    return { ok: true, height, latencyMs: Math.round(end - start) }
  } catch (e) {
    const end = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()
    return { ok: false, error: e instanceof Error ? e.message : 'Unknown error', latencyMs: Math.round(end - start) }
  }
}


