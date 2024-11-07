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
  env: {
    POSTGRES_URL: process.env.POSTGRES_URL,
    NEON_DATABASE_URL: process.env.NEON_DATABASE_URL,
    POSTGRESS_DATABASE: process.env.POSTGRESS_DATABASE,
    POSTGRESS_HOST: process.env.POSTGRESS_HOST,
    POSTGRESS_USER: process.env.POSTGRESS_USER,
  },
};

module.exports = nextConfig;
