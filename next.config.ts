import type { NextConfig } from "next";


const nextConfig: NextConfig = {
  /* config options here */
  async rewrites() {
    return [
      {
        source: '/voice/:path*',
        destination: '/storage/voice/:path*',
      },
      {
        source: '/video/:path*',
        destination: '/storage/video/:path*',
      },
    ];
  },
};

export default nextConfig;
