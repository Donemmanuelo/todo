import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Ensure we do a server build, not a static export, to support NextAuth and server features
  output: 'standalone',
  webpack: (config) => {
    // Ensure "@" alias points to the app's src directory (resolve relative to this config file)
    config.resolve = config.resolve || {};
    config.resolve.alias = config.resolve.alias || {};
    config.resolve.alias['@'] = path.resolve(__dirname, 'src');
    // Rely on extension resolution; a specific '@/auth' alias is unnecessary when '@' points to src
    return config;
  },
};

export default nextConfig;
