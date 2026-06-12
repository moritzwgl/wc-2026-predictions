/** @type {import('next').NextConfig} */
const nextConfig = {
  basePath: "/wc-2026-predictions",
  output: "export",  // <=== enables static exports
  reactStrictMode: true,
};

module.exports = nextConfig;

export default nextConfig;
