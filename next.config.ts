import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "4oey1j8tyx.ufs.sh",
      },
      {
        protocol: "https",
        hostname: "foorweb-backend.sfo3.digitaloceanspaces.com",
      },
    ],
  },
};

export default nextConfig;
