/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    // Fix for better-sqlite3 in Electron
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
      }
    }
    return config
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline' https://translate.google.com https://*.translate.google.com https://translate.googleapis.com https://*.translate.googleapis.com https://translate-pa.googleapis.com https://*.translate-pa.googleapis.com https://www.gstatic.com https://*.gstatic.com; style-src 'self' 'unsafe-inline' https://translate.google.com https://*.translate.google.com https://translate.googleapis.com https://*.translate.googleapis.com https://translate-pa.googleapis.com https://*.translate-pa.googleapis.com https://www.gstatic.com https://*.gstatic.com; img-src 'self' data: https: https://translate.google.com https://*.translate.google.com https://translate.googleapis.com https://*.translate.googleapis.com https://translate-pa.googleapis.com https://*.translate-pa.googleapis.com https://www.gstatic.com https://*.gstatic.com; font-src 'self' data: https://translate.google.com https://*.translate.google.com https://translate.googleapis.com https://*.translate.googleapis.com https://translate-pa.googleapis.com https://*.translate-pa.googleapis.com https://www.gstatic.com https://*.gstatic.com; connect-src 'self' https: wss://*.supabase.co wss://supabase.co;",
          },
        ],
      },
    ]
  },
};

export default nextConfig;
