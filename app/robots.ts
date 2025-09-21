import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/private/',
          '/internal/',
          '/test/',
          '/debug/',
          '/temp/',
          '/tmp/',
          '*.json$',
          '*.xml$',
          '*.txt$',
          '*.log$',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/private/',
          '/internal/',
          '/test/',
          '/debug/',
        ],
        crawlDelay: 0,
      },
      {
        userAgent: 'Bingbot',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/private/',
          '/internal/',
          '/test/',
          '/debug/',
        ],
        crawlDelay: 1,
      },
      {
        userAgent: 'Slurp',
        allow: '/',
        disallow: [
          '/api/',
          '/_next/',
          '/admin/',
          '/private/',
          '/internal/',
          '/test/',
          '/debug/',
        ],
        crawlDelay: 2,
      },
    ],
    sitemap: 'https://app.drinfo.ai/sitemap.xml',
    host: 'https://app.drinfo.ai',
  }
}
