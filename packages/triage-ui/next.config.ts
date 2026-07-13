import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  serverExternalPackages: ["@compliance-evals/core"],
  webpack(config, { isServer }) {
    if (isServer) {
      const existing = config.externals ?? [];
      const asArray = Array.isArray(existing) ? existing : [existing];
      config.externals = [
        ...asArray,
        ({ request }: { request?: string }, callback: (err?: Error | null, result?: string) => void) => {
          if (request === "node:sqlite" || request === "sqlite") {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }
    return config;
  },
};

export default nextConfig;
