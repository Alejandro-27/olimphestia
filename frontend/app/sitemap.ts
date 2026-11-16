import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export const dynamic = 'force-static'

const legalPages = ['/legal/privacidad', '/legal/terminos', '/legal/reembolsos']

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date()
  return legalPages.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency: 'yearly',
    priority: 0.3,
  }))
}
