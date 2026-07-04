import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@compliance-evals/types",
    "@compliance-evals/core",
    "@compliance-evals/ui",
  ],
};

export default nextConfig;
