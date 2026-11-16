type Entry = { value: unknown; expiresAt: number }

const store = new Map<string, Entry>()
const MAX_ENTRIES = 500

export const CACHE_TTL = {
  list: 15_000,
  report: 30_000,
  settings: 60_000,
} as const

export function cacheGet<T>(key: string): T | undefined {
  const entry = store.get(key)
  if (!entry) return undefined
  if (entry.expiresAt <= Date.now()) {
    store.delete(key)
    return undefined
  }
  // Reinsertar para mantener el orden LRU.
  store.delete(key)
  store.set(key, entry)
  return entry.value as T
}

export function cacheSet<T>(key: string, value: T, ttlMs = 15_000): void {
  if (store.size >= MAX_ENTRIES) {
    const oldest = store.keys().next().value
    if (oldest !== undefined) store.delete(oldest)
  }
  store.set(key, { value, expiresAt: Date.now() + ttlMs })
}

export async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cacheGet<T>(key)
  if (hit !== undefined) return hit
  const value = await load()
  cacheSet(key, value, ttlMs)
  return value
}

export function cacheClear(): void {
  store.clear()
}

export function cacheSize(): number {
  return store.size
}
