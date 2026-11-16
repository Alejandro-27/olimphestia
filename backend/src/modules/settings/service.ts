import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { CACHE_TTL, cached } from '../../lib/cache.js'
import { settings } from '../../db/schema.js'
import type { UpdateSettingsInput } from './schemas.js'

async function loadSettings(tenantId: string) {
  const row = (await db.select().from(settings).where(eq(settings.tenantId, tenantId)).limit(1))[0]
  if (row) return row
  // Hoteles creados después de la migración multitenant pueden no tener fila todavía.
  return {
    tenantId,
    legalName: '',
    taxId: '',
    address: '',
    phone: '',
    email: '',
    jurisdiction: '',
    updatedAt: '',
  }
}

export async function updateSettings(tenantId: string, input: UpdateSettingsInput) {
  const updatedAt = new Date().toISOString()
  await db
    .insert(settings)
    .values({ tenantId, ...input, updatedAt })
    .onConflictDoUpdate({ target: settings.tenantId, set: { ...input, updatedAt } })
  return loadSettings(tenantId)
}

export function getSettings(tenantId: string) {
  return cached(`settings:${tenantId}`, CACHE_TTL.settings, () => loadSettings(tenantId))
}
