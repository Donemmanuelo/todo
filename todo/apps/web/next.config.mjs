import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure we do a server build, not a static export, to support NextAuth and server features
  output: 'standalone',
  // Avoid generating a static 404 page (prevents invoking legacy Pages runtime for /404)
  static404: false,
  // Experimental: Force App Router only to avoid Pages runtime
  experimental: {
    appDir: true,
    // Disable Pages Router completely
    disableOptimizedLoading: false,
    serverComponentsExternalPackages: ['@prisma/client', 'bcrypt'],
  },
  // Skip type checking and linting during build (temporary workaround)
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  webpack: (config, { isServer }) => {
    // Ensure "@" alias points to the app's src directory (resolve relative to this config file)
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    
    // Ignore Pages Router completely
    if (!isServer) {
      config.resolve.alias = {
        ...config.resolve.alias,
        'next/dist/compiled/next-server/pages.runtime.prod.js': false,
      };
    }
    
    return config;
  },
};

export default nextConfig;
