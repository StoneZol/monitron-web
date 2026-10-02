import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  transpilePackages: ["liberty-core", "crypto-js"],
};

export default nextConfig;
