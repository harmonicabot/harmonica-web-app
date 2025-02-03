/** @type {import('next').NextConfig} */

const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH' },
          { key: 'Access-Control-Allow-Headers', value: 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version' },
          { key: 'Access-Control-Allow-Credentials', value: "true" },
        ],
      },
    ];
  },
  //prevent react from loading components twice
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: '*.public.blob.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
    ],
  },
  experimental: {
    // This is supposed to prevent route handler caching
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '2mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Exclude onnxruntime-node from webpack bundling
    config.externals = [...(config.externals || []), 'onnxruntime-node']
    return config
  },
};

module.exports = nextConfig;
