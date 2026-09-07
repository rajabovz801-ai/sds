import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/dashboard', '/mock', '/profile'],
      },
    ],
    sitemap: 'https://arkielts.vercel.app/sitemap.xml',
    host: 'https://arkielts.vercel.app',
  };
}
