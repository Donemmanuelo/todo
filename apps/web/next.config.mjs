import path from 'path';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // Ensure "@" alias points to the app's src directory
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = path.resolve(process.cwd(), 'src');
    // Explicit alias for the auth module to avoid path resolution issues
    config.resolve.alias['@/auth'] = path.resolve(process.cwd(), 'src/auth.ts');
    return config;
  },
};

export default nextConfig;
