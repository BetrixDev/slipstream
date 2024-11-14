import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    ppr: "incremental",
  },
  webpack: (config) => {
    config.externals = [...config.externals, "trigger"];

    return config;
  },
};

export default nextConfig;
