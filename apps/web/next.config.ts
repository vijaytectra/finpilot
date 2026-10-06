import path from "node:path";

import type { NextConfig } from "next";

const apiInternalUrl = process.env.API_INTERNAL_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  output: "standalone",
  // Pin tracing to this app so the standalone bundle is laid out as .next/standalone/server.js
  // regardless of lockfiles in parent directories.
  outputFileTracingRoot: path.join(__dirname),
  poweredByHeader: false,
  reactStrictMode: true,
  async rewrites() {
    // The browser only ever calls same-origin /api/v1/...; Next proxies to the API so the
    // HttpOnly session cookie is first-party and no CORS configuration is needed.
    return [{ source: "/api/:path*", destination: `${apiInternalUrl}/api/:path*` }];
  },
};

export default nextConfig;
