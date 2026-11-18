import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Every page in this app shows live, per-couple data behind a login, so we
  // render on each request and skip the Cache Components prerendering model.
  cacheComponents: false,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
