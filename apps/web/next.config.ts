import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Transpila pacotes internos do monorepo
  transpilePackages: ["@uvergs360/api", "@uvergs360/db", "@uvergs360/shared"],

  // Segurança: headers HTTP
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      // Health check sem cache
      {
        source: "/api/health",
        headers: [
          { key: "Cache-Control", value: "no-store, max-age=0" },
        ],
      },
    ];
  },

  // Logging de erros em produção (sem expor stack traces)
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },
};

export default nextConfig;
