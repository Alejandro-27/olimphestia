import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cacheClear, cacheGet, cacheSet, cacheSize, cached } from './cache.js'

beforeEach(() => {
  cacheClear()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cache en memoria', () => {
  it('reutiliza el valor y lo recarga al expirar', async () => {
    vi.useFakeTimers()
    let calls = 0
    const load = async () => {
      calls += 1
      return { calls }
    }

    expect(await cached('k', 1000, load)).toEqual({ calls: 1 })
    expect(await cached('k', 1000, load)).toEqual({ calls: 1 })

    vi.advanceTimersByTime(1001)

    expect(await cached('k', 1000, load)).toEqual({ calls: 2 })
  })

  it('evicta la entrada más antigua al superar el máximo', () => {
    for (let i = 0; i < 501; i += 1) cacheSet(`k${i}`, i)

    expect(cacheSize()).toBe(500)
    expect(cacheGet('k0')).toBeUndefined()
    expect(cacheGet('k1')).toBe(1)
  })

  it('cacheClear vacía el almacén', () => {
    cacheSet('a', 1)
    cacheClear()
    expect(cacheSize()).toBe(0)
    expect(cacheGet('a')).toBeUndefined()
  })
})
