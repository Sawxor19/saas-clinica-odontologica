import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {},
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      "@swc/helpers$": path.resolve(
        process.cwd(),
        "src/lib/swc-helpers-alias.mjs"
      ),
    };
    return config;
  },
};

export default nextConfig;
