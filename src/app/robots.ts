import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/site'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        // Everything behind login should not be crawled/indexed
        disallow: [
          '/api/', '/admin/', '/dashboard', '/panen', '/farms', '/tanaman',
          '/lahan', '/pengumuman', '/kalender', '/notifications', '/analytics',
          '/reports', '/aktivitas', '/profile',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
