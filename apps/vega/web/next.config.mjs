/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Biome handles linting in CI; skip Next's ESLint during build.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
