import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  // Prevent the dev server file watcher from triggering recompiles when
  // non-source files change (database, logs, Prisma cache, etc.).
  // This stops the "auto-refresh on all devices when one user updates data"
  // issue that occurs in dev mode.
  watchOptions: {
    ignored: [
      "**/db/**",
      "**/*.db",
      "**/*.db-journal",
      "**/*.log",
      "**/dev.log",
      "**/server.log",
      "**/prisma/migrations/**",
      "**/.next/cache/**",
      "**/node_modules/.cache/**",
      "**/upload/**",
      "**/worklog.md",
    ],
  },
};

export default nextConfig;
