import type { NextConfig } from "next";

import { env } from "./src/config/env";
import { getServerEnv } from "./src/config/server-env";

const { apiProxyTarget } = getServerEnv();

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  // El navegador solo habla con Next.js; las llamadas a la API se reenvían al backend.
  // Así la cookie de sesión es de primera parte y no hace falta CORS en el uso normal.
  async rewrites() {
    return [
      {
        source: `${env.apiBasePath}/:path*`,
        destination: `${apiProxyTarget}${env.apiBasePath}/:path*`,
      },
    ];
  },
};

export default nextConfig;
