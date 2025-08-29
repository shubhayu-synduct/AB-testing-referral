/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  skipTrailingSlashRedirect: true,
  skipMiddlewareUrlNormalize: true,
  // Ignore build errors for specific pages
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  // Remove ALL console statements in production builds
  webpack: (config, { dev, isServer }) => {
    if (!dev && !isServer) {
      // Remove ALL console statements in production client builds
      config.optimization.minimizer.forEach((minimizer) => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            compress: {
              ...minimizer.options.terserOptions.compress,
              drop_console: true, // Remove ALL console statements
              drop_debugger: true, // Also remove debugger statements
            },
          };
        }
      });
    }
    return config;
  },
}

export default nextConfig
