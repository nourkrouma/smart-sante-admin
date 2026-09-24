import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keep Admin SDK external on Vercel; jose@4 (overrides) keeps jwks-rsa CJS-compatible.
  serverExternalPackages: ["firebase-admin"],
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
