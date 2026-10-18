/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  transpilePackages: ['@twentyfish/engine', '@twentyfish/core', '@twentyfish/ui']
};
module.exports = nextConfig;
