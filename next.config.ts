import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // A venture logo can be up to 2 MB; the form around it needs a little more.
    serverActions: { bodySizeLimit: "3mb" },
  },
};

export default nextConfig;
