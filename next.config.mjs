/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Needed for @crayonai packages
  transpilePackages: ["@crayonai/react-core", "@crayonai/stream"],
};

export default nextConfig;
