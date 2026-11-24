import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dhole Patil Khanawal - Hotel Management',
    short_name: 'DPK Hotel',
    description: 'Complete hotel management system with ordering, kitchen, and admin dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#F5F5DC',
    theme_color: '#6B3E26',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  }
}
