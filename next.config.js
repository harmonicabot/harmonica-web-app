/** @type {import('next').NextConfig} */

// For preview deploys, derive AUTH0_BASE_URL from the stable branch URL
// so Auth0 callbacks work without per-branch env var configuration
const auth0BaseUrl =
  process.env.AUTH0_BASE_URL ||
  (process.env.VERCEL_BRANCH_URL
    ? `https://${process.env.VERCEL_BRANCH_URL}`
    : undefined);

const nextConfig = {
  // Inline AUTH0_BASE_URL at build time so it's available in all runtimes
  // (edge middleware + serverless functions)
  ...(auth0BaseUrl ? { env: { AUTH0_BASE_URL: auth0BaseUrl } } : {}),
  async redirects() {
    return [
      {
        source: '/profile',
        destination: '/settings',
        permanent: true,
      },
    ];
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET,POST,PUT,DELETE,OPTIONS,PATCH',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value:
              'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version',
          },
          { key: 'Access-Control-Allow-Credentials', value: 'true' },
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
    serverComponentsExternalPackages: ['braintrust'],
    // This is supposed to prevent route handler caching
    serverActions: {
      allowedOrigins: ['localhost:3000'],
      bodySizeLimit: '10mb',
    },
  },
  webpack: (config, { isServer }) => {
    // Prevent bundling of native node modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'onnxruntime-node': false,
    };
    config.ignoreWarnings = [
      { module: /node_modules\/onnxruntime-node/ },
      { module: /node_modules\/@huggingface\/transformers/ },
      { message: /Critical dependency: Accessing import\.meta directly is unsupported/ }
    ];

    // Add a rule to handle .node files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
      type: 'javascript/auto',
    });

    return config;
  },
};

module.exports = nextConfig;
