import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "firebase-admin",
    "firebase-admin/app",
    "firebase-admin/auth",
    "firebase-admin/firestore",
    "firebase-admin/messaging",
    "@google-cloud/firestore",
    "google-gax",
    "google-auth-library",
  ],
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
