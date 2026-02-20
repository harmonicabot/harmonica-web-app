/** @type {import('next').NextConfig} */

const nextConfig = {
  serverExternalPackages: ['braintrust'],
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
